using System.Text;

namespace ApiGateway.Seo;

/// <summary>
/// Splices rendered head/body markup into the SPA template using the marker contract W1-7 baked
/// into `index.html`: `&lt;!--seo:head--&gt;...&lt;!--/seo:head--&gt;` wraps the default
/// title/description/OG so the shell can replace the whole block, and `&lt;!--seo:body--&gt;`
/// plus `&lt;!-- /seo:body --&gt;` sit inside `#root` for the server-rendered body fragment.
/// If a marker is missing (template drifted), falls back to inserting before `&lt;/head&gt;` so a
/// broken marker degrades to "extra head tags" instead of "no SEO shell at all".
/// </summary>
public static class SeoShellMarkerReplacer
{
    // Actual markers baked into frontend/index.html by W1-7 have spaces around the token
    // ("<!-- seo:head -->", not "<!--seo:head-->" as the phase file's prose abbreviates it).
    private const string HeadStart = "<!-- seo:head -->";
    private const string HeadEnd = "<!-- /seo:head -->";
    private const string BodyMarker = "<!-- seo:body -->";
    private const string BodyEndMarker = "<!-- /seo:body -->";

    public static string InjectHead(string template, string headHtml)
    {
        var start = template.IndexOf(HeadStart, StringComparison.Ordinal);
        var end = template.IndexOf(HeadEnd, StringComparison.Ordinal);
        if (start >= 0 && end > start)
        {
            var before = template[..(start + HeadStart.Length)];
            var after = template[end..];
            return before + headHtml + after;
        }

        var headClose = template.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        if (headClose < 0) return template; // no <head> at all — template is not real HTML, leave untouched
        return template[..headClose] + headHtml + template[headClose..];
    }

    /// <summary>
    /// Replaces everything between `&lt;!-- seo:body --&gt;` and `&lt;!-- /seo:body --&gt;` (the
    /// template's explanatory comment) with <paramref name="bodyHtml"/>. No end marker (older
    /// template) -> inserts right after the start marker. No start marker -> template untouched:
    /// the body fragment is an extra for bots, never worth breaking the page for.
    /// </summary>
    public static string InjectBody(string template, string bodyHtml)
    {
        var start = template.IndexOf(BodyMarker, StringComparison.Ordinal);
        if (start < 0) return template;
        var contentStart = start + BodyMarker.Length;
        var end = template.IndexOf(BodyEndMarker, contentStart, StringComparison.Ordinal);
        var resumeAt = end >= 0 ? end : contentStart;
        var sb = new StringBuilder(template.Length + bodyHtml.Length);
        sb.Append(template, 0, contentStart);
        sb.Append(bodyHtml);
        sb.Append(template, resumeAt, template.Length - resumeAt);
        return sb.ToString();
    }
}
