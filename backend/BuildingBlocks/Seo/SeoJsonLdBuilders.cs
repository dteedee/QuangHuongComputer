namespace BuildingBlocks.Seo;

/// <summary>
/// JSON-LD shapes shared by every provider (home Organization/WebSite, Breadcrumb on every page
/// type). Module-specific shapes (Product/Offer, ItemList, Article, Store) live next to the module
/// that owns the data — see `Catalog/Seo` and `Content/Seo`.
///
/// Every builder returns a plain object graph (anonymous types / Dictionary) — the shell endpoint
/// serializes it with `System.Text.Json`'s default encoder, which escapes `&lt;`/`&gt;`/`&amp;` and
/// makes hand-encoding here unnecessary and error-prone (double-encoding). Never build a JSON-LD
/// string by hand.
/// </summary>
public static class SeoJsonLdBuilders
{
    /// <summary>
    /// Home page only. URLs are root-relative on purpose — providers don't know `Frontend:Url`,
    /// only the shell endpoint does; every root-relative string in the whole JSON-LD graph is made
    /// absolute in one pass by `SeoShellHeadRenderer.AbsolutizeJsonLd` right before it is serialized.
    /// </summary>
    public static object Organization(string name, string? logoUrl, string? phone, IReadOnlyList<string> sameAs)
    {
        var obj = new Dictionary<string, object?>
        {
            ["@context"] = "https://schema.org",
            ["@type"] = "Organization",
            ["name"] = name,
            ["url"] = "/",
        };
        if (!string.IsNullOrWhiteSpace(logoUrl)) obj["logo"] = logoUrl;
        if (!string.IsNullOrWhiteSpace(phone)) obj["telephone"] = phone;
        if (sameAs.Count > 0) obj["sameAs"] = sameAs;
        return obj;
    }

    /// <summary>Home page only. `SearchAction` target is the storefront's own search page (no external search API). `searchPath` is root-relative, e.g. "/tim-kiem".</summary>
    public static object WebSiteWithSearch(string searchPath)
    {
        return new Dictionary<string, object?>
        {
            ["@context"] = "https://schema.org",
            ["@type"] = "WebSite",
            ["url"] = "/",
            ["potentialAction"] = new Dictionary<string, object?>
            {
                ["@type"] = "SearchAction",
                // Absolutized like every other root-relative string (plain concatenation in
                // AbsoluteUrl, not URL-escaped), so the "{search_term_string}" template placeholder
                // survives intact.
                ["target"] = $"{searchPath}?q={{search_term_string}}",
                ["query-input"] = "required name=search_term_string",
            },
        };
    }

    /// <summary>Every page type. <paramref name="crumbs"/> is (name, absolute-or-null-url) in order, root first.</summary>
    public static object BreadcrumbList(IReadOnlyList<(string Name, string? Url)> crumbs)
    {
        var items = new List<object>(crumbs.Count);
        for (var i = 0; i < crumbs.Count; i++)
        {
            var item = new Dictionary<string, object?>
            {
                ["@type"] = "ListItem",
                ["position"] = i + 1,
                ["name"] = crumbs[i].Name,
            };
            if (crumbs[i].Url is not null) item["item"] = crumbs[i].Url;
            items.Add(item);
        }
        return new Dictionary<string, object?>
        {
            ["@context"] = "https://schema.org",
            ["@type"] = "BreadcrumbList",
            ["itemListElement"] = items,
        };
    }
}
