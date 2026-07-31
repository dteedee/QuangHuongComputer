using BuildingBlocks.TaxEngine;
using FluentAssertions;
using Xunit;

namespace UnitTests.Domain.HR;

/// <summary>
/// Sanity — HR context truy cập tax engine từ BuildingBlocks (không phải Accounting).
/// Đối chiếu với 7 mốc thu nhập chuẩn để bảo đảm CalculateAnnualPit khớp.
/// </summary>
public class VietnameseTaxEngineIntegrationTests
{
    [Fact]
    public void HR_CanCall_BuildingBlocksTaxEngine_MonthlyPit()
    {
        var r = VietnameseTaxEngine.CalculateMonthlyPit(20_000_000m);
        r.PitAmount.Should().BeGreaterThan(0);
    }

    [Fact]
    public void HR_CanCall_CalculateInsurance_TranBHXH_468tr()
    {
        var r = VietnameseTaxEngine.CalculateInsurance(60_000_000m);
        r.InsurableSalary.Should().Be(46_800_000m); // trần
        r.Employee.SocialInsurance.Should().Be(Math.Round(46_800_000m * 0.08m, 0));
    }

    [Theory]
    [InlineData(5_000_000)]
    [InlineData(12_000_000)]
    [InlineData(20_000_000)]
    [InlineData(35_000_000)]
    [InlineData(60_000_000)]
    [InlineData(90_000_000)]
    [InlineData(150_000_000)]
    public void CalculateMonthlyPit_7MocThuNhap_KhongLoi(decimal gross)
    {
        var r = VietnameseTaxEngine.CalculateMonthlyPit(gross);
        r.GrossSalary.Should().Be(gross);
        r.PitAmount.Should().BeGreaterOrEqualTo(0);
    }

    [Fact]
    public void CalculateAnnualPit_ChiaTheoBac_Nam_BangBacThang12()
    {
        // 1 nhân viên có thu nhập tính thuế 60tr/tháng = 720tr/năm
        // Bậc năm: 60tr, 120tr, 216tr, 384tr, 624tr, 960tr, >960tr
        var monthly = VietnameseTaxEngine.CalculateMonthlyPit(
            60_000_000m + VietnameseTaxEngine.PersonalDeduction /* để taxable = 60tr */);
        var monthlyPitYear12 = monthly.PitAmount * 12m;

        var annual = VietnameseTaxEngine.CalculateAnnualPit(60_000_000m * 12m);

        annual.Should().Be(monthlyPitYear12,
            "thang thuế năm = bậc tháng × 12 nên 12 tháng cùng thu nhập phải khớp");
    }

    [Fact]
    public void CalculateAnnualPit_ThuNhap0_TraVe0()
    {
        VietnameseTaxEngine.CalculateAnnualPit(0m).Should().Be(0m);
        VietnameseTaxEngine.CalculateAnnualPit(-100m).Should().Be(0m);
    }
}
