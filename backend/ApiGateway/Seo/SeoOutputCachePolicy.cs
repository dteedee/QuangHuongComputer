using Microsoft.AspNetCore.OutputCaching;

namespace ApiGateway.Seo;

/// <summary>
/// Output-cache policy for `/_shell/**`. Cache key = normalized path + `page` + ONE `filtered`
/// flag (D11 §"Key Insights"): dropping the whole query string would make `/danh-muc/laptop` and
/// `/danh-muc/laptop?brand=asus` share one cache entry, and the `noindex,follow` rule for filtered
/// listings could never actually differ between them. Unknown query params (`utm_*`, `fbclid`, …)
/// neither enter the key nor flip the flag — a shared link with tracking params must not fragment
/// the cache.
///
/// A response carrying `Set-Cookie` is never cached — enforced by never setting one on `/_shell`
/// responses in the first place (the shell endpoint is anonymous and stateless), not by this policy.
/// </summary>
public sealed class SeoOutputCachePolicy : IOutputCachePolicy
{
    public const string PolicyName = "seo-shell";

    /// <summary>Query keys that change the RESULT (sorting/filtering a listing) — everything else is noise for the cache key.</summary>
    private static readonly string[] FilterKeys = { "brand", "min-price", "max-price", "sort", "specs", "rating", "in-stock" };

    public ValueTask CacheRequestAsync(OutputCacheContext context, CancellationToken ct)
    {
        var request = context.HttpContext.Request;

        if (request.Method != HttpMethods.Get && request.Method != HttpMethods.Head)
        {
            context.EnableOutputCaching = false;
            return ValueTask.CompletedTask;
        }

        context.EnableOutputCaching = true;
        // Tagged so a redirect-table write can evict every shell entry at once (a cached 200 for a
        // path that now redirects would otherwise outlive the change by up to CacheSeconds).
        context.Tags.Add(BuildingBlocks.Seo.SeoOutputCacheTags.Shell);
        context.AllowCacheLookup = true;
        context.AllowCacheStorage = true;
        context.ResponseExpirationTimeSpan = TimeSpan.FromSeconds(context.HttpContext.RequestServices
            .GetRequiredService<Microsoft.Extensions.Options.IOptions<SeoShellOptions>>().Value.CacheSeconds);

        var filtered = request.Query.Keys.Any(k => FilterKeys.Contains(k, StringComparer.OrdinalIgnoreCase)) ? "1" : "0";

        // "page" varies the cache key via QueryKeys; "filtered" is a derived flag, not a raw query
        // value, so it goes in VaryByValues instead — together they are the whole key (D11).
        context.CacheVaryByRules.QueryKeys = new[] { "page" };
        context.CacheVaryByRules.VaryByValues["filtered"] = filtered;

        return ValueTask.CompletedTask;
    }

    public ValueTask ServeFromCacheAsync(OutputCacheContext context, CancellationToken ct) => ValueTask.CompletedTask;

    public ValueTask ServeResponseAsync(OutputCacheContext context, CancellationToken ct)
    {
        var response = context.HttpContext.Response;
        if (response.Headers.ContainsKey("Set-Cookie"))
        {
            context.AllowCacheStorage = false;
        }
        // Redirects / 410 are never stored: they are one dictionary lookup to recompute, and serving
        // them from cache would skip the redirect hit counter.
        if (response.StatusCode is StatusCodes.Status301MovedPermanently or StatusCodes.Status302Found
            or StatusCodes.Status410Gone)
        {
            context.AllowCacheStorage = false;
        }
        return ValueTask.CompletedTask;
    }
}
