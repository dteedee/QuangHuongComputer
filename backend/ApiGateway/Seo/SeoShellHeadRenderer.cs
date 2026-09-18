using System.Net;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using BuildingBlocks.Seo;

namespace ApiGateway.Seo;

/// <summary>
/// Turns a resolved <see cref="SeoPage"/> into the markup that replaces the
/// `&lt;!-- seo:head --&gt;` block. Every DB-sourced string goes through <see cref="WebUtility.HtmlEncode"/>;
/// JSON-LD goes through `System.Text.Json`'s DEFAULT encoder (escapes `&lt;`/`&gt;`/`&amp;`/quotes) — never
/// string-concatenated by hand. Canonical/OG URLs are always absolute, built from `Frontend:Url`, never `Host`.
/// </summary>
public static class SeoShellHeadRenderer
{
    // System.Text.Json's DEFAULT JavaScriptEncoder (JavaScriptEncoder.Default, used when no
    // JsonSerializerOptions.Encoder is set) already escapes HTML-unsafe characters — that default
    // is what the phase file means by "encoded by System.Text.Json". Kept explicit here so a future
    // edit that adds `Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping` (a common "fix" for
    // Vietnamese diacritics, which do NOT need escaping) cannot silently reopen the XSS hole.
    private static readonly JsonSerializerOptions JsonLdOptions = new()
    {
        Encoder = JavaScriptEncoder.Default,
        WriteIndented = false,
    };

    public static string RenderHead(SeoPage page, string siteUrl, bool siteWideNoindex)
    {
        var sb = new StringBuilder();
        var canonical = AbsoluteUrl(siteUrl, page.CanonicalPath);
        var robots = siteWideNoindex ? "noindex,nofollow" : page.Robots;

        sb.Append("<title>").Append(WebUtility.HtmlEncode(page.Title)).Append("</title>\n");
        sb.Append("<meta name=\"description\" content=\"").Append(WebUtility.HtmlEncode(page.Description)).Append("\" />\n");
        sb.Append("<meta name=\"robots\" content=\"").Append(WebUtility.HtmlEncode(robots)).Append("\" />\n");
        sb.Append("<link rel=\"canonical\" href=\"").Append(WebUtility.HtmlEncode(canonical)).Append("\" />\n");

        sb.Append("<meta property=\"og:type\" content=\"").Append(WebUtility.HtmlEncode(page.OgType)).Append("\" />\n");
        sb.Append("<meta property=\"og:title\" content=\"").Append(WebUtility.HtmlEncode(page.Title)).Append("\" />\n");
        sb.Append("<meta property=\"og:description\" content=\"").Append(WebUtility.HtmlEncode(page.Description)).Append("\" />\n");
        sb.Append("<meta property=\"og:url\" content=\"").Append(WebUtility.HtmlEncode(canonical)).Append("\" />\n");
        sb.Append("<meta property=\"og:site_name\" content=\"Quang Hưởng Computer\" />\n");
        sb.Append("<meta property=\"og:locale\" content=\"vi_VN\" />\n");

        // Product/media photos have no stored width/height (ProductMedia carries no dimension
        // columns) — declaring width/height we have not verified would be exactly the kind of
        // fabricated data D12 forbids, and Facebook's own doc [F2] says the crawler needs an
        // ACCURATE size. Falls back to the branded default (public/brand/og-default.png, a real
        // 1200x630 PNG) whenever the page did not supply a verified image.
        var ogImage = page.OgImage ?? SeoDefaults.DefaultOgImage;
        var absoluteImage = AbsoluteUrl(siteUrl, ogImage.Url);
        sb.Append("<meta property=\"og:image\" content=\"").Append(WebUtility.HtmlEncode(absoluteImage)).Append("\" />\n");
        sb.Append("<meta property=\"og:image:width\" content=\"").Append(ogImage.Width).Append("\" />\n");
        sb.Append("<meta property=\"og:image:height\" content=\"").Append(ogImage.Height).Append("\" />\n");

        foreach (var jsonLd in page.JsonLd)
        {
            var absolutized = AbsolutizeJsonLd(jsonLd, siteUrl);
            sb.Append("<script type=\"application/ld+json\">")
              .Append(JsonSerializer.Serialize(absolutized, JsonLdOptions))
              .Append("</script>\n");
        }

        return sb.ToString();
    }

    /// <summary>
    /// Providers build JSON-LD with root-relative URLs (same convention as every other field on
    /// <see cref="SeoPage"/> — they don't know `Frontend:Url`, only the shell endpoint does). This
    /// walks the object graph (our builders only ever emit `Dictionary&lt;string, object?&gt;` /
    /// `IEnumerable&lt;object&gt;` / scalars — see `SeoJsonLdBuilders` and the module builders) and
    /// makes every string that starts with `/` absolute. Schema.org properties are URLs or plain
    /// text/numbers; none of our Vietnamese copy legitimately starts with `/`.
    /// </summary>
    private static object? AbsolutizeJsonLd(object? node, string siteUrl)
    {
        switch (node)
        {
            case string s when s.StartsWith('/'):
                return AbsoluteUrl(siteUrl, s);
            case IDictionary<string, object?> dict:
                var copy = new Dictionary<string, object?>(dict.Count);
                foreach (var (key, value) in dict) copy[key] = AbsolutizeJsonLd(value, siteUrl);
                return copy;
            case IEnumerable<object> list:
                return list.Select(item => AbsolutizeJsonLd(item, siteUrl)).ToList();
            default:
                return node;
        }
    }

    /// <summary>Root-relative or already-absolute path -> absolute URL from `Frontend:Url`. Never from the `Host` header (D11).</summary>
    public static string AbsoluteUrl(string siteUrl, string pathOrUrl)
    {
        if (Uri.TryCreate(pathOrUrl, UriKind.Absolute, out var abs)) return abs.ToString();
        var baseUrl = siteUrl.TrimEnd('/');
        var path = pathOrUrl.StartsWith('/') ? pathOrUrl : "/" + pathOrUrl;
        return baseUrl + path;
    }
}
