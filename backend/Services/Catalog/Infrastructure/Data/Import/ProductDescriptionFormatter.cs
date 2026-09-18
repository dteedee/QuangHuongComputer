using System.Net;
using System.Text.RegularExpressions;

namespace Catalog.Infrastructure.Data.Import;

/// <summary>
/// The dataset carries both a plain <c>shortDescription</c> and a rich <c>descriptionHtml</c>,
/// but <c>Products.Description</c> is one column and the storefront renders it as TEXT
/// (<c>product-description-tab.tsx</c> interpolates <c>{description}</c> inside a
/// <c>whitespace-pre-line</c> paragraph - it does NOT set inner HTML).
///
/// Writing raw markup into that column would show customers literal &lt;h3&gt; tags, so the
/// importer flattens the HTML into readable text with real line breaks and keeps the original
/// markup untouched in <c>Products.Attributes.descriptionHtml</c> for whoever renders rich
/// content later (sanitised at that point, not here).
/// </summary>
public static class ProductDescriptionFormatter
{
    private static readonly Regex Heading = new(@"<h[1-6][^>]*>(.*?)</h[1-6]>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
    private static readonly Regex Paragraph = new(@"<p[^>]*>(.*?)</p>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
    private static readonly Regex ListItem = new(@"<li[^>]*>(.*?)</li>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
    private static readonly Regex LineBreak = new(@"<br\s*/?>", RegexOptions.IgnoreCase);
    private static readonly Regex AnyTag = new(@"<[^>]+>", RegexOptions.Singleline);
    private static readonly Regex ManyBlankLines = new(@"\n{3,}");
    private static readonly Regex ManySpaces = new(@"[ \t]{2,}");

    /// <summary>Plain text for <c>Products.Description</c>: short blurb, then the flattened body.</summary>
    public static string Build(string? shortDescription, string? descriptionHtml)
    {
        var blurb = (shortDescription ?? string.Empty).Trim();
        var body = HtmlToText(descriptionHtml);

        if (blurb.Length == 0) return body;
        if (body.Length == 0) return blurb;

        // Do not repeat the blurb when the HTML already opens with it.
        if (body.StartsWith(blurb, StringComparison.Ordinal)) return body;
        return blurb + "\n\n" + body;
    }

    public static string HtmlToText(string? html)
    {
        if (string.IsNullOrWhiteSpace(html)) return string.Empty;

        var text = html;
        text = Heading.Replace(text, m => "\n\n" + m.Groups[1].Value.Trim() + "\n");
        text = ListItem.Replace(text, m => "\n• " + m.Groups[1].Value.Trim());
        text = Paragraph.Replace(text, m => "\n" + m.Groups[1].Value.Trim() + "\n");
        text = LineBreak.Replace(text, "\n");
        text = AnyTag.Replace(text, string.Empty);
        text = WebUtility.HtmlDecode(text);

        text = text.Replace("\r\n", "\n").Replace('\r', '\n');
        text = ManySpaces.Replace(text, " ");
        text = string.Join('\n', text.Split('\n').Select(l => l.TrimEnd()));
        text = ManyBlankLines.Replace(text, "\n\n");
        return text.Trim();
    }
}
