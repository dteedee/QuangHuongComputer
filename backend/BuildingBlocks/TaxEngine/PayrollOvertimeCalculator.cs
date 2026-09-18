namespace BuildingBlocks.TaxEngine;

/// <summary>
/// W1-15 / D06 §4 — tiền làm thêm giờ, phụ cấp đêm và phần được MIỄN thuế TNCN.
///
/// THỨ TỰ LÀM TRÒN QUYẾT ĐỊNH KẾT QUẢ: lương giờ được làm tròn về ĐỒNG TRƯỚC khi nhân hệ số và
/// số giờ. TV1 ra đúng 649.035 theo thứ tự này; nhân trước rồi mới làm tròn ra 649.038.
/// Đây cũng là thứ tự mà <c>PayrollCalculationService</c> hiện tại đang dùng — giữ nguyên.
/// </summary>
internal static class PayrollOvertimeCalculator
{
    public static PayrollOvertimeBreakdown Calculate(
        PayrollTaxInput input,
        StatutoryParameterSet periodParameters,
        StatutoryParameterSet payDateParameters,
        List<string> notes)
    {
        var hourlyRate = HourlyRate(input);
        var multipliers = periodParameters.OvertimeMultipliers;

        var totalHours = 0m;
        var totalPay = 0m;
        var ordinaryPay = 0m; // tiền theo lương giờ thường cho cùng số giờ — dùng cho chế độ PremiumOnly

        foreach (var entry in input.Overtime)
        {
            if (entry.Hours <= 0m) continue;
            var coefficient = multipliers.Coefficient(entry.DayType, entry.AtNight);
            totalHours += entry.Hours;
            totalPay += PayrollTaxCalculator.Round(hourlyRate * coefficient * entry.Hours);
            ordinaryPay += PayrollTaxCalculator.Round(hourlyRate * entry.Hours);
        }

        // Làm đêm KHÔNG phải làm thêm: chỉ hưởng phụ cấp đêm 30% (BLLĐ Đ.98.2).
        var nightPremiumPay = input.NightHours > 0m
            ? PayrollTaxCalculator.Round(hourlyRate * multipliers.NightPremium * input.NightHours)
            : 0m;

        var limits = periodParameters.OvertimeLimits;
        var yearRemaining = Math.Max(0m, limits.YearHours - Math.Max(0m, input.OvertimeHoursYearToDate));
        var exemptHours = Math.Min(totalHours, Math.Min(limits.MonthHours, yearRemaining));
        if (exemptHours < 0m) exemptHours = 0m;

        if (totalHours > exemptHours)
        {
            notes.Add($"Làm thêm {totalHours:0.##}h vượt trần miễn thuế ({limits.MonthHours:0.##}h/tháng, "
                      + $"còn {yearRemaining:0.##}h trong năm): phần vượt chịu thuế (NĐ 253/2026 Đ.26.3).");
        }

        decimal exemptPay;
        if (payDateParameters.PitOvertimeExemptMode == OvertimeExemptMode.FullWithinLegalHours)
        {
            // Từ kỳ 2026: miễn TOÀN BỘ tiền OT trong phạm vi giờ hợp pháp (Luật 109/2025 Đ.4.8).
            exemptPay = totalHours > 0m
                ? PayrollTaxCalculator.Round(totalPay * exemptHours / totalHours)
                : 0m;
            // Phụ cấp làm đêm cũng là "tiền lương làm việc ban đêm" → miễn toàn bộ.
            exemptPay += nightPremiumPay;
        }
        else
        {
            // Đến kỳ 2025: chỉ miễn PHẦN CHÊNH so với lương giờ ngày thường.
            var premium = totalPay - ordinaryPay;
            exemptPay = totalHours > 0m && premium > 0m
                ? PayrollTaxCalculator.Round(premium * exemptHours / totalHours)
                : 0m;
            exemptPay += nightPremiumPay;
        }

        var totalOvertimeRelatedPay = totalPay + nightPremiumPay;
        if (exemptPay > totalOvertimeRelatedPay) exemptPay = totalOvertimeRelatedPay;

        return new PayrollOvertimeBreakdown(
            HourlyRate: hourlyRate,
            TotalHours: totalHours,
            TotalPay: totalPay,
            NightPremiumPay: nightPremiumPay,
            ExemptHours: exemptHours,
            ExemptPay: exemptPay,
            TaxablePay: totalOvertimeRelatedPay - exemptPay);
    }

    /// <summary>
    /// Lương giờ = Round((lương HĐ + phụ cấp IsInsurable) / (công chuẩn × giờ/ngày), 0, AwayFromZero).
    /// TV1: 9.000.000 / (26 × 8) = 43.269,23 → 43.269.
    /// </summary>
    internal static decimal HourlyRate(PayrollTaxInput input)
    {
        var numerator = input.OvertimeHourlyBase > 0m
            ? input.OvertimeHourlyBase
            : input.InsurableSalary > 0m ? input.InsurableSalary : input.BasePay;

        var denominator = input.StandardWorkingDays * input.HoursPerDay;
        if (denominator <= 0m) return 0m;

        return PayrollTaxCalculator.Round(numerator / denominator);
    }
}
