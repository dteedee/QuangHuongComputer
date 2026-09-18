namespace BuildingBlocks.TaxEngine;

/// <summary>
/// W1-15 / D06 §2 — mã tham số pháp luật. Đây là HỢP ĐỒNG đóng băng cho wave 2+:
/// W2-25 seed đúng những mã này vào <c>hr."StatutoryParameters"</c>, W2-16 và W3-6 đọc đúng
/// những mã này. Thêm mã mới thì thêm hằng số ở đây trước.
/// </summary>
public static class StatutoryParameterCodes
{
    // --- Thuế TNCN ---
    public const string PitPersonalDeduction = "PIT_PERSONAL_DEDUCTION";
    public const string PitDependentDeduction = "PIT_DEPENDENT_DEDUCTION";
    public const string PitBrackets = "PIT_BRACKETS";
    public const string PitNonResidentRate = "PIT_NONRESIDENT_RATE";
    public const string PitFlatRate = "PIT_FLAT_RATE";
    public const string PitFlatThreshold = "PIT_FLAT_THRESHOLD";
    public const string PitOvertimeExemptMode = "PIT_OT_EXEMPT_MODE";
    public const string PitMealTaxFreeCap = "PIT_MEAL_TAXFREE_CAP";

    // --- Bảo hiểm bắt buộc ---
    public const string SiReferenceLevel = "SI_REFERENCE_LEVEL";
    public const string SiCapMultiplier = "SI_CAP_MULTIPLIER";
    public const string UiCapMultiplier = "UI_CAP_MULTIPLIER";
    public const string SiEmployee = "SI_EE";
    public const string HiEmployee = "HI_EE";
    public const string UiEmployee = "UI_EE";
    public const string SiEmployerSickness = "SI_ER_SICK";
    public const string SiEmployerPension = "SI_ER_PENSION";
    public const string SiEmployerAccident = "SI_ER_ACCIDENT";
    public const string HiEmployer = "HI_ER";
    public const string UiEmployer = "UI_ER";
    public const string SiUnpaidDaysSkip = "SI_UNPAID_DAYS_SKIP";
    public const string HiUnpaidDaysSkip = "HI_UNPAID_DAYS_SKIP";
    public const string UiUnpaidDaysSkip = "UI_UNPAID_DAYS_SKIP";

    // --- Công đoàn ---
    public const string UnionFeeEmployer = "UNION_FEE_ER";
    public const string UnionDuesEmployee = "UNION_DUES_EE";
    public const string UnionDuesCapRatio = "UNION_DUES_EE_CAP_RATIO";

    // --- Lao động ---
    public const string RegionalMinWage = "REGIONAL_MIN_WAGE";
    public const string CompanyWageRegion = "COMPANY_WAGE_REGION";
    public const string OvertimeMultipliers = "OT_MULTIPLIERS";
    public const string OvertimeLimits = "OT_LIMITS";
    public const string ProbationMinRatio = "PROBATION_MIN_RATIO";

    /// <summary>Mọi mã bắt buộc phải resolve được — thiếu mã nào thì bộ tham số không hợp lệ.</summary>
    public static readonly IReadOnlyList<string> All = new[]
    {
        PitPersonalDeduction, PitDependentDeduction, PitBrackets, PitNonResidentRate,
        PitFlatRate, PitFlatThreshold, PitOvertimeExemptMode, PitMealTaxFreeCap,
        SiReferenceLevel, SiCapMultiplier, UiCapMultiplier,
        SiEmployee, HiEmployee, UiEmployee,
        SiEmployerSickness, SiEmployerPension, SiEmployerAccident, HiEmployer, UiEmployer,
        SiUnpaidDaysSkip, HiUnpaidDaysSkip, UiUnpaidDaysSkip,
        UnionFeeEmployer, UnionDuesEmployee, UnionDuesCapRatio,
        RegionalMinWage, CompanyWageRegion, OvertimeMultipliers, OvertimeLimits, ProbationMinRatio
    };
}
