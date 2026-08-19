using BuildingBlocks.SharedKernel;

namespace BuildingBlocks.TaxEngine;

/// <summary>
/// Vietnamese Tax Engine — Thuế Việt Nam.
/// Implements PIT (TNCN), VAT (GTGT), CIT (TNDN), and Social Insurance calculations
/// theo pháp luật hiện hành (Thông tư 111/2013/TT-BTC, Luật BHXH 2014, Nghị quyết 43/2022/QH15).
///
/// Các hằng số PersonalDeduction/DependentDeduction dưới đây là FALLBACK mặc định.
/// Caller có thể truyền giá trị đọc từ SystemConfig (category "Tax") qua tham số
/// <c>personalDeduction</c>/<c>dependentDeduction</c> để cấu hình động theo luật hiện hành
/// mà không cần deploy — xem <see cref="ITaxSettingsProvider"/>.
/// </summary>
public static class VietnameseTaxEngine
{
    // ============================================
    // PERSONAL INCOME TAX (PIT / Thuế TNCN)
    // ============================================
    public const decimal PersonalDeduction = 11_000_000m;   // Giảm trừ bản thân
    public const decimal DependentDeduction = 4_400_000m;   // Giảm trừ người phụ thuộc

    /// <summary>Progressive PIT tax brackets (monthly taxable income ranges).</summary>
    private static readonly (decimal UpperLimit, decimal Rate)[] PitBrackets = new[]
    {
        (5_000_000m,   0.05m),
        (10_000_000m,  0.10m),
        (18_000_000m,  0.15m),
        (32_000_000m,  0.20m),
        (52_000_000m,  0.25m),
        (80_000_000m,  0.30m),
        (decimal.MaxValue, 0.35m)
    };

    /// <summary>Calculate monthly PIT (Thuế TNCN) from gross salary.</summary>
    public static PitCalculationResult CalculateMonthlyPit(
        decimal grossSalary,
        int numberOfDependents = 0,
        decimal socialInsurance = 0,
        decimal healthInsurance = 0,
        decimal unemploymentInsurance = 0,
        decimal otherDeductions = 0,
        decimal? personalDeduction = null,
        decimal? dependentDeduction = null)
    {
        var totalInsurance = socialInsurance + healthInsurance + unemploymentInsurance;
        var preTaxIncome = grossSalary - totalInsurance;

        var personalDeductionValue = personalDeduction ?? PersonalDeduction;
        var dependentDeductions = (dependentDeduction ?? DependentDeduction) * numberOfDependents;
        var taxableIncome = preTaxIncome - personalDeductionValue - dependentDeductions - otherDeductions;

        if (taxableIncome <= 0)
        {
            return new PitCalculationResult
            {
                GrossSalary = grossSalary,
                TotalInsurance = totalInsurance,
                PreTaxIncome = preTaxIncome,
                PersonalDeduction = personalDeductionValue,
                DependentDeductions = dependentDeductions,
                OtherDeductions = otherDeductions,
                TaxableIncome = 0,
                PitAmount = 0,
                NetSalary = preTaxIncome,
                EffectiveTaxRate = 0,
                Brackets = new List<PitBracketDetail>()
            };
        }

        var brackets = new List<PitBracketDetail>();
        var totalTax = 0m;
        var remaining = taxableIncome;
        var previousLimit = 0m;

        foreach (var (upperLimit, rate) in PitBrackets)
        {
            if (remaining <= 0) break;

            var bracketWidth = upperLimit == decimal.MaxValue
                ? remaining
                : Math.Min(upperLimit - previousLimit, remaining);

            var bracketTax = bracketWidth * rate;
            totalTax += bracketTax;

            brackets.Add(new PitBracketDetail
            {
                From = previousLimit,
                To = upperLimit == decimal.MaxValue ? taxableIncome : Math.Min(upperLimit, taxableIncome),
                Rate = rate,
                TaxableAmount = bracketWidth,
                TaxAmount = bracketTax
            });

            remaining -= bracketWidth;
            previousLimit = upperLimit;
        }

        return new PitCalculationResult
        {
            GrossSalary = grossSalary,
            TotalInsurance = totalInsurance,
            PreTaxIncome = preTaxIncome,
            PersonalDeduction = personalDeductionValue,
            DependentDeductions = dependentDeductions,
            OtherDeductions = otherDeductions,
            TaxableIncome = taxableIncome,
            PitAmount = Math.Round(totalTax, 0),
            NetSalary = preTaxIncome - Math.Round(totalTax, 0),
            EffectiveTaxRate = preTaxIncome > 0 ? Math.Round(totalTax / preTaxIncome * 100, 2) : 0,
            Brackets = brackets
        };
    }

