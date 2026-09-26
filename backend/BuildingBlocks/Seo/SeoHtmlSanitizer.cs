using System.Net;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using System.Text.Unicode;

namespace BuildingBlocks.Seo;

/// <summary>
/// Bộ lọc HTML allow-list cho thân bài viết trong SEO shell. KHÔNG sửa HTML đầu vào mà dựng lại
/// markup mới từ đầu: thẻ ngoài danh sách bị bỏ (giữ chữ bên trong), mọi thuộc tính bị bỏ trừ
/// <c>href</c> đã kiểm scheme trên <c>&lt;a&gt;</c>, chữ được decode rồi encode lại, thẻ nguy hiểm
/// bị xoá cả nội dung, thẻ mở/đóng luôn cân. Tương đương vai trò của DOMPurify trong
/// <c>SafeHtml</c> phía SPA, nhưng hẹp hơn — đây chỉ là bản xem trước cho bot.
/// </summary>
public static partial class SeoHtmlSanitizer
{
    private static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        "p", "br", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "u",
        "blockquote", "a", "table", "thead", "tbody", "tr", "th", "td",
    };

    // Xoá luôn phần nội dung — chữ bên trong không phải nội dung đọc được (mã, style, nhúng).
    private static readonly HashSet<string> DropWithContent = new(StringComparer.OrdinalIgnoreCase)
    {
        "script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math",
        "textarea", "select", "head", "title", "frameset", "applet",
    };

    // H1 thuộc về trang (renderer đã có một H1) — hạ cấp heading trong bài, H5/H6 về H4.
    private static readonly Dictionary<string, string> Renamed = new(StringComparer.OrdinalIgnoreCase)
    {
        ["h1"] = "h2", ["h5"] = "h4", ["h6"] = "h4",
    };

    [GeneratedRegex(@"<!--.*?(-->|$)|<!\[CDATA\[.*?(\]\]>|$)|<![^>]*>|<\?[^>]*>|<(?<close>/?)(?<name>[a-zA-Z][a-zA-Z0-9]*)(?<attrs>(?:""[^""]*""|'[^']*'|[^'"">])*)>", RegexOptions.Singleline)]
    private static partial Regex TagPattern();

    [GeneratedRegex(@"(?:^|\s)href\s*=\s*(?:""(?<v>[^""]*)""|'(?<v>[^']*)'|(?<v>[^\s""'>]+))", RegexOptions.IgnoreCase)]
    private static partial Regex HrefPattern();

    // Encode ký tự nhạy cảm HTML nhưng GIỮ chữ tiếng Việt đọc được (WebUtility.HtmlEncode biến
    // "à", "é", ... thành &#224; — hợp lệ nhưng phình và khó soát khi debug).
    private static readonly HtmlEncoder Encoder = HtmlEncoder.Create(UnicodeRanges.All);

    /// <summary>HTML-encode một chuỗi dữ liệu (text node hoặc giá trị thuộc tính trong ngoặc kép).</summary>
    public static string Encode(string? value) => Encoder.Encode(value ?? string.Empty);

    public static SanitizedHtml Sanitize(string? html)
    {
        var output = new StringBuilder();
        var open = new List<string>();
        var source = html ?? string.Empty;
        var position = 0;

        while (position < source.Length)
        {
            var match = TagPattern().Match(source, position);
            if (!match.Success)
            {
                AppendText(output, source[position..]);
                break;
            }

            AppendText(output, source[position..match.Index]);
            position = match.Index + match.Length;
            if (!match.Groups["name"].Success) continue; // comment / doctype / CDATA / PI

            var name = match.Groups["name"].Value.ToLowerInvariant();
            var closing = match.Groups["close"].Value == "/";

            if (DropWithContent.Contains(name))
            {
                if (!closing) position = SkipPastClosing(source, position, name);
                continue;
            }

            if (Renamed.TryGetValue(name, out var renamed)) name = renamed;
            if (!Allowed.Contains(name)) continue;

            if (name == "br")
            {
                output.Append("<br>");
            }
            else if (closing)
            {
                var index = open.LastIndexOf(name);
                if (index < 0) continue; // đóng thẻ chưa từng mở -> bỏ
                for (var i = open.Count - 1; i >= index; i--) output.Append("</").Append(open[i]).Append('>');
                open.RemoveRange(index, open.Count - index);
            }
            else
            {
                output.Append('<').Append(name);
                if (name == "a") AppendHref(output, match.Groups["attrs"].Value);
                output.Append('>');
                open.Add(name);
            }
        }

        for (var i = open.Count - 1; i >= 0; i--) output.Append("</").Append(open[i]).Append('>');
        return new SanitizedHtml(output.ToString());
    }

    /// <summary>Văn bản thuần (qua bộ lọc trước để bỏ cả NỘI DUNG script/style, rồi bỏ thẻ, gộp khoảng trắng).</summary>
    public static string ToPlainText(string? html)
    {
        var text = Regex.Replace(Sanitize(html).Value, "<[^>]*>", " ");
        text = WebUtility.HtmlDecode(text);
        return Regex.Replace(text, @"\s+", " ").Trim();
    }

    private static void AppendText(StringBuilder output, string raw)
    {
        if (raw.Length == 0) return;
        output.Append(Encode(WebUtility.HtmlDecode(raw)));
    }

    private static int SkipPastClosing(string source, int from, string name)
    {
        var closeTag = "</" + name;
        var index = source.IndexOf(closeTag, from, StringComparison.OrdinalIgnoreCase);
        if (index < 0) return source.Length;
        var end = source.IndexOf('>', index);
        return end < 0 ? source.Length : end + 1;
    }

    private static void AppendHref(StringBuilder output, string attrs)
    {
        var match = HrefPattern().Match(attrs);
        if (!match.Success) return;
        var href = WebUtility.HtmlDecode(match.Groups["v"].Value).Trim();
        if (!IsSafeHref(href)) return;
        output.Append(" href=\"").Append(Encode(href)).Append('"');
        if (!href.StartsWith('/')) output.Append(" rel=\"nofollow noopener\"");
    }

    /// <summary>Chỉ đường dẫn gốc ("/x", không "//") hoặc http(s)/mailto/tel — chặn javascript:, data:, vbscript:.</summary>
    public static bool IsSafeHref(string href)
    {
        if (href.Length == 0 || href.Any(char.IsControl)) return false;
        if (href.StartsWith('/')) return !href.StartsWith("//") && !href.StartsWith("/\\");
        return href.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            || href.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || href.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase)
            || href.StartsWith("tel:", StringComparison.OrdinalIgnoreCase);
    }
}
