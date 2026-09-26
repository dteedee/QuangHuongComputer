using BuildingBlocks.Seo;
using Microsoft.AspNetCore.OutputCaching;

namespace ApiGateway.Seo;

/// <summary>
/// `MapSeoShell()` — the integration point W1-4 already has a call site pending for in
/// `Program.cs` (currently still calling `Catalog.SitemapEndpoints.MapSitemapEndpoints()`, which
/// this track deletes — see integration-requests-w2.md). Maps:
///   · `GET|HEAD /_shell/{**path}` — anonymous, real HTTP status, cached 120s (`seo-shell` policy)
///   · `GET /sitemap.xml`, `GET /robots.txt` — generated from the same providers as the pages
/// The external `/_shell*` block (so a direct hit from outside can never rewrite-stack into
/// `/_shell/_shell/...`) is an edge concern — see `deploy/Caddyfile`.
/// </summary>
public static class SeoShellEndpoints
{
    public static void MapSeoShell(this IEndpointRouteBuilder app)
    {
        app.MapMethods("/_shell/{**path}", new[] { "GET", "HEAD" }, HandleShellAsync)
            .AllowAnonymous()
            .CacheOutput(SeoOutputCachePolicy.PolicyName);

        app.MapGet("/sitemap.xml", SeoSitemapRobotsEndpoints.HandleSitemapAsync)
            .AllowAnonymous()
            .CacheOutput(SeoOutputCachePolicy.PolicyName);

        app.MapGet("/robots.txt", SeoSitemapRobotsEndpoints.HandleRobots)
            .AllowAnonymous()
            .CacheOutput(SeoOutputCachePolicy.PolicyName);
    }

    private static async Task<IResult> HandleShellAsync(
        HttpContext ctx,
        IEnumerable<ISeoPageProvider> providers,
        IUrlRedirectResolver redirects,
        SeoShellTemplateLoader templateLoader,
        IConfiguration configuration,
        CancellationToken ct)
    {
        var rawPath = ctx.Request.RouteValues["path"] as string ?? string.Empty;
        var path = "/" + rawPath.TrimStart('/');
        if (path.Length > 1 && path.EndsWith('/')) path = path.TrimEnd('/');
        var query = ctx.Request.QueryString.Value ?? string.Empty;

        var siteUrl = configuration["Frontend:Url"];
        if (string.IsNullOrWhiteSpace(siteUrl))
        {
            siteUrl = $"{ctx.Request.Scheme}://{ctx.Request.Host}"; // last-resort fallback only — Frontend:Url should always be set (W1-5)
        }
        // D11: no real domain configured yet -> the whole site answers noindex so a placeholder
        // localhost URL is never indexed by accident.
        var siteWideNoindex = siteUrl.Contains("localhost", StringComparison.OrdinalIgnoreCase);

        // Admin-managed redirect table FIRST (docs/seo-shell.md "Redirect manager"): an old URL gets a
        // real 301/302 (or 410) before any provider or the template is touched.
        var redirect = await redirects.MatchAsync(path, ct);
        if (redirect is not null)
        {
            redirects.RecordHit(redirect.Id);
            if (redirect.StatusCode != 410 && redirect.Target is not null)
            {
                return SeoShellRedirects.ToRedirect(redirect, siteUrl, query);
            }
        }

        var page = redirect?.StatusCode == 410
            ? SeoShellRedirects.GonePage(path)
            : await ResolvePageAsync(providers, path, query, ct);

        var template = await templateLoader.LoadAsync(ct);
        if (template is null)
        {
            // No template reachable at all — never invent a page. The edge falls back to static
            // index.html for this response (Caddyfile `handle_errors`/`handle_response`).
            return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        if (page.Status == 301 && page.RedirectTo is not null)
        {
            return Results.Redirect(SeoShellHeadRenderer.AbsoluteUrl(siteUrl, page.RedirectTo), permanent: true);
        }

        var headHtml = SeoShellHeadRenderer.RenderHead(page, siteUrl, siteWideNoindex);
        var html = SeoShellMarkerReplacer.InjectHead(template, headHtml);
        if (page.SnapshotHtml is not null)
        {
            html = SeoShellMarkerReplacer.InjectBody(html, page.SnapshotHtml);
        }

        return Results.Content(html, "text/html; charset=utf-8", statusCode: page.Status);
    }

    private static async Task<SeoPage> ResolvePageAsync(IEnumerable<ISeoPageProvider> providers, string path, string query, CancellationToken ct)
    {
        foreach (var provider in providers)
        {
            if (!provider.TryMatch(path)) continue;
            var resolved = await provider.ResolveAsync(path, query, ct);
            if (resolved is not null) return resolved;
            break; // provider claimed the path but found nothing -> a real 404, not "try the next provider"
        }

        if (SeoTemplateOnlyPrefixes.Matches(path))
        {
            return new SeoPage
            {
                Status = 200,
                Title = "Quang Hưởng Computer",
                Description = "Quang Hưởng Computer - máy tính chính hãng, dịch vụ tận tâm.",
                CanonicalPath = path,
                Robots = "noindex,nofollow",
            };
        }

        return SeoPage.NotFound(path);
    }
}
