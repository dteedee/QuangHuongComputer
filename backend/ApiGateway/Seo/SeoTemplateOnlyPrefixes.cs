namespace ApiGateway.Seo;

/// <summary>
/// Paths that get the bare template + `noindex`, no DB query at all (D11 §"Architecture"). The
/// FIRST block below is the phase file's own literal list, matched against the W1-8 route manifest
/// (`frontend/src/routes/route-paths.ts` `ROUTES`) exactly — verified against that file on
/// 2026-09-18 — and includes the surviving English aliases `route-renderer.tsx`'s
/// `&lt;Navigate replace&gt;` still serves.
/// </summary>
public static class SeoTemplateOnlyPrefixes
{
    public static readonly IReadOnlyList<string> Prefixes = new[]
    {
        "/backoffice",
        "/admin",
        "/tai-khoan",
        "/gio-hang",
        "/thanh-toan",
        "/tim-kiem",
        "/so-sanh",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        // English aliases kept alive by <Navigate replace> (D11 §2) — no SEO value, template-only.
        "/account",
        "/profile",
        "/cart",
        "/checkout",
        "/search",
        "/compare",

        // NOT in D11's own list, added here deliberately (see report Unresolved section): these
        // ARE real, "index"-flagged public pages (docs/seo-url-contract.md), but their data is
        // owned by the `Repair` module — outside D11's provider assignment (Catalog + Content only)
        // and outside this track's file ownership. Falling them through to the generic 404 default
        // would REGRESS a page that works today into a broken one; that is worse than the noindex
        // gap this causes. Risk Assessment's own words: "A page type is added later without a
        // provider -> falls into the template-only branch... visible but never silently wrong."
        // Filed as an integration request for whichever track next owns Repair/Seo.
        "/bao-hanh",
        "/sua-chua",
        "/xay-dung-cau-hinh", // reserved, not even built yet (seo-url-contract.md) — same reasoning
    };

    public static bool Matches(string path) =>
        Prefixes.Any(prefix => path.Equals(prefix, StringComparison.OrdinalIgnoreCase)
            || path.StartsWith(prefix + "/", StringComparison.OrdinalIgnoreCase));
}
