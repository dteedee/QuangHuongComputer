namespace BuildingBlocks.Seo;

/// <summary>
/// Admin-managed URL redirect table (301/302/410), consulted by the SEO shell BEFORE any
/// <see cref="ISeoPageProvider"/> runs, so an old URL answers with a real HTTP redirect for crawlers
/// and humans alike. Implemented by the Content module (in-memory copy of the active table); the
/// contract lives here so the shell in ApiGateway does not depend on Content internals.
/// </summary>
public interface IUrlRedirectResolver
{
    /// <summary>
    /// Looks up <paramref name="path"/> (any casing, trailing slash, no query) in the active table.
    /// Never throws and never blocks on anything but the first load of the table: a broken redirect
    /// table must degrade to "no redirect", not take the storefront down.
    /// </summary>
    ValueTask<UrlRedirectMatch?> MatchAsync(string path, CancellationToken ct);

    /// <summary>Fire-and-forget hit counter. Queued in memory and flushed in batches; never awaits I/O.</summary>
    void RecordHit(Guid redirectId);
}

/// <summary>
/// One resolved redirect. <see cref="Target"/> is root-relative ("/san-pham/x", may carry its own
/// query) or an absolute http(s) URL; null for 410 Gone. <see cref="Hops"/> &gt; 1 means the stored
/// table held a chain that was collapsed at read time so the client still gets ONE hop.
/// </summary>
public sealed record UrlRedirectMatch(Guid Id, string FromPath, int StatusCode, string? Target, int Hops = 1);

/// <summary>
/// Hook a module calls after it changed a public slug (product, category), so the old URL keeps its
/// ranking through an automatic 301. Optional: callers resolve it with <c>GetService</c> and skip
/// silently when no implementation is registered (unit tests, tools).
/// </summary>
public interface ISlugRedirectRecorder
{
    /// <param name="changes">Old public path -&gt; new public path, both root-relative.</param>
    Task RecordAsync(IReadOnlyList<SlugPathChange> changes, string? actorId, CancellationToken ct);
}

/// <summary>One slug rename expressed as public paths, e.g. "/san-pham/old" -&gt; "/san-pham/new".</summary>
public sealed record SlugPathChange(string OldPath, string NewPath, string Source);

/// <summary>Output-cache tags shared between the shell (which tags its entries) and writers that must evict them.</summary>
public static class SeoOutputCacheTags
{
    /// <summary>Every `/_shell/**`, `/sitemap.xml` and `/robots.txt` entry carries this tag.</summary>
    public const string Shell = "seo-shell";
}
