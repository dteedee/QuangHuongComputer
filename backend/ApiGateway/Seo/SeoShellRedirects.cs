using BuildingBlocks.Seo;

namespace ApiGateway.Seo;

/// <summary>
/// Turns an admin-managed <see cref="UrlRedirectMatch"/> into the shell's HTTP answer. Runs BEFORE
/// providers and before the template is even loaded: a redirect needs no HTML, so it still works
/// while the web container is down.
/// </summary>
public static class SeoShellRedirects
{
    /// <summary>
    /// Real 301/302 with an absolute Location. Relative targets are made absolute from
    /// <c>Frontend:Url</c>; the incoming query string (utm_*, gclid…) is carried over unless the
    /// target already has its own query.
    /// </summary>
    public static IResult ToRedirect(UrlRedirectMatch match, string siteUrl, string incomingQuery)
    {
        var target = match.Target!;
        var location = target.StartsWith('/') ? SeoShellHeadRenderer.AbsoluteUrl(siteUrl, target) : target;
        if (!string.IsNullOrEmpty(incomingQuery) && incomingQuery != "?" && !location.Contains('?'))
        {
            location += incomingQuery.StartsWith('?') ? incomingQuery : "?" + incomingQuery;
        }

        return Results.Redirect(location, permanent: match.StatusCode == 301);
    }

    /// <summary>410 Gone page: tells Google to drop the URL faster than a 404 would.</summary>
    public static SeoPage GonePage(string path) => new()
    {
        Status = 410,
        Title = "Trang đã bị gỡ",
        Description = "Trang này đã bị gỡ vĩnh viễn khỏi Quang Hưởng Computer.",
        CanonicalPath = path,
        Robots = "noindex,follow",
    };
}