    /// <summary>
    /// Calculate ANNUAL PIT from annual taxable income (dùng cho quyết toán năm — bậc thuế × 12).
    /// Áp dụng thang thuế × 12 tháng theo Thông tư 111/2013.
    /// </summary>
    public static decimal CalculateAnnualPit(decimal annualTaxableIncome)
    {
        if (annualTaxableIncome <= 0) return 0m;

        var totalTax = 0m;
        var remaining = annualTaxableIncome;
        var previousLimit = 0m;

        foreach (var (upperLimit, rate) in PitBrackets)
        {
            if (remaining <= 0) break;

            var annualUpper = upperLimit == decimal.MaxValue ? decimal.MaxValue : upperLimit * 12m;
            var annualPrev = previousLimit * 12m;
            var bracketWidth = annualUpper == decimal.MaxValue
                ? remaining
                : Math.Min(annualUpper - annualPrev, remaining);

            totalTax += bracketWidth * rate;
            remaining -= bracketWidth;
            previousLimit = upperLimit;
        }

        return Math.Round(totalTax, 0);
    }

    // ============================================
    // SOCIAL INSURANCE (BHXH, BHYT, BHTN)
    // ============================================
    public const decimal SocialInsuranceRate_Employee = 0.08m;
    public const decimal HealthInsuranceRate_Employee = 0.015m;
    public const decimal UnemploymentInsuranceRate_Employee = 0.01m;
    public const decimal TotalInsuranceRate_Employee = 0.105m;

    public const decimal SocialInsuranceRate_Employer = 0.175m;
    public const decimal HealthInsuranceRate_Employer = 0.03m;
    public const decimal UnemploymentInsuranceRate_Employer = 0.01m;
    public const decimal TotalInsuranceRate_Employer = 0.215m;

    public const decimal BaseSalary2025 = 2_340_000m;
    public const decimal MaxInsurableSalary = 46_800_000m;

    public static InsuranceCalculationResult CalculateInsurance(decimal grossSalary, decimal? regionalMinSalary = null)
    {
        var insurable = Math.Min(grossSalary, MaxInsurableSalary);
        var regionalMin = regionalMinSalary ?? 4_960_000m;

        var empBhxh = Math.Round(insurable * SocialInsuranceRate_Employee, 0);
        var empBhyt = Math.Round(insurable * HealthInsuranceRate_Employee, 0);
        var empBhtn = Math.Round(Math.Min(grossSalary, regionalMin * 20) * UnemploymentInsuranceRate_Employee, 0);

        var erBhxh = Math.Round(insurable * SocialInsuranceRate_Employer, 0);
        var erBhyt = Math.Round(insurable * HealthInsuranceRate_Employer, 0);
        var erBhtn = Math.Round(Math.Min(grossSalary, regionalMin * 20) * UnemploymentInsuranceRate_Employer, 0);

        return new InsuranceCalculationResult
        {
            InsurableSalary = insurable,
            Employee = new InsuranceBreakdown
            {
                SocialInsurance = empBhxh,
                HealthInsurance = empBhyt,
                UnemploymentInsurance = empBhtn,
                Total = empBhxh + empBhyt + empBhtn
            },
            Employer = new InsuranceBreakdown
            {
                SocialInsurance = erBhxh,
                HealthInsurance = erBhyt,
                UnemploymentInsurance = erBhtn,
                Total = erBhxh + erBhyt + erBhtn
            }
        };
    }

    // ============================================
    // VAT (Thuế GTGT)
    // ============================================
    public const decimal VatStandard = TaxRates.VatStandard;
    public const decimal VatTelecom = TaxRates.VatTelecom;
    public const decimal VatExport = TaxRates.VatExport;
    public const decimal VatExempt = TaxRates.VatExempt;

    public static decimal VatRateForCategory(string? categorySlug) => categorySlug switch
    {
        "vien-thong" or "tai-chinh" or "bat-dong-san" => VatTelecom,
        _ => VatStandard
    };

    public static VatCalculationResult CalculateVat(decimal priceBeforeVat, decimal vatRate = 0.08m)
    {
        if (vatRate < 0)
        {
            return new VatCalculationResult
            {
                PriceBeforeVat = priceBeforeVat,
                VatRate = 0,
                VatAmount = 0,
                PriceAfterVat = priceBeforeVat,
                IsExempt = true
            };
        }

        var vatAmount = Math.Round(priceBeforeVat * vatRate, 0);
        return new VatCalculationResult
        {
            PriceBeforeVat = priceBeforeVat,
            VatRate = vatRate,
            VatAmount = vatAmount,
            PriceAfterVat = priceBeforeVat + vatAmount,
            IsExempt = false
        };
    }

