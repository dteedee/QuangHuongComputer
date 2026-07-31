using BB = BuildingBlocks.TaxEngine;

namespace Accounting.Domain;

/// <summary>
/// [DEPRECATED] Alias tương thích ngược. Source of truth đã chuyển sang
/// <see cref="BB.VietnameseTaxEngine"/> ở BuildingBlocks để cả HR và Accounting dùng chung.
/// Giữ file này chỉ để các test cũ / code cũ trong Accounting/AccountingEndpoints.cs
/// không bị vỡ đột ngột. Code mới hãy dùng <c>BuildingBlocks.TaxEngine.VietnameseTaxEngine</c>.
/// </summary>
public static class VietnameseTaxEngine
{
    // ---- PIT ----
    public const decimal PersonalDeduction = BB.VietnameseTaxEngine.PersonalDeduction;
    public const decimal DependentDeduction = BB.VietnameseTaxEngine.DependentDeduction;

    public static PitCalculationResult CalculateMonthlyPit(
        decimal grossSalary,
        int numberOfDependents = 0,
        decimal socialInsurance = 0,
        decimal healthInsurance = 0,
        decimal unemploymentInsurance = 0,
        decimal otherDeductions = 0)
        => Map(BB.VietnameseTaxEngine.CalculateMonthlyPit(
            grossSalary, numberOfDependents, socialInsurance, healthInsurance,
            unemploymentInsurance, otherDeductions));

    // ---- Insurance ----
    public const decimal SocialInsuranceRate_Employee = BB.VietnameseTaxEngine.SocialInsuranceRate_Employee;
    public const decimal HealthInsuranceRate_Employee = BB.VietnameseTaxEngine.HealthInsuranceRate_Employee;
    public const decimal UnemploymentInsuranceRate_Employee = BB.VietnameseTaxEngine.UnemploymentInsuranceRate_Employee;
    public const decimal TotalInsuranceRate_Employee = BB.VietnameseTaxEngine.TotalInsuranceRate_Employee;
    public const decimal SocialInsuranceRate_Employer = BB.VietnameseTaxEngine.SocialInsuranceRate_Employer;
    public const decimal HealthInsuranceRate_Employer = BB.VietnameseTaxEngine.HealthInsuranceRate_Employer;
    public const decimal UnemploymentInsuranceRate_Employer = BB.VietnameseTaxEngine.UnemploymentInsuranceRate_Employer;
    public const decimal TotalInsuranceRate_Employer = BB.VietnameseTaxEngine.TotalInsuranceRate_Employer;
    public const decimal BaseSalary2025 = BB.VietnameseTaxEngine.BaseSalary2025;
    public const decimal MaxInsurableSalary = BB.VietnameseTaxEngine.MaxInsurableSalary;

    public static InsuranceCalculationResult CalculateInsurance(decimal grossSalary, decimal? regionalMinSalary = null)
        => Map(BB.VietnameseTaxEngine.CalculateInsurance(grossSalary, regionalMinSalary));

    // ---- VAT ----
    public const decimal VatStandard = BB.VietnameseTaxEngine.VatStandard;
    public const decimal VatTelecom = BB.VietnameseTaxEngine.VatTelecom;
    public const decimal VatExport = BB.VietnameseTaxEngine.VatExport;
    public const decimal VatExempt = BB.VietnameseTaxEngine.VatExempt;

    public static decimal VatRateForCategory(string? categorySlug)
        => BB.VietnameseTaxEngine.VatRateForCategory(categorySlug);

    public static VatCalculationResult CalculateVat(decimal priceBeforeVat, decimal vatRate = 0.08m)
        => Map(BB.VietnameseTaxEngine.CalculateVat(priceBeforeVat, vatRate));

    public static VatCalculationResult ExtractVat(decimal priceIncludingVat, decimal vatRate = 0.08m)
        => Map(BB.VietnameseTaxEngine.ExtractVat(priceIncludingVat, vatRate));

    // ---- CIT ----
    public const decimal CitStandardRate = BB.VietnameseTaxEngine.CitStandardRate;

    public static CitCalculationResult CalculateCit(decimal revenue, decimal deductibleExpenses)
        => Map(BB.VietnameseTaxEngine.CalculateCit(revenue, deductibleExpenses));

    // ---- Comprehensive ----
    public static PayrollTaxResult CalculatePayroll(
        decimal grossSalary, int numberOfDependents = 0,
        decimal otherDeductions = 0, decimal? regionalMinSalary = null)
        => Map(BB.VietnameseTaxEngine.CalculatePayroll(
            grossSalary, numberOfDependents, otherDeductions, regionalMinSalary));

    // ============================================
    // Mappers giữa DTO alias và DTO gốc ở BuildingBlocks
    // ============================================
    private static PitCalculationResult Map(BB.PitCalculationResult r) => new()
    {
        GrossSalary = r.GrossSalary,
        TotalInsurance = r.TotalInsurance,
        PreTaxIncome = r.PreTaxIncome,
        PersonalDeduction = r.PersonalDeduction,
        DependentDeductions = r.DependentDeductions,
        OtherDeductions = r.OtherDeductions,
        TaxableIncome = r.TaxableIncome,
        PitAmount = r.PitAmount,
        NetSalary = r.NetSalary,
        EffectiveTaxRate = r.EffectiveTaxRate,
        Brackets = r.Brackets.Select(b => new PitBracketDetail
        {
            From = b.From,
            To = b.To,
            Rate = b.Rate,
            TaxableAmount = b.TaxableAmount,
            TaxAmount = b.TaxAmount
        }).ToList()
    };

    private static InsuranceCalculationResult Map(BB.InsuranceCalculationResult r) => new()
    {
        InsurableSalary = r.InsurableSalary,
        Employee = new InsuranceBreakdown
        {
            SocialInsurance = r.Employee.SocialInsurance,
            HealthInsurance = r.Employee.HealthInsurance,
            UnemploymentInsurance = r.Employee.UnemploymentInsurance,
            Total = r.Employee.Total
        },
        Employer = new InsuranceBreakdown
        {
            SocialInsurance = r.Employer.SocialInsurance,
            HealthInsurance = r.Employer.HealthInsurance,
            UnemploymentInsurance = r.Employer.UnemploymentInsurance,
            Total = r.Employer.Total
        }
    };

    private static VatCalculationResult Map(BB.VatCalculationResult r) => new()
    {
        PriceBeforeVat = r.PriceBeforeVat,
        VatRate = r.VatRate,
        VatAmount = r.VatAmount,
        PriceAfterVat = r.PriceAfterVat,
        IsExempt = r.IsExempt
    };

    private static CitCalculationResult Map(BB.CitCalculationResult r) => new()
    {
        Revenue = r.Revenue,
        DeductibleExpenses = r.DeductibleExpenses,
        TaxableIncome = r.TaxableIncome,
        TaxRate = r.TaxRate,
        CitAmount = r.CitAmount
    };

    private static PayrollTaxResult Map(BB.PayrollTaxResult r) => new()
    {
        GrossSalary = r.GrossSalary,
        Insurance = Map(r.Insurance),
        Pit = Map(r.Pit),
        EmployeeDeductions = r.EmployeeDeductions,
        EmployerCosts = r.EmployerCosts,
        NetSalary = r.NetSalary,
        TotalCompanyCost = r.TotalCompanyCost
    };
}

// ============================================
// DTO alias giữ nguyên public shape để không phá code cũ
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
