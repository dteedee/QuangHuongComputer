namespace BuildingBlocks.TaxEngine;

/// <summary>
/// W1-15 / D06 §4 — thuế TNCN, hàm thuần, nhận biểu thuế từ <see cref="StatutoryParameterSet"/>.
/// MỘT đường tính duy nhất: bảng lương tháng, quyết toán năm (mẫu 05/KK-TNCN) và
/// <c>PitFinalizationService</c> đều gọi vào đây, thay cho 4 bản hardcode đang tồn tại.
///
/// Làm tròn: <c>MidpointRounding.AwayFromZero</c> ghi rõ ở mọi điểm làm tròn (mặc định của
/// .NET là banker's rounding và cho kết quả khác ở số lẻ .5).
/// </summary>
public static class PitCalculator
{
    /// <summary>
    /// Luỹ tiến từng phần trên thu nhập TÍNH thuế THÁNG. Cộng dồn từng bậc (không dùng số trừ nhanh)
    /// nên đúng với cả biểu 7 bậc (đến kỳ 2025) lẫn biểu 5 bậc (từ kỳ 2026).
    /// </summary>
    public static decimal Progressive(decimal monthlyAssessableIncome, IReadOnlyList<PitBracket> brackets)
        => Apply(monthlyAssessableIncome, brackets, scale: 1m);

    /// <summary>
    /// Quyết toán NĂM: cùng biểu thuế, các mốc bậc nhân 12 (TT 111/2013; giữ nguyên ở luật 2026).
    /// TV6: thu nhập tính thuế năm 136.200.000 → 7.620.000 = 12 × 635.000.
    /// </summary>
    public static decimal Annual(decimal annualAssessableIncome, IReadOnlyList<PitBracket> brackets)
        => Apply(annualAssessableIncome, brackets, scale: 12m);

    /// <summary>
    /// Khấu trừ 10% mỗi lần chi cho cá nhân cư trú không HĐ / HĐ &lt; 3 tháng / HĐ thử việc riêng.
    /// Dưới ngưỡng mỗi lần chi hoặc có bản cam kết → không khấu trừ (NĐ 253/2026 Đ.50.2).
    /// </summary>
    public static decimal Flat(decimal paymentAmount, decimal rate, decimal threshold, bool hasCommitment)
    {
        if (hasCommitment) return 0m;
        if (paymentAmount < threshold) return 0m;
        return Math.Round(paymentAmount * rate, 0, MidpointRounding.AwayFromZero);
    }

    /// <summary>Cá nhân không cư trú: 20% trên TỔNG thu nhập từ tiền lương, không giảm trừ (Luật 109/2025 Đ.21).</summary>
    public static decimal NonResident(decimal totalEmploymentIncome, decimal rate)
        => totalEmploymentIncome <= 0m
            ? 0m
            : Math.Round(totalEmploymentIncome * rate, 0, MidpointRounding.AwayFromZero);

    /// <summary>
    /// Thu nhập TÍNH thuế = chịu thuế − bảo hiểm bắt buộc − giảm trừ bản thân − giảm trừ NPT − giảm trừ khác.
    /// Âm → 0 (không mang lỗ sang tháng sau).
    /// </summary>
    public static decimal AssessableIncome(
        decimal taxableIncome,
        decimal compulsoryInsurance,
        int numberOfDependents,
        StatutoryParameterSet parameters,
        decimal otherDeductions = 0m)
    {
        var assessable = taxableIncome
                         - compulsoryInsurance
                         - parameters.PitPersonalDeduction
                         - parameters.PitDependentDeduction * Math.Max(0, numberOfDependents)
                         - Math.Max(0m, otherDeductions);

        return assessable <= 0m ? 0m : assessable;
    }

    private static decimal Apply(decimal income, IReadOnlyList<PitBracket> brackets, decimal scale)
    {
        if (income <= 0m || brackets.Count == 0) return 0m;

        var tax = 0m;
        var remaining = income;
        var previousLimit = 0m;

        foreach (var bracket in brackets)
        {
            if (remaining <= 0m) break;

            var width = bracket.UpTo is null
                ? remaining
                : Math.Min(bracket.UpTo.Value * scale - previousLimit, remaining);

            if (width <= 0m) continue;

            tax += width * bracket.Rate;
            remaining -= width;
            if (bracket.UpTo is not null) previousLimit = bracket.UpTo.Value * scale;
        }

        return Math.Round(tax, 0, MidpointRounding.AwayFromZero);
    }

    /// <summary>
    /// D06 §4 — chọn cách tính thuế. <c>ContractType.Probation</c> MỘT MÌNH không đủ:
    /// thử việc ghi TRONG HĐLĐ (BLLĐ Đ.24) vẫn đóng đủ BH và vẫn tính luỹ tiến nếu HĐ ≥ 3 tháng.
    /// </summary>
    public static PitMethod SelectMethod(PayrollTaxInput input)
    {
        if (input.PitMethodOverride is { } forced) return forced;
        if (!input.IsTaxResident) return PitMethod.NonResident20;
        if (input.IsStandaloneProbation) return PitMethod.Flat10;
        return input.ContractMonths >= 3 ? PitMethod.Progressive : PitMethod.Flat10;
    }
}
