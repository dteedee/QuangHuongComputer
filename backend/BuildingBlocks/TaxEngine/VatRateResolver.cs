using BuildingBlocks.SharedKernel;

namespace BuildingBlocks.TaxEngine;

/// <summary>
/// W1-15 / D01 §2 — NGUỒN DUY NHẤT trả lời "dòng hàng này chịu thuế suất bao nhiêu, vào ngày nào".
/// Hàm thuần, không I/O, không <c>DateTime.Now</c>: ngày truyền vào phải lấy từ
/// <c>IBusinessClock.TodayVn</c> (đơn hàng) hoặc ngày lập hoá đơn (hoá đơn — Luật GTGT Đ.8.1.a).
///
/// Quy tắc: giảm 2 điểm CHỈ khi cả ba điều kiện đúng —
/// (1) dòng hàng <c>reductionEligible</c> (không thuộc Phụ lục I/II NĐ 174/2025);
/// (2) thuế suất luật định của dòng ĐÚNG BẰNG mức chuẩn được giảm (10%) — hàng 5%/0%/KCT không giảm;
/// (3) ngày giao dịch nằm trong [From, To] (bao gồm hai đầu).
/// </summary>
public static class VatRateResolver
{
    /// <summary>Giải thuế suất theo cửa sổ giảm LUẬT ĐỊNH biên dịch sẵn (fallback khi không có config).</summary>
    public static decimal Resolve(decimal statutoryRate, bool reductionEligible, DateOnly businessDateVn)
        => Resolve(statutoryRate, reductionEligible, businessDateVn, VatReductionWindow.Legal);

    /// <summary>Giải thuế suất theo một cửa sổ giảm cụ thể (đọc từ SystemConfig).</summary>
    public static decimal Resolve(
        decimal statutoryRate,
        bool reductionEligible,
        DateOnly businessDateVn,
        VatReductionWindow window)
    {
        // Miễn thuế (âm) và 0% giữ nguyên — không có gì để giảm.
        if (statutoryRate <= 0m) return statutoryRate;

        if (!reductionEligible) return statutoryRate;
        if (statutoryRate != window.StandardRate) return statutoryRate;
        if (businessDateVn < window.From || businessDateVn > window.To) return statutoryRate;

        var reduced = statutoryRate - window.ReductionPoints;
        return reduced < 0m ? 0m : reduced;
    }

    /// <summary>
    /// Có đang trong cửa sổ giảm không — dùng cho nhãn hiển thị và ghi chú căn cứ trên hoá đơn.
    /// </summary>
    public static bool IsReductionActive(DateOnly businessDateVn, VatReductionWindow window)
        => businessDateVn >= window.From && businessDateVn <= window.To;
}

/// <summary>
/// Cửa sổ giảm thuế GTGT tạm thời. Bất biến, so sánh theo giá trị.
/// </summary>
/// <param name="StandardRate">Thuế suất chuẩn được áp dụng mức giảm (0.10).</param>
/// <param name="ReductionPoints">Số điểm phần trăm giảm (0.02).</param>
/// <param name="From">Ngày đầu tiên được giảm (giờ VN, bao gồm).</param>
/// <param name="To">Ngày cuối cùng được giảm (giờ VN, bao gồm).</param>
/// <param name="LegalBasis">Căn cứ pháp lý để in trên chứng từ.</param>
public readonly record struct VatReductionWindow(
    decimal StandardRate,
    decimal ReductionPoints,
    DateOnly From,
    DateOnly To,
    string LegalBasis)
{
    /// <summary>Cửa sổ luật định biên dịch sẵn — fallback khi config thiếu hoặc không hợp lệ.</summary>
    public static VatReductionWindow Legal => new(
        TaxRates.VatStatutoryStandard,
        TaxRates.VatReductionPoints,
        TaxRates.VatReductionFrom,
        TaxRates.VatReductionTo,
        TaxRates.VatReductionLegalBasis);

    /// <summary>
    /// Dựng cửa sổ từ <see cref="TaxSettings"/> (đọc SystemConfig). Mọi trường sai/thiếu rơi về
    /// hằng số luật định TƯƠNG ỨNG và được ghi vào <paramref name="problems"/> để caller log warning
    /// — cấu hình hỏng KHÔNG được làm hỏng phép tính tiền.
    /// </summary>
    public static VatReductionWindow FromSettings(TaxSettings? settings, out IReadOnlyList<string> problems)
    {
        var issues = new List<string>();
        var legal = Legal;

        if (settings is null)
        {
            issues.Add("TaxSettings null — dùng toàn bộ hằng số luật định.");
            problems = issues;
            return legal;
        }

        var standard = settings.VatDefaultRatePercent / 100m;
        if (standard is <= 0m or > 1m)
        {
            issues.Add($"TAX_VAT_DEFAULT_RATE={settings.VatDefaultRatePercent} ngoài khoảng (0;100] — dùng {legal.StandardRate:P0}.");
            standard = legal.StandardRate;
        }

        var points = settings.VatReductionPointsPercent / 100m;
        if (points < 0m || points > standard)
        {
            issues.Add($"TAX_VAT_REDUCTION_POINTS={settings.VatReductionPointsPercent} ngoài khoảng [0;{standard * 100m}] — dùng {legal.ReductionPoints:P0}.");
            points = legal.ReductionPoints;
        }

        var from = settings.VatReductionFrom ?? legal.From;
        var to = settings.VatReductionTo ?? legal.To;
        if (settings.VatReductionFrom is null) issues.Add("TAX_VAT_REDUCTION_FROM thiếu/không parse được — dùng " + legal.From.ToString("yyyy-MM-dd"));
        if (settings.VatReductionTo is null) issues.Add("TAX_VAT_REDUCTION_TO thiếu/không parse được — dùng " + legal.To.ToString("yyyy-MM-dd"));
        if (from > to)
        {
            issues.Add($"Cửa sổ giảm đảo ngược ({from:yyyy-MM-dd} > {to:yyyy-MM-dd}) — dùng cửa sổ luật định.");
            from = legal.From;
            to = legal.To;
        }

        var basis = string.IsNullOrWhiteSpace(settings.VatReductionLegalBasis)
            ? legal.LegalBasis
            : settings.VatReductionLegalBasis;

        problems = issues;
        return new VatReductionWindow(standard, points, from, to, basis);
    }
}
