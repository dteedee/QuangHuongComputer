using FluentAssertions;
using HR.Application.Commission;
using HR.Application.Payroll;
using HR.Domain;
using Microsoft.EntityFrameworkCore;
using Xunit;
using static UnitTests.Domain.HR.Commission.CommissionTestData;
using PayrollEntity = HR.Domain.Payroll;

namespace UnitTests.Domain.HR.Commission;

/// <summary>Hoa hồng đi vào bảng lương: chọn kỳ, bù trừ, tính lại, chi trả, và dòng thu nhập chịu thuế.</summary>
public class CommissionPayrollLinkerTests
{
    private static CommissionEntry Entry(Guid employeeId, decimal amount, string period, bool approve = true,
        string sourceType = CommissionSourceTypes.RepairWorkOrder)
    {
        var e = new CommissionEntry(employeeId, sourceType, Guid.NewGuid(), "TKT", Math.Abs(amount) * 10, 10m, 0m,
            amount, period, PaidSep15);
        if (approve) e.Approve("hr", DateTime.UtcNow);
        return e;
    }

    [Fact]
    public async Task Bang_luong_lay_khoan_da_duyet_ky_nay_va_ky_truoc_bo_khoan_cho_duyet_va_ky_sau()
    {
        using var db = NewDb();
        var emp = Guid.NewGuid();
        db.CommissionEntries.AddRange(
            Entry(emp, 50_000m, "2026-09"),
            Entry(emp, 30_000m, "2026-08"),                // duyệt muộn -> trả kỳ này
            Entry(emp, 70_000m, "2026-09", approve: false),   // chưa duyệt
            Entry(emp, 90_000m, "2026-10"),                // kỳ sau
            Entry(Guid.NewGuid(), 40_000m, "2026-09"));    // người khác
        await db.SaveChangesAsync();
        var payroll = new PayrollEntity(emp, 9, 2026, 10_000_000m);

        var share = await CommissionPayrollLinker.AttachAsync(db, payroll);
        await db.SaveChangesAsync();

        share.Should().Be(new CommissionPayrollShare(80_000m, 2));
        (await db.CommissionEntries.CountAsync(e => e.PayrollId == payroll.Id)).Should().Be(2);
    }

    [Fact]
    public async Task Thu_hoi_lon_hon_hoa_hong_moi_thi_khong_gan_gi_de_don_sang_ky_sau()
    {
        using var db = NewDb();
        var emp = Guid.NewGuid();
        db.CommissionEntries.AddRange(
            Entry(emp, 20_000m, "2026-09"),
            Entry(emp, -50_000m, "2026-09", sourceType: CommissionSourceTypes.RepairWorkOrderClawback));
        await db.SaveChangesAsync();

        var share = await CommissionPayrollLinker.AttachAsync(db, new PayrollEntity(emp, 9, 2026, 10_000_000m));

        share.Amount.Should().Be(0m);
        (await db.CommissionEntries.AnyAsync(e => e.PayrollId != null)).Should().BeFalse();
    }

    [Fact]
    public async Task Tinh_lai_go_khoan_da_huy_va_chi_tra_danh_dau_Paid()
    {
        using var db = NewDb();
        var emp = Guid.NewGuid();
        var keep = Entry(emp, 50_000m, "2026-09");
        var dropped = Entry(emp, 30_000m, "2026-09");
        db.CommissionEntries.AddRange(keep, dropped);
        await db.SaveChangesAsync();
        var payroll = new PayrollEntity(emp, 9, 2026, 10_000_000m);
        await CommissionPayrollLinker.AttachAsync(db, payroll);
        await db.SaveChangesAsync();

        dropped.Reverse("nhầm phiếu", DateTime.UtcNow);
        await db.SaveChangesAsync();
        (await CommissionPayrollLinker.CountStaleLinksAsync(db, new[] { payroll.Id })).Should().Be(1,
            "phiếu lương đã tính còn chứa khoản vừa huỷ -> phải tính lại trước khi duyệt");

        var share = await CommissionPayrollLinker.AttachAsync(db, payroll);
        await db.SaveChangesAsync();
        share.Amount.Should().Be(50_000m);
        (await CommissionPayrollLinker.CountStaleLinksAsync(db, new[] { payroll.Id })).Should().Be(0);

        (await CommissionPayrollLinker.MarkPaidAsync(db, new[] { payroll.Id }, DateTime.UtcNow)).Should().Be(1);
        await db.SaveChangesAsync();
        keep.Status.Should().Be(CommissionStatus.Paid);
        dropped.Status.Should().Be(CommissionStatus.Reversed);
    }

    [Fact]
    public void Hoa_hong_la_thu_nhap_chiu_thue_khong_dong_bao_hiem()
    {
        var emp = Guid.NewGuid();
        var ts = new MonthlyTimesheet(emp, 2026, 9);
        ts.SetAttendanceAggregation(22m, 22m, 0, 0, 0, 0);
        ts.SetOvertimeBreakdown(0, 0, 0, 0);
        ts.SetLeaveDays(0, 0);
        ts.Lock(Guid.NewGuid());
        var salary = new SalaryStructure(emp, 20_000_000m, 20_000_000m, new DateTime(2024, 1, 1)); // trên mức giảm trừ 2026
        var none = Array.Empty<Allowance>();

        var without = PayrollCalculationService.ComputeCore(ts, salary, none, 0);
        var with = PayrollCalculationService.ComputeCore(ts, salary, none, 0,
            profile: PayrollEmployeeProfile.Default with { Commission = 3_000_000m, CommissionEntryCount = 4 });

        with.GrossPay.Should().Be(without.GrossPay + 3_000_000m);
        with.TaxableGrossIncome.Should().Be(without.TaxableGrossIncome + 3_000_000m);
        with.InsuranceEmployee.Should().Be(without.InsuranceEmployee, "hoa hồng không vào lương đóng bảo hiểm");
        with.Pit.Should().BeGreaterThan(without.Pit, "hoa hồng làm tăng thu nhập tính thuế TNCN");
        with.Commission.Should().Be(3_000_000m);
        with.Lines.Should().ContainSingle(l => l.Desc.StartsWith("Hoa hồng kỹ thuật")
                                               && l.Amount == 3_000_000m && l.Taxable && !l.Insurable);
    }
}
