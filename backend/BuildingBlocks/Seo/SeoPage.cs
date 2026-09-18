namespace BuildingBlocks.Seo;

/// <summary>
/// One resolved SEO answer for a public path (W2-17 / D11). A provider builds this once per
/// request; the ApiGateway shell endpoint turns it into HTTP status + head markup, never the
/// other way round — the provider owns the business decision (found / 404 / redirect / noindex),
/// the shell only renders it.
/// </summary>
public sealed record SeoPage
{
    /// <summary>Real HTTP status to send: 200, 301, 404. Never a client-side "soft" 200 for a miss.</summary>
    public required int Status { get; init; }

    /// <summary>Absolute or root-relative target when <see cref="Status"/> is a redirect (301).</summary>
    public string? RedirectTo { get; init; }

    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;

    /// <summary>Root-relative path (e.g. "/san-pham/laptop-x"); the shell makes it absolute from Frontend:Url.</summary>
    public string CanonicalPath { get; init; } = "/";

    /// <summary>"index,follow" | "noindex,follow" | "noindex,nofollow". Whole-site noindex (dev/no domain) is applied by the shell, not here.</summary>
    public string Robots { get; init; } = "index,follow";

    public string OgType { get; init; } = "website";
    public SeoOgImage? OgImage { get; init; }

    /// <summary>Already-built JSON-LD objects (plain CLR objects/dictionaries), serialized by the shell with System.Text.Json's default encoder.</summary>
    public IReadOnlyList<object> JsonLd { get; init; } = Array.Empty<object>();

    /// <summary>W2-17b only (gated, not shipped this track). Null means "no snapshot" — never render an empty shell.</summary>
    public string? SnapshotHtml { get; init; }

    public static SeoPage NotFound(string canonicalPath) => new()
    {
        Status = 404,
        Title = "Không tìm thấy trang",
        Description = "Trang bạn tìm không tồn tại hoặc đã bị gỡ.",
        CanonicalPath = canonicalPath,
        Robots = "noindex,follow",
    };

    public static SeoPage RedirectPermanent(string to) => new()
    {
        Status = 301,
        RedirectTo = to,
        CanonicalPath = to,
        Robots = "noindex,follow",
    };
}

/// <summary>Open Graph image. Facebook needs width/height declared before it will render a preview (D11 [F2]).</summary>
public sealed record SeoOgImage(string Url, int Width, int Height);

/// <summary>One row of `/sitemap.xml`.</summary>
public sealed record SitemapEntry(string Path, DateTime? LastModified, string ChangeFrequency, decimal Priority);
