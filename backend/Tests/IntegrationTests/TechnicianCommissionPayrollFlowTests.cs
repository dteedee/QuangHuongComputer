using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BuildingBlocks.Security;
using FluentAssertions;
using HR.Domain;
using HR.Infrastructure;
using IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Repair.Domain;
using Repair.Infrastructure;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Hoa hồng kỹ thuật đi hết đường ống thật: phiếu sửa thu tiền (Repair) -> khoản hoa hồng (HR,
/// qua contract đọc) -> duyệt -> dòng thu nhập chịu thuế trên bảng lương -> chi trả -> Paid.
/// Linh kiện KHÔNG được tính vào căn cứ.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class TechnicianCommissionPayrollFlowTests
{
    private const decimal Labor = 600_000m;
    private const decimal Parts = 1_000_000m;

    private readonly IntegrationTestFixture _fixture;

    public TechnicianCommissionPayrollFlowTests(IntegrationTestFixture fixture) => _fixture = fixture;

    [Fact(DisplayName = "Hoa hồng: phiếu sửa đã thu tiền -> khoản hoa hồng -> vào bảng lương -> Paid")]
    public async Task PhieuSuaDaThuTien_VaoBangLuong()
    {
        var creator = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Admin);
        var approver = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Admin);
        var techAccount = await TestAuthentication.CreateAccountAsync(_fixture, Roles.TechnicianInShop);
        using var client = TestAuthentication.ClientFor(_fixture, creator);
        using var approverClient = TestAuthentication.ClientFor(_fixture, approver);

        var nowVn = DateTime.UtcNow.AddHours(7);
        var period = $"{nowVn:yyyy-MM}";
        var employeeId = await SeedEmployeeAsync(techAccount.UserId, nowVn.Year, nowVn.Month);
        var workOrderId = await SeedWorkOrderReadyForPickupAsync(Guid.Parse(techAccount.UserId));

        var pay = await client.PutAsJsonAsync($"/api/repair/admin/work-orders/{workOrderId}/pay", new { paymentReference = "POS-IT" });
        pay.StatusCode.Should().Be(HttpStatusCode.OK, await pay.Content.ReadAsStringAsync());

        // Đối soát kỳ (lưới an toàn); sự kiện cũng có thể đã ghi nhận trước — kết quả phải như nhau.
        var sync = await client.PostAsJsonAsync("/api/hr/commissions/sync", new { period });
        sync.StatusCode.Should().Be(HttpStatusCode.OK, await sync.Content.ReadAsStringAsync());
        await client.PostAsJsonAsync("/api/hr/commissions/sync", new { period });

        var entry = await SingleEntryAsync(workOrderId);
        entry.EmployeeId.Should().Be(employeeId);
        entry.BaseAmount.Should().Be(Labor, "linh kiện không nằm trong căn cứ hoa hồng");
        entry.Amount.Should().Be(60_000m);
        entry.Status.Should().Be(CommissionStatus.Pending);

        var approve = await client.PostAsJsonAsync("/api/hr/commissions/approve", new { ids = new[] { entry.Id } });
        approve.StatusCode.Should().Be(HttpStatusCode.OK, await approve.Content.ReadAsStringAsync());

        var create = await client.PostAsJsonAsync("/api/hr/payroll/runs", new { year = nowVn.Year, month = nowVn.Month });
        create.StatusCode.Should().Be(HttpStatusCode.Created, await create.Content.ReadAsStringAsync());
        var runId = JsonDocument.Parse(await create.Content.ReadAsStringAsync()).RootElement.GetProperty("id").GetGuid();
        var calc = await client.PostAsync($"/api/hr/payroll/runs/{runId}/calculate", null);
        calc.StatusCode.Should().Be(HttpStatusCode.OK, await calc.Content.ReadAsStringAsync());

        using (var scope = _fixture.CreateScope())
        {
            var hr = scope.ServiceProvider.GetRequiredService<HRDbContext>();
            var payroll = await hr.Payrolls.AsNoTracking().Include(p => p.LineItems)
                .FirstAsync(p => p.EmployeeId == employeeId && p.PayrollRunId == runId);
            payroll.LineItems.Should().ContainSingle(l => l.Description.StartsWith("Hoa hồng kỹ thuật")
                                                          && l.Amount == 60_000m && l.IsTaxable && !l.IsInsurable);
            (await SingleEntryAsync(workOrderId)).PayrollId.Should().Be(payroll.Id);
        }

        var approveRun = await approverClient.PostAsync($"/api/hr/payroll/runs/{runId}/approve", null);
        approveRun.StatusCode.Should().Be(HttpStatusCode.OK, await approveRun.Content.ReadAsStringAsync());
        var markPaid = await client.PostAsync($"/api/hr/payroll/runs/{runId}/mark-paid", null);
        markPaid.StatusCode.Should().Be(HttpStatusCode.OK, await markPaid.Content.ReadAsStringAsync());

        var paid = await SingleEntryAsync(workOrderId);
        paid.Status.Should().Be(CommissionStatus.Paid);
        paid.PaidAt.Should().NotBeNull();
    }

    private async Task<CommissionEntry> SingleEntryAsync(Guid workOrderId)
    {
        using var scope = _fixture.CreateScope();
        var hr = scope.ServiceProvider.GetRequiredService<HRDbContext>();
        var entries = await hr.CommissionEntries.AsNoTracking().Where(e => e.SourceId == workOrderId).ToListAsync();
        entries.Should().ContainSingle("một phiếu sửa chỉ sinh đúng một khoản hoa hồng dù đối soát nhiều lần");
        return entries[0];
    }

    private async Task<Guid> SeedEmployeeAsync(string userId, int year, int month)
    {
        using var scope = _fixture.CreateScope();
        var hr = scope.ServiceProvider.GetRequiredService<HRDbContext>();
        var employee = new Employee("Kỹ thuật viên kiểm thử", $"kt-{Guid.NewGuid():N}@test.local", "0900000000",
            "Kỹ thuật", "KTV", new DateTime(2024, 1, 1), 12_000_000m);
        employee.LinkUser(userId);
        hr.Employees.Add(employee);
        hr.SalaryStructures.Add(new SalaryStructure(employee.Id, 12_000_000m, 12_000_000m, new DateTime(2024, 1, 1)));
        hr.CommissionPolicies.Add(new CommissionPolicy(employee.Id, 10m, 0m, new DateOnly(2024, 1, 1)));

        var ts = new MonthlyTimesheet(employee.Id, year, month);
        ts.SetAttendanceAggregation(22m, 22m, 0, 0, 0, 0);
        ts.SetOvertimeBreakdown(0, 0, 0, 0);
        ts.SetLeaveDays(0, 0);
        ts.Lock(Guid.NewGuid());
        hr.MonthlyTimesheets.Add(ts);
        await hr.SaveChangesAsync();
        return employee.Id;
    }

    private async Task<Guid> SeedWorkOrderReadyForPickupAsync(Guid technicianUserId)
    {
        using var scope = _fixture.CreateScope();
        var repair = scope.ServiceProvider.GetRequiredService<RepairDbContext>();
        var technician = new Technician("KTV kiểm thử", "Laptop", 100_000m);
        technician.LinkUser(technicianUserId);
        repair.Technicians.Add(technician);

        var workOrder = new WorkOrder(Guid.NewGuid(), "ThinkPad T14", "SN-IT", "Không lên nguồn");
        workOrder.AssignTechnician(technician.Id);
        workOrder.StartRepair();
        workOrder.CompleteRepair(partsCost: Parts, laborCost: Labor);
        workOrder.MarkReadyForPickup();
        repair.WorkOrders.Add(workOrder);
        await repair.SaveChangesAsync();
        return workOrder.Id;
    }
}
