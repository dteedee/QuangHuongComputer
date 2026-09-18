namespace BuildingBlocks.TaxEngine;

/// <summary>
/// W1-15 / D06 §4 — MỘT đường tính lương duy nhất. Hàm THUẦN: không I/O, không
/// <c>DateTime.Now</c>, mọi tham số pháp luật đến từ <see cref="StatutoryParameterSet"/> đã resolve.
///
/// Hai bộ tham số vì luật đổi theo hai mốc khác nhau (D06 §3):
///  · <paramref name="periodParameters"/> tra tại NGÀY 01 CỦA THÁNG LƯƠNG → bảo hiểm, lương tối thiểu vùng, hệ số OT;
///  · <paramref name="payDateParameters"/> tra tại <c>PayrollRun.PayDate</c> → thuế TNCN, tiền ăn ca, chế độ miễn OT.
/// TV2a (kỳ 9/2026) và TV2b (kỳ 6/2026) cùng mức lương lệch 361.000đ tiền bảo hiểm đúng vì mốc 01/07/2026.
///
/// Làm tròn đồng, <c>MidpointRounding.AwayFromZero</c> ghi rõ ở MỌI điểm.
/// </summary>
public static class PayrollTaxCalculator
{
    /// <summary>Tính bằng mặc định biên dịch sẵn (dùng khi bảng <c>hr.StatutoryParameters</c> chưa có).</summary>
    public static PayrollBreakdown Calculate(PayrollTaxInput input)
        => Calculate(input,
            VietnamStatutoryDefaults.Resolve(input.PeriodMonth),
            VietnamStatutoryDefaults.Resolve(input.PayDate));

    public static PayrollBreakdown Calculate(
        PayrollTaxInput input,
        StatutoryParameterSet periodParameters,
        StatutoryParameterSet payDateParameters)
    {
        var notes = new List<string>();
        var region = input.WageRegionOverride ?? periodParameters.CompanyWageRegion;

        var overtime = PayrollOvertimeCalculator.Calculate(input, periodParameters, payDateParameters, notes);
        var insurance = PayrollInsuranceCalculator.Calculate(input, periodParameters, region, notes);

        var grossPay = Round(input.BasePay
                             + input.MealAllowanceCash
                             + input.OtherTaxableAllowances
                             + input.NonTaxableAllowances
                             + input.Bonuses
                             + overtime.TotalPay
                             + overtime.NightPremiumPay);

        // Tiền ăn ca bằng tiền chỉ chịu thuế phần VƯỢT hạn mức (NĐ 253/2026 Đ.8.2.g).
        var mealTaxable = Math.Max(0m, input.MealAllowanceCash - payDateParameters.PitMealTaxFreeCap);
        if (mealTaxable > 0m)
        {
            notes.Add($"Tiền ăn ca vượt hạn mức {payDateParameters.PitMealTaxFreeCap:N0}đ: chịu thuế {mealTaxable:N0}đ.");
        }

        var taxableIncome = Round(input.BasePay
                                  + input.OtherTaxableAllowances
                                  + input.Bonuses
                                  + mealTaxable
                                  + overtime.TaxablePay);

        var method = PitCalculator.SelectMethod(input);
        var unionDues = UnionDues(input, insurance, periodParameters);

        decimal assessable;
        decimal pit;
        switch (method)
        {
            case PitMethod.NonResident20:
                assessable = taxableIncome;
                pit = PitCalculator.NonResident(taxableIncome, payDateParameters.PitNonResidentRate);
                notes.Add("Cá nhân không cư trú: 20% trên tổng thu nhập, không giảm trừ (Luật 109/2025 Đ.21).");
                break;

            case PitMethod.Flat10:
                assessable = taxableIncome;
                pit = PitCalculator.Flat(taxableIncome, payDateParameters.PitFlatRate,
                    payDateParameters.PitFlatThreshold, input.HasPitCommitment);
                notes.Add(input.HasPitCommitment
                    ? "Có bản cam kết TNCN: tạm chưa khấu trừ 10%."
                    : $"Khấu trừ {payDateParameters.PitFlatRate:P0} mỗi lần chi, ngưỡng {payDateParameters.PitFlatThreshold:N0}đ (NĐ 253/2026 Đ.50.2).");
                break;

            default:
                assessable = PitCalculator.AssessableIncome(taxableIncome, insurance.EmployeeTotal,
                    input.NumberOfDependents, payDateParameters, input.OtherDeductions);
                pit = PitCalculator.Progressive(assessable, payDateParameters.PitBrackets);
                break;
        }

        var unionFeeEmployer = Round(insurance.SocialInsuranceBase * periodParameters.Rates.UnionFeeEmployer);

        var netPay = Round(grossPay - insurance.EmployeeTotal - unionDues - pit - Math.Max(0m, input.OtherDeductions));
        if (netPay < 0m) netPay = 0m;

        return new PayrollBreakdown
        {
            PeriodMonth = input.PeriodMonth,
            PayDate = input.PayDate,
            PitMethod = method,
            Overtime = overtime,
            Insurance = insurance,
            GrossPay = grossPay,
            TaxableIncome = taxableIncome,
            AssessableIncome = assessable,
            PersonalIncomeTax = pit,
            UnionDuesEmployee = unionDues,
            UnionFeeEmployer = unionFeeEmployer,
            NetPay = netPay,
            TotalEmployerCost = Round(grossPay + insurance.EmployerTotal + unionFeeEmployer),
            Notes = notes
        };
    }

    /// <summary>
    /// Đoàn phí công đoàn: CHỈ đoàn viên, 1% căn cứ đóng BHXH, trần 10% mức tham chiếu
    /// (QĐ 1908/QĐ-TLĐ — D06 đánh dấu CHƯA XÁC MINH, mặc định không ai là đoàn viên).
    /// </summary>
    private static decimal UnionDues(
        PayrollTaxInput input,
        PayrollInsuranceBreakdown insurance,
        StatutoryParameterSet parameters)
    {
        if (!input.IsUnionMember) return 0m;

        var dues = insurance.SocialInsuranceBase * parameters.Rates.UnionDuesEmployee;
        var cap = parameters.SiReferenceLevel * parameters.Rates.UnionDuesCapRatio;
        return Round(Math.Min(dues, cap));
    }

    internal static decimal Round(decimal value) => Math.Round(value, 0, MidpointRounding.AwayFromZero);
}
