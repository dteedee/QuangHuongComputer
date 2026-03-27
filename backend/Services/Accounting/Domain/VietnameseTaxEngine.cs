namespace Accounting.Domain;

/// <summary>
/// Vietnamese Tax Engine - Thuế Việt Nam
/// Implements PIT (TNCN), VAT (GTGT), CIT (TNDN), and Social Insurance calculations
/// Based on current Vietnamese tax law (2024-2025)
/// </summary>
public static class VietnameseTaxEngine
{
    // ============================================
    // PERSONAL INCOME TAX (PIT / Thuế TNCN)
    // ============================================
    // Progressive tax rates per Vietnamese law
    // Personal deduction: 11,000,000 VND/month
    // Dependent deduction: 4,400,000 VND/dependent/month
    // ============================================

    public const decimal PersonalDeduction = 11_000_000m;  // Giảm trừ bản thân
    public const decimal DependentDeduction = 4_400_000m;  // Giảm trừ người phụ thuộc

    /// <summary>
    /// Progressive PIT tax brackets (monthly taxable income ranges)
    /// </summary>
    private static readonly (decimal UpperLimit, decimal Rate)[] PitBrackets = new[]
    {
        (5_000_000m,   0.05m),   // Bậc 1: đến 5 triệu → 5%
        (10_000_000m,  0.10m),   // Bậc 2: 5-10 triệu → 10%
        (18_000_000m,  0.15m),   // Bậc 3: 10-18 triệu → 15%
        (32_000_000m,  0.20m),   // Bậc 4: 18-32 triệu → 20%
        (52_000_000m,  0.25m),   // Bậc 5: 32-52 triệu → 25%
        (80_000_000m,  0.30m),   // Bậc 6: 52-80 triệu → 30%
        (decimal.MaxValue, 0.35m) // Bậc 7: trên 80 triệu → 35%
    };

    /// <summary>
    /// Calculate monthly PIT (Thuế TNCN) from gross salary
    /// </summary>
    public static PitCalculationResult CalculateMonthlyPit(
        decimal grossSalary,
        int numberOfDependents = 0,
        decimal socialInsurance = 0,
        decimal healthInsurance = 0,
        decimal unemploymentInsurance = 0,
        decimal otherDeductions = 0)
    {
        // Step 1: Total insurance deductions
        var totalInsurance = socialInsurance + healthInsurance + unemploymentInsurance;

        // Step 2: Pre-tax income = Gross - Insurance
        var preTaxIncome = grossSalary - totalInsurance;

        // Step 3: Taxable income = Pre-tax - Personal deduction - Dependent deductions - Other
        var personalDeduction = PersonalDeduction;
        var dependentDeductions = DependentDeduction * numberOfDependents;
        var taxableIncome = preTaxIncome - personalDeduction - dependentDeductions - otherDeductions;

        if (taxableIncome <= 0)
        {
            return new PitCalculationResult
            {
                GrossSalary = grossSalary,
                TotalInsurance = totalInsurance,
                PreTaxIncome = preTaxIncome,
                PersonalDeduction = personalDeduction,
                DependentDeductions = dependentDeductions,
                OtherDeductions = otherDeductions,
                TaxableIncome = 0,
                PitAmount = 0,
                NetSalary = preTaxIncome,
                EffectiveTaxRate = 0,
                Brackets = new List<PitBracketDetail>()
            };
        }

        // Step 4: Apply progressive tax rates
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
            PersonalDeduction = personalDeduction,
            DependentDeductions = dependentDeductions,
            OtherDeductions = otherDeductions,
            TaxableIncome = taxableIncome,
            PitAmount = Math.Round(totalTax, 0),
            NetSalary = preTaxIncome - Math.Round(totalTax, 0),
            EffectiveTaxRate = preTaxIncome > 0 ? Math.Round(totalTax / preTaxIncome * 100, 2) : 0,
            Brackets = brackets
        };
    }

    // ============================================
    // SOCIAL INSURANCE (BHXH, BHYT, BHTN)
    // ============================================

    // Employee contribution rates (2024-2025)
    public const decimal SocialInsuranceRate_Employee = 0.08m;       // 8% BHXH
    public const decimal HealthInsuranceRate_Employee = 0.015m;      // 1.5% BHYT
    public const decimal UnemploymentInsuranceRate_Employee = 0.01m; // 1% BHTN
    public const decimal TotalInsuranceRate_Employee = 0.105m;       // Total 10.5%

    // Employer contribution rates
    public const decimal SocialInsuranceRate_Employer = 0.175m;      // 17.5% BHXH
    public const decimal HealthInsuranceRate_Employer = 0.03m;       // 3% BHYT
    public const decimal UnemploymentInsuranceRate_Employer = 0.01m; // 1% BHTN
    public const decimal TotalInsuranceRate_Employer = 0.215m;       // Total 21.5%

    // Cap: 20x base salary for BHXH/BHYT, 20x regional min salary for BHTN
    public const decimal BaseSalary2025 = 2_340_000m;  // Mức lương cơ sở 2025
    public const decimal MaxInsurableSalary = 46_800_000m; // 20 x base salary

    /// <summary>
    /// Calculate insurance contributions for both employee and employer
    /// </summary>
    public static InsuranceCalculationResult CalculateInsurance(decimal grossSalary, decimal? regionalMinSalary = null)
    {
        var insurable = Math.Min(grossSalary, MaxInsurableSalary);
        var regionalMin = regionalMinSalary ?? 4_960_000m; // Region I default

        // Employee contributions
        var empBhxh = Math.Round(insurable * SocialInsuranceRate_Employee, 0);
        var empBhyt = Math.Round(insurable * HealthInsuranceRate_Employee, 0);
        var empBhtn = Math.Round(Math.Min(grossSalary, regionalMin * 20) * UnemploymentInsuranceRate_Employee, 0);

        // Employer contributions
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

    public const decimal VatStandard = 0.08m;     // 8% (reduced from 10% through June 2025)
    public const decimal VatTelecom = 0.10m;      // 10% for telecom, finance, real estate
    public const decimal VatExport = 0.00m;       // 0% for export
    public const decimal VatExempt = -1m;         // Exempt flag

    public static VatCalculationResult CalculateVat(decimal priceBeforeVat, decimal vatRate = 0.08m)
    {
        if (vatRate < 0) // Exempt
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

    /// <summary>
    /// Extract VAT from a VAT-inclusive price
    /// </summary>
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
    // CIT (Thuế TNDN - Corporate Income Tax)
    // ============================================
    public const decimal CitStandardRate = 0.20m; // 20%

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
    // COMPREHENSIVE PAYROLL CALCULATION
    // ============================================

    /// <summary>
    /// Full payroll calculation: Gross → Insurance → PIT → Net
    /// </summary>
    public static PayrollTaxResult CalculatePayroll(
        decimal grossSalary,
        int numberOfDependents = 0,
        decimal otherDeductions = 0,
        decimal? regionalMinSalary = null)
    {
        // Step 1: Calculate insurance
        var insurance = CalculateInsurance(grossSalary, regionalMinSalary);

        // Step 2: Calculate PIT
        var pit = CalculateMonthlyPit(
            grossSalary,
            numberOfDependents,
            insurance.Employee.SocialInsurance,
            insurance.Employee.HealthInsurance,
            insurance.Employee.UnemploymentInsurance,
            otherDeductions
        );

        // Step 3: Build result
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
