using System.Text;

namespace ApiGateway.Seo;

/// <summary>
/// Splices rendered head/body markup into the SPA template using the marker contract W1-7 baked
/// into `index.html`: `&lt;!--seo:head--&gt;...&lt;!--/seo:head--&gt;` wraps the default
/// title/description/OG so the shell can replace the whole block, and `&lt;!--seo:body--&gt;`
/// sits inside `#root` for a W2-17b snapshot (not used this track — 17b is gated on CLS).
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

    /// <summary>W2-17b only. Not called this track (SnapshotHtml is always null on every SeoPage produced today).</summary>
    public static string InjectBody(string template, string snapshotHtml)
    {
        var marker = template.IndexOf(BodyMarker, StringComparison.Ordinal);
        if (marker < 0) return template;
        var sb = new StringBuilder(template.Length + snapshotHtml.Length);
        sb.Append(template, 0, marker + BodyMarker.Length);
        sb.Append(snapshotHtml);
        sb.Append(template, marker + BodyMarker.Length, template.Length - marker - BodyMarker.Length);
        return sb.ToString();
    }
}
