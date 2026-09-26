using BuildingBlocks.Seo;
using Catalog.Application.Products;
using Catalog.Domain;
using Catalog.Infrastructure;

namespace Catalog.Seo;

/// <summary>
/// Dữ liệu thân trang (H1, giá, tồn kho, thông số, danh sách) cho SEO shell — trang sản phẩm và
/// danh mục. Chỉ đưa chuỗi thuần + đường dẫn gốc; encode/markup là việc của renderer ở ApiGateway.
/// Giá = <c>EffectivePrice</c> và tình trạng = <c>Product.Status</c>, đúng hai nguồn JSON-LD Offer
/// đang dùng, để thân trang không bao giờ nói khác JSON-LD.
/// </summary>
internal static class CatalogSeoBodyBuilder
{
    private const int MaxSpecs = 8;
    private const int SummaryLength = 300;

    public static async Task<SeoBodyFragment> ProductAsync(CatalogDbContext db, Product product, CancellationToken ct)
    {
        var crumbs = new List<SeoLink> { new("Trang chủ", "/") };
        if (product.Category is not null) crumbs.Add(new SeoLink(product.Category.Name, $"/danh-muc/{product.Category.Slug}"));
        crumbs.Add(new SeoLink(product.Name, null));

        var facts = new List<SeoFact>
        {
            new("Giá", SeoTextFormat.Vnd(product.EffectivePrice)),
            new("Tình trạng", StockText(product.Status)),
        };
        if (product.Brand is not null) facts.Add(new SeoFact("Thương hiệu", product.Brand.Name));

        var specGroups = await ProductSpecGroupBuilder.BuildAsync(db, product, ct);
        var specs = specGroups
            .SelectMany(g => g.Values)
            .Select(v => new SeoFact(v.Name, FormatSpec(v)))
            .Where(f => !string.IsNullOrWhiteSpace(f.Value))
            .Take(MaxSpecs)
            .ToList();

        var summary = SeoHtmlSanitizer.ToPlainText(product.Description);
        return new SeoBodyFragment
        {
            Heading = product.Name,
            Breadcrumbs = crumbs,
            Facts = facts,
            Specs = specs,
            Summary = summary.Length == 0 ? null : SeoTextFormat.Truncate(summary, SummaryLength),
        };
    }

    public static SeoBodyFragment Category(Category category, IReadOnlyList<Product> products, int page, int total, int pageSize)
    {
        var basePath = $"/danh-muc/{category.Slug}";
        var intro = SeoHtmlSanitizer.ToPlainText(category.Description);
        var lastPage = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));

        return new SeoBodyFragment
        {
            Heading = page > 1 ? $"{category.Name} - Trang {page}" : category.Name,
            Breadcrumbs = new[] { new SeoLink("Trang chủ", "/"), new SeoLink(category.Name, null) },
            Summary = intro.Length == 0 ? null : SeoTextFormat.Truncate(intro, SummaryLength),
            ItemsHeading = total > 0 ? $"{total} sản phẩm" : null,
            Items = products
                .Select(p => new SeoListItem(p.Name, $"/san-pham/{p.Slug}", SeoTextFormat.Vnd(p.EffectivePrice)))
                .ToList(),
            PreviousPage = page > 1 ? new SeoLink("Trang trước", page == 2 ? basePath : $"{basePath}?page={page - 1}") : null,
            NextPage = page < lastPage ? new SeoLink("Trang sau", $"{basePath}?page={page + 1}") : null,
        };
    }

    private static string StockText(ProductStatus status) => status switch
    {
        ProductStatus.InStock => "Còn hàng",
        ProductStatus.LowStock => "Sắp hết hàng",
        ProductStatus.PreOrder => "Đặt trước",
        _ => "Hết hàng",
    };

    private static string FormatSpec(SpecValueDto spec)
    {
        var value = spec.Value switch
        {
            null => string.Empty,
            bool b => b ? "Có" : "Không",
            decimal d => d.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture),
            _ => spec.Value.ToString() ?? string.Empty,
        };
        return string.IsNullOrWhiteSpace(spec.Unit) || value.Length == 0 ? value : $"{value} {spec.Unit}";
    }
}
