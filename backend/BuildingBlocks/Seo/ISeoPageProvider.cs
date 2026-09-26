namespace BuildingBlocks.Seo;

/// <summary>
/// One module's slice of the public URL space (W2-17 / D11). Each module registers its own
/// provider(s) the same way it already registers everything else — inside its own
/// `Add&lt;Module&gt;Module()` — there is no `I&lt;Module&gt;Submodule` marker interface anywhere
/// in this codebase and this does not introduce one.
///
/// Providers are read-only: they query their module's DbContext (never write) and apply that
/// module's public-visibility predicate (e.g. <c>ProductPublicationPolicy.WherePublished</c>,
/// <c>Post.PublishedPredicate</c>) themselves — the shell endpoint does not know what "published"
/// means for any given entity.
/// </summary>
public interface ISeoPageProvider
{
    /// <summary>Cheap, synchronous, no DB: does this provider even claim this root-relative path?</summary>
    bool TryMatch(string path);

    /// <summary>
    /// Resolves the page. <paramref name="query"/> carries the raw query string (used only to
    /// decide `noindex,follow` for filtered listings — never trusted for anything else).
    /// Null means "TryMatch lied" (defensive) — the shell treats null the same as no provider
    /// having matched, i.e. falls through to 404.
    /// </summary>
    Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct);

    /// <summary>
    /// True for a catch-all provider (e.g. CMS pages at `/{slug}`): the shell asks it only after every
    /// specific provider AND the template-only prefix list declined the path, so it can never shadow
    /// a real route. Default false.
    /// </summary>
    bool IsFallback => false;

    /// <summary>Every indexable URL this provider is responsible for, for `/sitemap.xml`.</summary>
    IAsyncEnumerable<SitemapEntry> EnumerateAsync(CancellationToken ct);
}
