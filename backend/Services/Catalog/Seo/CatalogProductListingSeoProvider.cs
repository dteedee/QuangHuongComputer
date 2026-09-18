using BuildingBlocks.Seo;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Seo;

/// <summary>`/san-pham` (+ `?page=`, filters) — the "all products" listing, same filtered/noindex rule as a category page.</summary>
public sealed class CatalogProductListingSeoProvider : ISeoPageProvider
{
    private const string Path = "/san-pham";
    private static readonly string[] FilterKeys = { "brand", "min-price", "max-price", "sort", "specs", "rating", "in-stock", "category" };
    private const int PageSize = 24;

    private readonly CatalogDbContext _db;
    private readonly CatalogJsonLdBuilder _jsonLd;

    public CatalogProductListingSeoProvider(CatalogDbContext db, CatalogJsonLdBuilder jsonLd)
    {
        _db = db;
        _jsonLd = jsonLd;
    }

    public bool TryMatch(string path) => path == Path;

    public async Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct)
    {
        var parsedQuery = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(query);
        var isFiltered = parsedQuery.Keys.Any(k => FilterKeys.Contains(k, StringComparer.OrdinalIgnoreCase));
        var page = parsedQuery.TryGetValue("page", out var pageValues) && int.TryParse(pageValues.ToString(), out var p) && p > 1 ? p : 1;

        var total = await _db.Products.WherePublished().CountAsync(ct);
        var products = await _db.Products.WherePublished()
            .OrderByDescending(pr => pr.PublishedAt)
            .Skip((page - 1) * PageSize)
            .Take(PageSize)
            .ToListAsync(ct);

        var canonicalPath = page > 1 ? $"{Path}?page={page}" : Path;

        return new SeoPage
        {
            Status = 200,
            Title = "Sản phẩm - Quang Hưởng Computer",
            Description = $"Toàn bộ {total} sản phẩm chính hãng tại Quang Hưởng Computer: laptop, PC, linh kiện máy tính.",
            CanonicalPath = canonicalPath,
            Robots = isFiltered ? "noindex,follow" : "index,follow",
            JsonLd = new object[]
            {
                _jsonLd.ItemList(products, canonicalPath),
                SeoJsonLdBuilders.BreadcrumbList(new[] { ("Trang chủ", (string?)"/"), ("Sản phẩm", (string?)null) }),
            },
        };
    }

    public async IAsyncEnumerable<SitemapEntry> EnumerateAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        var any = await _db.Products.WherePublished().AnyAsync(ct);
        if (any) yield return new SitemapEntry(Path, null, "daily", 0.8m);
    }
}
