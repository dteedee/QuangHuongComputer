using System.Net;
using System.Text;
using BuildingBlocks.Seo;

namespace ApiGateway.Seo;

/// <summary>
/// `/sitemap.xml` + `/robots.txt`, generated from the SAME `ISeoPageProvider.EnumerateAsync` the
/// shell uses to answer pages — one source of truth instead of the old `SitemapEndpoints.cs`
/// (deleted by this track), which advertised 5 URLs the SPA never had (`/gioi-thieu` etc. under
/// the wrong paths) because it was hand-maintained separately.
/// </summary>
public static class SeoSitemapRobotsEndpoints
{
    public static async Task<IResult> HandleSitemapAsync(
        IEnumerable<ISeoPageProvider> providers, IConfiguration configuration, CancellationToken ct)
    {
        var siteUrl = configuration["Frontend:Url"];
        if (string.IsNullOrWhiteSpace(siteUrl)) siteUrl = "http://localhost:8080";

        var sb = new StringBuilder();
        sb.Append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.Append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        foreach (var provider in providers)
        {
            await foreach (var entry in provider.EnumerateAsync(ct))
            {
                var loc = WebUtility.HtmlEncode(SeoShellHeadRenderer.AbsoluteUrl(siteUrl, entry.Path));
                sb.Append("  <url><loc>").Append(loc).Append("</loc>");
                if (entry.LastModified is not null)
                {
                    sb.Append("<lastmod>").Append(entry.LastModified.Value.ToString("yyyy-MM-dd")).Append("</lastmod>");
                }
                sb.Append("<changefreq>").Append(entry.ChangeFrequency).Append("</changefreq>");
                sb.Append("<priority>").Append(entry.Priority.ToString("0.0")).Append("</priority>");
                sb.Append("</url>\n");
            }
        }

        sb.Append("</urlset>\n");
        return Results.Content(sb.ToString(), "application/xml; charset=utf-8");
    }

    public static IResult HandleRobots(IConfiguration configuration)
    {
        var siteUrl = configuration["Frontend:Url"];
        if (string.IsNullOrWhiteSpace(siteUrl)) siteUrl = "http://localhost:8080";

        var sb = new StringBuilder();
        sb.Append("User-agent: *\n");
        sb.Append("Allow: /\n");
        // coccocbot is explicitly ALLOWED (D11: Cốc Cốc docs list it, no separate crawl rules needed)
        // — no Disallow block for it, which is itself the allow.
        foreach (var prefix in SeoTemplateOnlyPrefixes.Prefixes)
        {
            sb.Append("Disallow: ").Append(prefix).Append('\n');
        }
        sb.Append('\n');
        sb.Append("Sitemap: ").Append(SeoShellHeadRenderer.AbsoluteUrl(siteUrl, "/sitemap.xml")).Append('\n');

        return Results.Content(sb.ToString(), "text/plain; charset=utf-8");
    }
}
