using System.Text.RegularExpressions;
using BuildingBlocks.Seo;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Seo;

/// <summary>
/// `/danh-muc/{slug}` (+ `?page=`). Filter/sort query params (`brand`, `min-price`, ... — see
/// `SeoOutputCachePolicy.FilterKeys`, the same list) make the page `noindex,follow` with a clean
/// canonical (D11 Key Insights) — the filtered variant still exists and still gets crawled/followed,
/// it just is not the URL Google should index for that content.
/// </summary>
public sealed class CatalogCategorySeoProvider : ISeoPageProvider
{
    private static readonly Regex SlugPattern = new(@"^/danh-muc/(?<slug>[a-z0-9-]+)$", RegexOptions.Compiled);
    private static readonly string[] FilterKeys = { "brand", "min-price", "max-price", "sort", "specs", "rating", "in-stock" };
    private const int PageSize = 24;

    private readonly CatalogDbContext _db;
    private readonly CatalogJsonLdBuilder _jsonLd;

    public CatalogCategorySeoProvider(CatalogDbContext db, CatalogJsonLdBuilder jsonLd)
    {
        _db = db;
        _jsonLd = jsonLd;
    }

    public bool TryMatch(string path) => SlugPattern.IsMatch(path);

    public async Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct)
    {
        var slug = SlugPattern.Match(path).Groups["slug"].Value;
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Slug == slug && c.IsActive, ct);
        if (category is null) return SeoPage.NotFound(path);

        var parsedQuery = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(query);
        var isFiltered = parsedQuery.Keys.Any(k => FilterKeys.Contains(k, StringComparer.OrdinalIgnoreCase));
        var page = parsedQuery.TryGetValue("page", out var pageValues) && int.TryParse(pageValues.ToString(), out var p) && p > 1 ? p : 1;

        var productsQuery = _db.Products.Where(pr => pr.CategoryId == category.Id).WherePublished();
        var total = await productsQuery.CountAsync(ct);
        var products = await productsQuery
            .OrderByDescending(pr => pr.PublishedAt)
            .Skip((page - 1) * PageSize)
            .Take(PageSize)
            .ToListAsync(ct);

        var canonicalPath = page > 1 ? $"/danh-muc/{slug}?page={page}" : $"/danh-muc/{slug}";
        var jsonLd = new List<object>
        {
            _jsonLd.ItemList(products, canonicalPath),
            SeoJsonLdBuilders.BreadcrumbList(new[] { ("Trang chủ", (string?)"/"), (category.Name, (string?)null) }),
        };

        return new SeoPage
        {
            Status = 200,
            Title = string.IsNullOrWhiteSpace(category.MetaTitle) ? $"{category.Name} - Quang Hưởng Computer" : category.MetaTitle!,
            Description = string.IsNullOrWhiteSpace(category.MetaDescription)
                ? $"{category.Name} chính hãng, giá tốt tại Quang Hưởng Computer. {total} sản phẩm."
                : category.MetaDescription!,
            CanonicalPath = canonicalPath,
            Robots = isFiltered ? "noindex,follow" : "index,follow",
            JsonLd = jsonLd,
        };
    }

    public async IAsyncEnumerable<SitemapEntry> EnumerateAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        var categories = _db.Categories.Where(c => c.IsActive).Select(c => new { c.Slug, c.UpdatedAt });
        await foreach (var c in categories.AsAsyncEnumerable().WithCancellation(ct))
        {
            if (string.IsNullOrEmpty(c.Slug)) continue;
            yield return new SitemapEntry($"/danh-muc/{c.Slug}", c.UpdatedAt, "weekly", 0.7m);
        }
    }
}
