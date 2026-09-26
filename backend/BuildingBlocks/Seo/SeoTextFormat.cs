using System.Globalization;

namespace BuildingBlocks.Seo;

/// <summary>Định dạng chuỗi dùng chung cho thân trang SEO shell (giá VND, cắt ngắn mô tả).</summary>
public static class SeoTextFormat
{
    // Tự dựng NumberFormatInfo thay vì CultureInfo("vi-VN"): ảnh chạy có thể bật InvariantGlobalization,
    // khi đó culture vi-VN không có dữ liệu và dấu nhóm sẽ sai.
    private static readonly NumberFormatInfo VndFormat = new() { NumberGroupSeparator = ".", NumberDecimalSeparator = "," };

    /// <summary>12990000 -> "12.990.000 ₫" (VND nguyên, đã gồm VAT — D01).</summary>
    public static string Vnd(decimal amount) =>
        Math.Round(amount, 0, MidpointRounding.AwayFromZero).ToString("#,##0", VndFormat) + " ₫";

    public static string Truncate(string input, int max) =>
        input.Length <= max ? input : input[..(max - 1)].TrimEnd() + "…";
}
