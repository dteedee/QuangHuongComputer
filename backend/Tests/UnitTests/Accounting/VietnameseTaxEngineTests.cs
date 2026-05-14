using Accounting.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Accounting;

public class VietnameseTaxEngineTests
{
    [Fact]
    public void CalculateMonthlyPit_BelowDeduction_ReturnsZeroTax()
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(10_000_000m);
        result.PitAmount.Should().Be(0);
        result.TaxableIncome.Should().Be(0);
    }

    [Fact]
    public void CalculateMonthlyPit_FirstBracket_Returns5Percent()
    {
        // Gross 20M, no dependents, no insurance
        // Pre-tax = 20M, Taxable = 20M - 11M = 9M
        // First 5M at 5% = 250K, next 4M at 10% = 400K → total 650K
        var result = VietnameseTaxEngine.CalculateMonthlyPit(20_000_000m);
        result.TaxableIncome.Should().Be(9_000_000m);
        result.PitAmount.Should().Be(650_000m);
    }

    [Fact]
    public void CalculateMonthlyPit_WithDependents_ReducesTaxableIncome()
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(20_000_000m, numberOfDependents: 1);
        // Taxable = 20M - 11M - 4.4M = 4.6M → all in first bracket (5%) = 230K
        result.TaxableIncome.Should().Be(4_600_000m);
        result.PitAmount.Should().Be(230_000m);
    }

    [Fact]
    public void CalculateVat_StandardRate_Returns8Percent()
    {
        var result = VietnameseTaxEngine.CalculateVat(10_000_000m, 0.08m);
        result.VatAmount.Should().Be(800_000m);
        result.PriceAfterVat.Should().Be(10_800_000m);
        result.IsExempt.Should().BeFalse();
    }

    [Fact]
    public void CalculateVat_TelecomRate_Returns10Percent()
    {
        var result = VietnameseTaxEngine.CalculateVat(10_000_000m, 0.10m);
        result.VatAmount.Should().Be(1_000_000m);
    }

    [Fact]
    public void CalculateVat_ExemptRate_ReturnsZero()
    {
        var result = VietnameseTaxEngine.CalculateVat(10_000_000m, VietnameseTaxEngine.VatExempt);
        result.VatAmount.Should().Be(0);
        result.IsExempt.Should().BeTrue();
    }

    [Fact]
    public void ExtractVat_FromInclusivePrice_ReturnsCorrectBreakdown()
    {
        var result = VietnameseTaxEngine.ExtractVat(10_800_000m, 0.08m);
        result.PriceBeforeVat.Should().Be(10_000_000m);
        result.VatAmount.Should().Be(800_000m);
    }

    [Fact]
    public void CalculateInsurance_ReturnsCorrectEmployeeRates()
    {
        var result = VietnameseTaxEngine.CalculateInsurance(20_000_000m);
        result.Employee.SocialInsurance.Should().Be(1_600_000m); // 8%
        result.Employee.HealthInsurance.Should().Be(300_000m);    // 1.5%
        result.Employee.UnemploymentInsurance.Should().Be(200_000m); // 1%
    }

    [Fact]
    public void CalculatePayroll_FullPipeline_ReturnsConsistentResult()
    {
        var result = VietnameseTaxEngine.CalculatePayroll(25_000_000m, numberOfDependents: 1);
        result.GrossSalary.Should().Be(25_000_000m);
        result.NetSalary.Should().BeLessThan(result.GrossSalary);
        result.TotalCompanyCost.Should().BeGreaterThan(result.GrossSalary);
        result.EmployeeDeductions.Should().Be(result.Insurance.Employee.Total + result.Pit.PitAmount);
    }

    [Fact]
    public void CalculateCit_StandardRate_Returns20Percent()
    {
        var result = VietnameseTaxEngine.CalculateCit(100_000_000m, 60_000_000m);
        result.TaxableIncome.Should().Be(40_000_000m);
        result.CitAmount.Should().Be(8_000_000m);
    }
}
