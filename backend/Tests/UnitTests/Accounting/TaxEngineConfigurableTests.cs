using BuildingBlocks.TaxEngine;
using FluentAssertions;
using Xunit;

namespace UnitTests.Accounting;

/// <summary>
/// Kiểm tra tax engine đọc config động và tính toán đúng với giá trị cấu hình tùy chỉnh.
/// </summary>
public class TaxEngineConfigurableTests
{
    [Fact]
    public void CalculateMonthlyPit_WithCustomPersonalDeduction_ReducesTaxableIncome()
    {
        // Với giảm trừ bản thân = 12M (cao hơn mặc định 11M)
        var result = VietnameseTaxEngine.CalculateMonthlyPit(
            grossSalary: 20_000_000m,
            personalDeduction: 12_000_000m
        );

        // Taxable = 20M - 12M = 8M (thấp hơn trường hợp mặc định)
        result.TaxableIncome.Should().Be(8_000_000m);
        // First 5M at 5% = 250K, next 3M at 10% = 300K → total 550K
        result.PitAmount.Should().Be(550_000m);
    }

    [Fact]
    public void CalculateMonthlyPit_WithCustomDependentDeduction_ReducesTaxableIncome()
    {
        // Với giảm trừ người phụ thuộc = 5M (cao hơn mặc định 4.4M)
        var result = VietnameseTaxEngine.CalculateMonthlyPit(
            grossSalary: 20_000_000m,
            numberOfDependents: 2,
            dependentDeduction: 5_000_000m
        );

        // Taxable = 20M - 11M(bản thân) - 10M(2x5M) = -1M → 0
        result.TaxableIncome.Should().Be(0);
        result.PitAmount.Should().Be(0);
    }

    [Fact]
    public void CalculateMonthlyPit_ConfigChange_ImpactsResult()
    {
        // Tính với deduction mặc định
        var resultDefault = VietnameseTaxEngine.CalculateMonthlyPit(
            grossSalary: 25_000_000m,
            numberOfDependents: 1
        );

        // Tính với deduction tăng (giả sử luật mới)
        var resultHigherDeduction = VietnameseTaxEngine.CalculateMonthlyPit(
            grossSalary: 25_000_000m,
            numberOfDependents: 1,
            personalDeduction: 12_000_000m,
            dependentDeduction: 5_000_000m
        );

        // Khi deduction cao hơn → tax thấp hơn
        resultHigherDeduction.PitAmount.Should().BeLessThan(resultDefault.PitAmount);
    }

    [Fact]
    public void CalculateMonthlyPit_NoCustomDeduction_UsesFallbackDefaults()
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(20_000_000m);

        // Phải dùng fallback từ class const
        result.PersonalDeduction.Should().Be(VietnameseTaxEngine.PersonalDeduction);
        result.DependentDeductions.Should().Be(0);
    }

    [Fact]
    public void CalculateMonthlyPit_ZeroCustomDeduction_CalculatesWithoutDeduction()
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(
            grossSalary: 20_000_000m,
            personalDeduction: 0m
        );

        // Taxable = 20M (không có giảm trừ)
        result.TaxableIncome.Should().Be(20_000_000m);
    }

    [Fact]
    public void CalculatePayroll_WithCustomTaxSettings_ReflectsInNetSalary()
    {
        // Payroll với deduction mặc định
        var payrollDefault = VietnameseTaxEngine.CalculatePayroll(
            grossSalary: 30_000_000m,
            numberOfDependents: 0
        );

        // Payroll với deduction cao hơn
        var payrollHigherDeduction = VietnameseTaxEngine.CalculatePayroll(
            grossSalary: 30_000_000m,
            numberOfDependents: 0,
            personalDeduction: 12_000_000m
        );

        // Với deduction cao hơn → net salary cao hơn (tax thấp hơn)
        payrollHigherDeduction.NetSalary.Should().BeGreaterThan(payrollDefault.NetSalary);
    }

    [Fact]
    public void CalculateMonthlyPit_HighIncomeHighDeduction_StaysProgressive()
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(
            grossSalary: 100_000_000m,
            personalDeduction: 15_000_000m,
            numberOfDependents: 3,
            dependentDeduction: 5_000_000m
        );

        // Taxable = 100M - 15M - 15M = 70M (phải đi qua nhiều bracket)
        result.TaxableIncome.Should().Be(70_000_000m);
        // Phải có tax brackets breakdown
        result.Brackets.Should().NotBeEmpty();
        // Effective rate phải dương
        result.EffectiveTaxRate.Should().BeGreaterThan(0);
    }

    [Fact]
    public void TaxCalculation_ConfigChangeDetectable()
    {
        // Scenario: Law change in 2025 increases personal deduction
        var before2025 = VietnameseTaxEngine.CalculateMonthlyPit(
            grossSalary: 50_000_000m,
            personalDeduction: 11_000_000m
        );

        var after2025 = VietnameseTaxEngine.CalculateMonthlyPit(
            grossSalary: 50_000_000m,
            personalDeduction: 13_500_000m
        );

        before2025.PitAmount.Should().BeGreaterThan(after2025.PitAmount);
        (before2025.PitAmount - after2025.PitAmount).Should().BeGreaterThan(0);
    }
}