    public static VatCalculationResult ExtractVat(decimal priceIncludingVat, decimal vatRate = 0.08m)
    {
        if (vatRate <= 0)
        {
            return new VatCalculationResult
            {
                PriceBeforeVat = priceIncludingVat,
                VatRate = 0,
                VatAmount = 0,
                PriceAfterVat = priceIncludingVat,
                IsExempt = vatRate < 0
            };
        }

        var priceBeforeVat = Math.Round(priceIncludingVat / (1 + vatRate), 0);
        var vatAmount = priceIncludingVat - priceBeforeVat;

        return new VatCalculationResult
        {
            PriceBeforeVat = priceBeforeVat,
            VatRate = vatRate,
            VatAmount = vatAmount,
            PriceAfterVat = priceIncludingVat,
            IsExempt = false
        };
    }

    // ============================================
    // CIT (Thuế TNDN)
    // ============================================
    public const decimal CitStandardRate = 0.20m;

    public static CitCalculationResult CalculateCit(decimal revenue, decimal deductibleExpenses)
    {
        var taxableIncome = Math.Max(0, revenue - deductibleExpenses);
        var citAmount = Math.Round(taxableIncome * CitStandardRate, 0);

        return new CitCalculationResult
        {
            Revenue = revenue,
            DeductibleExpenses = deductibleExpenses,
            TaxableIncome = taxableIncome,
            TaxRate = CitStandardRate,
            CitAmount = citAmount
        };
    }

    // ============================================
    // COMPREHENSIVE PAYROLL
    // ============================================
    public static PayrollTaxResult CalculatePayroll(
        decimal grossSalary,
        int numberOfDependents = 0,
        decimal otherDeductions = 0,
        decimal? regionalMinSalary = null,
        decimal? personalDeduction = null,
        decimal? dependentDeduction = null)
    {
        var insurance = CalculateInsurance(grossSalary, regionalMinSalary);
        var pit = CalculateMonthlyPit(
            grossSalary,
            numberOfDependents,
            insurance.Employee.SocialInsurance,
            insurance.Employee.HealthInsurance,
            insurance.Employee.UnemploymentInsurance,
            otherDeductions,
            personalDeduction,
            dependentDeduction
        );

        return new PayrollTaxResult
        {
            GrossSalary = grossSalary,
            Insurance = insurance,
            Pit = pit,
            EmployeeDeductions = insurance.Employee.Total + pit.PitAmount,
            EmployerCosts = insurance.Employer.Total,
            NetSalary = grossSalary - insurance.Employee.Total - pit.PitAmount,
            TotalCompanyCost = grossSalary + insurance.Employer.Total
        };
    }
}

// ============================================
// RESULT DTOs
// ============================================

public class PitCalculationResult
{
    public decimal GrossSalary { get; set; }
    public decimal TotalInsurance { get; set; }
    public decimal PreTaxIncome { get; set; }
    public decimal PersonalDeduction { get; set; }
    public decimal DependentDeductions { get; set; }
    public decimal OtherDeductions { get; set; }
    public decimal TaxableIncome { get; set; }
    public decimal PitAmount { get; set; }
    public decimal NetSalary { get; set; }
    public decimal EffectiveTaxRate { get; set; }
    public List<PitBracketDetail> Brackets { get; set; } = new();
}

public class PitBracketDetail
{
    public decimal From { get; set; }
    public decimal To { get; set; }
    public decimal Rate { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
}

public class InsuranceCalculationResult
{
    public decimal InsurableSalary { get; set; }
    public InsuranceBreakdown Employee { get; set; } = new();
    public InsuranceBreakdown Employer { get; set; } = new();
}

public class InsuranceBreakdown
{
    public decimal SocialInsurance { get; set; }
    public decimal HealthInsurance { get; set; }
    public decimal UnemploymentInsurance { get; set; }
    public decimal Total { get; set; }
}

public class VatCalculationResult
{
    public decimal PriceBeforeVat { get; set; }
    public decimal VatRate { get; set; }
    public decimal VatAmount { get; set; }
    public decimal PriceAfterVat { get; set; }
    public bool IsExempt { get; set; }
}

public class CitCalculationResult
{
    public decimal Revenue { get; set; }
    public decimal DeductibleExpenses { get; set; }
    public decimal TaxableIncome { get; set; }
    public decimal TaxRate { get; set; }
    public decimal CitAmount { get; set; }
}

public class PayrollTaxResult
{
    public decimal GrossSalary { get; set; }
    public InsuranceCalculationResult Insurance { get; set; } = new();
    public PitCalculationResult Pit { get; set; } = new();
    public decimal EmployeeDeductions { get; set; }
    public decimal EmployerCosts { get; set; }
    public decimal NetSalary { get; set; }
    public decimal TotalCompanyCost { get; set; }
}
