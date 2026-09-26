using BuildingBlocks.Contracts;
using HR.Application.Commission;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace UnitTests.Domain.HR.Commission;

/// <summary>Repair giả: trả đúng những phiếu test đặt vào, như cài đặt thật đọc từ RepairDbContext.</summary>
internal sealed class FakeRepairCommissionSourceQuery : IRepairCommissionSourceQuery
{
    public Dictionary<Guid, RepairCommissionSource> WorkOrders { get; } = new();

    public Task<RepairCommissionSource?> GetAsync(Guid workOrderId, CancellationToken cancellationToken = default)
        => Task.FromResult(WorkOrders.GetValueOrDefault(workOrderId));

    public Task<IReadOnlyList<RepairCommissionSource>> ListPaidBetweenAsync(DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default)
        => Task.FromResult<IReadOnlyList<RepairCommissionSource>>(WorkOrders.Values
            .Where(w => w.PaidAtUtc >= fromUtc && w.PaidAtUtc < toUtc).ToList());

    public RepairCommissionSource Put(RepairCommissionSource source)
    {
        WorkOrders[source.WorkOrderId] = source;
        return source;
    }
}

internal static class CommissionTestData
{
    public static readonly DateTime PaidSep15 = new(2026, 9, 15, 3, 0, 0, DateTimeKind.Utc);

    public static HRDbContext NewDb() => new(new DbContextOptionsBuilder<HRDbContext>()
        .UseInMemoryDatabase("hr-commission-" + Guid.NewGuid()).Options);

    public static Employee Technician(HRDbContext db, Guid userId)
    {
        var employee = new Employee("Trần Kỹ Thuật", $"kt-{Guid.NewGuid():N}@qh.vn", "0900000000", "Kỹ thuật", "KTV",
            new DateTime(2024, 1, 1), 10_000_000m);
        employee.LinkUser(userId.ToString());
        db.Employees.Add(employee);
        db.SaveChanges();
        return employee;
    }

    public static RepairCommissionSource Paid(Guid techUserId, decimal labor = 500_000m, decimal serviceFee = 0m,
        DateTime? paidAt = null) => new(
        Guid.NewGuid(), "TKT-" + Guid.NewGuid().ToString("N")[..6], Guid.NewGuid(), techUserId, "Trần Kỹ Thuật",
        labor, serviceFee, paidAt ?? PaidSep15, IsSettled: true, IsVoidedAfterPayment: false);

    public static RepairCommissionSource Voided(RepairCommissionSource paid)
        => paid with { IsSettled = false, IsVoidedAfterPayment = true };

    /// <summary>Mặc định 10% (IAppSettings rỗng -> dùng mức riêng do test đặt, hoặc 0).</summary>
    public static CommissionAccrualService Service(HRDbContext db, FakeRepairCommissionSourceQuery repair)
        => new(db, repair, new CommissionDefaults());

    public static void Policy(HRDbContext db, Guid employeeId, decimal percent, decimal fixedAmount = 0m, DateOnly? from = null)
    {
        db.CommissionPolicies.Add(new CommissionPolicy(employeeId, percent, fixedAmount, from ?? new DateOnly(2026, 1, 1)));
        db.SaveChanges();
    }
}
