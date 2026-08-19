using System.Text;

namespace InventoryModule.Barcode;

/// <summary>
/// Sinh SVG mã vạch Code128 (Code Set B) đúng chuẩn — dùng bảng độ rộng vạch/khoảng trắng thật,
/// tính checksum modulo 103. Hỗ trợ ký tự ASCII 32–126 (đủ cho SKU chữ + số + ký tự thông dụng).
/// </summary>
public static class Code128Encoder
{
    private const int StartCodeB = 104;
    private const int StopCode = 106;
    private const int CodeBOffset = 32; // Code Set B: giá trị mã = mã ASCII - 32

    // Mỗi phần tử: chuỗi 6 số biểu diễn độ rộng luân phiên vạch đen/trắng (đơn vị module) cho mã 0..106.
    // Nguồn: bảng ký hiệu Code128 chuẩn (ISO/IEC 15417), xác minh qua Wikipedia "Code 128" symbol values table.
    private static readonly string[] Patterns =
    {
        "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
        "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
        "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
        "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
        "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
        "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
        "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
        "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
        "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
        "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
        "114131","311141","411131","211412","211214","211232","233111"
    };

    /// <summary>Tính mã kiểm tra Code Set B chuẩn: (start + Σ(giá trị_i * vị_trí_i)) mod 103.</summary>
    public static int ComputeCheckDigit(IReadOnlyList<int> codes)
    {
        var sum = StartCodeB;
        for (var i = 0; i < codes.Count; i++)
        {
            sum += codes[i] * (i + 1);
        }
        return sum % 103;
    }

    /// <summary>
    /// Chuyển text (ASCII in-được 32-126) thành SVG mã vạch Code128B với checksum thật.
    /// </summary>
    public static string ToSvg(string text, int height = 60, int moduleWidth = 2)
    {
        var printable = new string(text.Where(c => c >= 32 && c <= 126).ToArray());
        if (printable.Length == 0) printable = "0000000000";

        var codes = printable.Select(c => (int)c - CodeBOffset).ToList();
        var checkDigit = ComputeCheckDigit(codes);

        var allSymbols = new List<int> { StartCodeB };
        allSymbols.AddRange(codes);
        allSymbols.Add(checkDigit);
        allSymbols.Add(StopCode);

        var bars = new StringBuilder();
        var x = 0;
        var isBlack = true; // Code128 luôn bắt đầu bằng vạch đen

        foreach (var symbol in allSymbols)
        {
            var pattern = SafePattern(symbol);
            foreach (var widthChar in pattern)
            {
                var width = (widthChar - '0') * moduleWidth;
                if (isBlack && width > 0)
                {
                    bars.Append($"<rect x='{x}' y='0' width='{width}' height='{height}' fill='black'/>");
                }
                x += width;
                isBlack = !isBlack;
            }
        }

        // Stop symbol có thêm 1 vạch đen phụ rộng 2 module theo chuẩn Code128.
        var stopBarWidth = 2 * moduleWidth;
        bars.Append($"<rect x='{x}' y='0' width='{stopBarWidth}' height='{height}' fill='black'/>");
        x += stopBarWidth;

        var totalWidth = x + 20;
        var safeText = HtmlEncode(text);

        return $@"<svg xmlns='http://www.w3.org/2000/svg' width='{totalWidth}' height='{height + 20}'>
  <rect width='{totalWidth}' height='{height}' fill='white'/>
  <g transform='translate(10,0)'>{bars}</g>
  <text x='{totalWidth / 2}' y='{height + 15}' text-anchor='middle' font-family='monospace' font-size='10'>{safeText}</text>
</svg>";
    }

    private static string SafePattern(int symbol) =>
        symbol >= 0 && symbol < Patterns.Length ? Patterns[symbol] : Patterns[0];

    private static string HtmlEncode(string value) =>
        value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");
}
