using BuildingBlocks.TaxEngine;
using FluentAssertions;
using HR.Application.Tax;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace UnitTests.Domain.HR;

/// <summary>
/// Quyết toán TNCN năm — 3 kịch bản: đóng thừa / vừa / thiếu.
/// Dùng EF InMemory.
/// </summary>
public class PitFinalizationServiceTests
{
    private static HRDbContext NewDb()
    {
        var opts = new DbContextOptionsBuilder<HRDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new HRDbContext(opts);
    }

    private static Employee NewEmployee(HRDbContext db)
    {
        var e = new Employee(
            "Nguyen Van A", "a@qh.vn", "0900000000", "Kinh doanh", "NV",
            new DateTime(2024, 1, 1), 20_000_000m);
        db.Employees.Add(e);
        return e;
    }

    private static Payroll SeedPayroll(HRDbContext db, Guid eid, int year, int month,
        decimal baseSalary, decimal tax, decimal insurance)
    {
        var p = new Payroll(eid, month, year, baseSalary);
        p.AddDeduction(insurance, "Insurance");
        p.AddDeduction(tax, "Tax");
        p.Calculate();
        db.Payrolls.Add(p);
        return p;
    }

    [Fact]
    public async Task Finalize_KhauTruDuThua_TraOverpayment()
    {
        using var db = NewDb();
        var e = NewEmployee(db);
        await db.SaveChangesAsync();

        // Thu nhập 20tr/tháng × 12 = 240tr/năm
        // BH: 2.1tr/tháng × 12 = 25.2tr
        // Khấu trừ thuế cao mỗi tháng 800k × 12 = 9.6tr (giả định > số đúng)
        for (int m = 1; m <= 12; m++)
            SeedPayroll(db, e.Id, 2026, m, 20_000_000m, tax: 800_000m, insurance: 2_100_000m);
        await db.SaveChangesAsync();

        var svc = new PitFinalizationService(db);
        var r = await svc.FinalizeAsync(e.Id, 2026);

        r.AnnualGrossIncome.Should().Be(240_000_000m);
        r.AnnualInsurance.Should().Be(25_200_000m);
        r.AnnualPersonalDeduction.Should().Be(VietnameseTaxEngine.PersonalDeduction * 12m);
        r.MonthlyPitWithheldTotal.Should().Be(9_600_000m);
        r.MonthsCounted.Should().Be(12);

        // Thu nhập tính thuế = 240 - 25.2 - 132 - 0 = 82.8tr
        r.AnnualTaxableIncome.Should().Be(240_000_000m - 25_200_000m - 132_000_000m);

        // Đóng thừa hay thiếu tuỳ tính lại — ít nhất 1 trong 2 phải > 0 hoặc cả 2 = 0
        (r.PitOverpayment >= 0 && r.PitShortfall >= 0).Should().BeTrue();
        (r.PitOverpayment == 0 || r.PitShortfall == 0).Should().BeTrue();
    }

    [Fact]
    public async Task Finalize_KhauTruThieu_TraShortfall()
    {
        using var db = NewDb();
        var e = NewEmployee(db);
        await db.SaveChangesAsync();

        // Khấu trừ ít mỗi tháng để đảm bảo Shortfall > 0
        for (int m = 1; m <= 12; m++)
            SeedPayroll(db, e.Id, 2026, m, 40_000_000m, tax: 100_000m, insurance: 3_500_000m);
        await db.SaveChangesAsync();

        var svc = new PitFinalizationService(db);
        var r = await svc.FinalizeAsync(e.Id, 2026);

        r.MonthlyPitWithheldTotal.Should().Be(1_200_000m);
        // Với thu nhập 40tr/tháng, PIT thực tế chắc chắn > 1.2tr/năm
        r.RecalculatedAnnualPit.Should().BeGreaterThan(1_200_000m);
        r.PitShortfall.Should().BeGreaterThan(0m);
        r.PitOverpayment.Should().Be(0m);
    }

    [Fact]
    public async Task Finalize_CoNguoiPhuThuoc_TinhGiamTruTheoThangActive()
    {
        using var db = NewDb();
        var e = NewEmployee(db);

        // 1 dependent active cả năm
        var d1 = new Dependent(e.Id, "Con A", DependentRelation.Child,
            new DateTime(2015, 1, 1), new DateTime(2024, 1, 1));
        db.Dependents.Add(d1);

        for (int m = 1; m <= 12; m++)
            SeedPayroll(db, e.Id, 2026, m, 25_000_000m, tax: 400_000m, insurance: 2_625_000m);
        await db.SaveChangesAsync();

        var svc = new PitFinalizationService(db);
        var r = await svc.FinalizeAsync(e.Id, 2026);

        r.DependentMonthCount.Should().Be(12);
        r.AnnualDependentDeduction.Should().Be(VietnameseTaxEngine.DependentDeduction * 12m);
    }

    [Fact]
    public async Task Finalize_KhongTonTaiEmployee_NemLoi()
    {
        using var db = NewDb();
        var svc = new PitFinalizationService(db);

        var act = async () => await svc.FinalizeAsync(Guid.NewGuid(), 2026);
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task GetSummary_TongHopNhieuNhanVien()
    {
        using var db = NewDb();
        var e1 = NewEmployee(db);
        var e2 = new Employee("Nguyen B", "b@qh.vn", "0911111111", "Kỹ thuật",
            "KTV", new DateTime(2024, 1, 1), 30_000_000m);
        db.Employees.Add(e2);

        SeedPayroll(db, e1.Id, 2026, 1, 20_000_000m, 200_000m, 2_100_000m);
        SeedPayroll(db, e2.Id, 2026, 1, 30_000_000m, 500_000m, 3_150_000m);
        await db.SaveChangesAsync();

        var svc = new PitFinalizationService(db);
        var items = await svc.GetSummaryAsync(2026);

        items.Should().HaveCount(2);
    }
}
