using System.Text.RegularExpressions;
using BuildingBlocks.Seo;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Seo;

/// <summary>
/// `/san-pham/{slug}` (PDP) + legacy `/product/{uuid}` and `/products/{uuid}` -&gt; 301 to the slug
/// URL (D11). Public predicate: `ProductPublicationPolicy.WherePublished()` — the SAME predicate
/// every other public catalog query uses (D10), so a product hidden from the storefront is
/// ALSO hidden from the shell, never a source of drift.
/// </summary>
public sealed class CatalogProductDetailSeoProvider : ISeoPageProvider
{
    private static readonly Regex SlugPattern = new(@"^/san-pham/(?<slug>[a-z0-9-]+)$", RegexOptions.Compiled);
    private static readonly Regex UuidPattern = new(@"^/products?/(?<id>[0-9a-fA-F-]{36})$", RegexOptions.Compiled);

    private readonly CatalogDbContext _db;
    private readonly CatalogJsonLdBuilder _jsonLd;

    public CatalogProductDetailSeoProvider(CatalogDbContext db, CatalogJsonLdBuilder jsonLd)
    {
        _db = db;
        _jsonLd = jsonLd;
    }

    public bool TryMatch(string path) => SlugPattern.IsMatch(path) || UuidPattern.IsMatch(path);

    public async Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct)
    {
        var uuidMatch = UuidPattern.Match(path);
        if (uuidMatch.Success)
        {
            if (!Guid.TryParse(uuidMatch.Groups["id"].Value, out var id)) return SeoPage.NotFound(path);
            var slugForRedirect = await _db.Products.Where(p => p.Id == id).Select(p => p.Slug).FirstOrDefaultAsync(ct);
            return string.IsNullOrEmpty(slugForRedirect)
                ? SeoPage.NotFound(path)
                : SeoPage.RedirectPermanent($"/san-pham/{slugForRedirect}");
        }

        var slugMatch = SlugPattern.Match(path);
        var slug = slugMatch.Groups["slug"].Value;

        var product = await _db.Products
            .Include(p => p.Brand)
            .Include(p => p.Category)
            .WherePublished()
            .FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (product is null) return SeoPage.NotFound(path);

        var approvedReviews = await _db.ProductReviews
            .Where(r => r.ProductId == product.Id && r.IsApproved)
            .ToListAsync(ct);
        double? avgRating = approvedReviews.Count > 0 ? approvedReviews.Average(r => r.Rating) : null;

        var crumbs = new List<(string, string?)> { ("Trang chủ", "/") };
        if (product.Category is not null) crumbs.Add((product.Category.Name, $"/danh-muc/{product.Category.Slug}"));
        crumbs.Add((product.Name, null));

        var jsonLd = new List<object>
        {
            _jsonLd.Product(product, approvedReviews.Count, avgRating),
            SeoJsonLdBuilders.BreadcrumbList(crumbs),
        };

        var description = string.IsNullOrWhiteSpace(product.MetaDescription)
            ? Truncate(StripHtml(product.Description), 160)
            : product.MetaDescription!;

        return new SeoPage
        {
            Status = 200,
            Title = string.IsNullOrWhiteSpace(product.MetaTitle) ? $"{product.Name} - Quang Hưởng Computer" : product.MetaTitle!,
            Description = description,
            CanonicalPath = $"/san-pham/{product.Slug}",
            Robots = "index,follow",
            OgType = "product",
            // No stored width/height for product photos (ProductMedia has no dimension columns) —
            // declaring og:image:width/height without knowing the real size would be fabricated
            // data (D12). The shell falls back to the verified 1200x630 brand default instead of
            // guessing (see SeoShellHeadRenderer.RenderHead / SeoDefaults.DefaultOgImage).
            OgImage = null,
            JsonLd = jsonLd,
            Body = await CatalogSeoBodyBuilder.ProductAsync(_db, product, ct),
        };
    }

    public async IAsyncEnumerable<SitemapEntry> EnumerateAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        var products = _db.Products.WherePublished().Select(p => new { p.Slug, p.UpdatedAt });
        await foreach (var p in products.AsAsyncEnumerable().WithCancellation(ct))
        {
            if (string.IsNullOrEmpty(p.Slug)) continue;
            yield return new SitemapEntry($"/san-pham/{p.Slug}", p.UpdatedAt, "daily", 0.9m);
        }
    }

    private static string StripHtml(string input) => Regex.Replace(input ?? string.Empty, "<[^>]+>", " ").Trim();
    private static string Truncate(string input, int max) => input.Length <= max ? input : input[..(max - 1)].TrimEnd() + "…";
}
