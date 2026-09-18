namespace BuildingBlocks.TaxEngine;

/// <summary>
/// W1-15 / D06 §4 — bảo hiểm bắt buộc (BHXH, BHYT, BHTN) hai phía.
///
/// Căn cứ đóng = <c>SalaryStructure.InsurableSalary</c> (KHÔNG phải gross — bản cũ lấy gross là sai),
/// kẹp [mức tham chiếu; 20 × mức tham chiếu] cho BHXH/BHYT (Luật BHXH 41/2024 Đ.31.1.đ);
/// BHTN có trần RIÊNG = 20 × lương tối thiểu tháng của VÙNG (Luật Việc làm 74/2025 Đ.34.2).
///
/// Ba trường hợp không đóng:
///  · HĐ THỬ VIỆC RIÊNG → miễn cả ba quỹ, cả hai phía (NĐ 158/2025 Đ.3.5; Luật 74/2025 Đ.31.2).
///    Thử việc ghi TRONG HĐLĐ thì vẫn đóng đủ — xem <c>IsStandaloneProbation</c>.
///  · Nghỉ không hưởng lương ≥ 14 ngày làm việc/tháng → không đóng BHXH (Luật 41/2024 Đ.33.5),
///    trừ khi có thoả thuận đóng theo căn cứ tháng gần nhất (Đ.34.3).
///  · BHYT/BHTN trong trường hợp trên: D06 đánh dấu CHƯA XÁC MINH → hai cờ RIÊNG
///    <c>HI_UNPAID_DAYS_SKIP</c>/<c>UI_UNPAID_DAYS_SKIP</c>, mặc định BẬT theo thực hành QĐ 595/QĐ-BHXH.
/// </summary>
internal static class PayrollInsuranceCalculator
{
    public static PayrollInsuranceBreakdown Calculate(
        PayrollTaxInput input,
        StatutoryParameterSet parameters,
        WageRegion region,
        List<string> notes)
    {
        if (input.IsStandaloneProbation)
        {
            notes.Add("Hợp đồng thử việc riêng: không thuộc diện BHXH/BHYT/BHTN bắt buộc (NĐ 158/2025 Đ.3.5).");
            return default;
        }

        var salary = Math.Max(0m, input.InsurableSalary);
        var reference = parameters.SiReferenceLevel;
        var cap = parameters.SocialInsuranceCap;

        var statutoryBase = Math.Clamp(salary, reference, cap);
        if (salary > cap)
        {
            notes.Add($"Căn cứ đóng BHXH/BHYT chạm trần {cap:N0}đ "
                      + $"({parameters.SiCapMultiplier:0.##} × mức tham chiếu {reference:N0}đ).");
        }

        var unemploymentCap = parameters.UnemploymentCapFor(region);
        var unemploymentBase = Math.Min(salary, unemploymentCap);
        if (salary > unemploymentCap)
        {
            notes.Add($"Căn cứ đóng BHTN chạm trần vùng {region} = {unemploymentCap:N0}đ (Luật 74/2025 Đ.34.2).");
        }

        var skipAll = input.UnpaidLeaveWorkingDays >= parameters.SiUnpaidDaysSkip;
        var skipSi = skipAll && !input.KeepSiOnUnpaidLeave;
        var skipHi = skipAll && parameters.HiSkipOnUnpaidDays;
        var skipUi = skipAll && parameters.UiSkipOnUnpaidDays;

        if (skipAll)
        {
            notes.Add($"Nghỉ không hưởng lương {input.UnpaidLeaveWorkingDays:0.##} ngày làm việc "
                      + $"(≥ {parameters.SiUnpaidDaysSkip:0.##}): "
                      + (skipSi ? "ngừng đóng BHXH" : "vẫn đóng BHXH theo thoả thuận")
                      + (skipHi ? ", ngừng BHYT" : "")
                      + (skipUi ? ", ngừng BHTN" : "")
                      + " (Luật 41/2024 Đ.33.5; BHYT/BHTN theo thực hành QĐ 595 — CHƯA XÁC MINH).");
        }

        var siBase = skipSi ? 0m : statutoryBase;
        var hiBase = skipHi ? 0m : statutoryBase;
        var uiBase = skipUi ? 0m : unemploymentBase;
        var rates = parameters.Rates;

        return new PayrollInsuranceBreakdown(
            SocialInsuranceBase: siBase,
            HealthInsuranceBase: hiBase,
            UnemploymentBase: uiBase,
            EmployeeSocial: R(siBase * rates.SiEmployee),
            EmployeeHealth: R(hiBase * rates.HiEmployee),
            EmployeeUnemployment: R(uiBase * rates.UiEmployee),
            EmployerSocialSickness: R(siBase * rates.SiEmployerSickness),
            EmployerSocialPension: R(siBase * rates.SiEmployerPension),
            EmployerSocialAccident: R(siBase * rates.SiEmployerAccident),
            EmployerHealth: R(hiBase * rates.HiEmployer),
            EmployerUnemployment: R(uiBase * rates.UiEmployer));
    }

    private static decimal R(decimal value) => PayrollTaxCalculator.Round(value);
}
