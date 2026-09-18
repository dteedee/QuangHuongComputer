using BuildingBlocks.Storage;
using Catalog.Domain;

namespace Catalog.Seo;

/// <summary>Product+Offer, ItemList JSON-LD — the catalog-specific shapes BreadcrumbList/Organization don't cover (those live in `BuildingBlocks/Seo/SeoJsonLdBuilders.cs`).</summary>
public sealed class CatalogJsonLdBuilder
{
    private readonly IMediaUrlResolver _media;

    public CatalogJsonLdBuilder(IMediaUrlResolver media) => _media = media;

    /// <summary>D11: Product + Offer (VND, availability, brand, sku, image), `aggregateRating` ONLY when approved reviews exist.</summary>
    public object Product(Product product, int approvedReviewCount, double? averageRating)
    {
        var image = _media.ToAbsolute(product.EffectiveImageUrl);
        var obj = new Dictionary<string, object?>
        {
            ["@context"] = "https://schema.org",
            ["@type"] = "Product",
            ["name"] = product.Name,
            ["sku"] = product.Sku,
            ["description"] = product.Description,
        };
        if (!string.IsNullOrWhiteSpace(image)) obj["image"] = image;
        if (product.Brand is not null) obj["brand"] = new Dictionary<string, object?> { ["@type"] = "Brand", ["name"] = product.Brand.Name };

        obj["offers"] = new Dictionary<string, object?>
        {
            ["@type"] = "Offer",
            ["priceCurrency"] = "VND",
            ["price"] = product.EffectivePrice,
            ["availability"] = AvailabilitySchema(product.Status),
        };

        if (approvedReviewCount > 0 && averageRating is not null)
        {
            obj["aggregateRating"] = new Dictionary<string, object?>
            {
                ["@type"] = "AggregateRating",
                ["ratingValue"] = Math.Round(averageRating.Value, 1),
                ["reviewCount"] = approvedReviewCount,
            };
        }

        return obj;
    }

    /// <summary>Category listing page (24 products/page): first-page products only, matching the D11 note that a filtered/paged listing must stay cheap.</summary>
    public object ItemList(IReadOnlyList<Product> products, string categoryPath)
    {
        var items = products.Select((p, i) => new Dictionary<string, object?>
        {
            ["@type"] = "ListItem",
            ["position"] = i + 1,
            ["url"] = $"/san-pham/{p.Slug}",
            ["name"] = p.Name,
        }).ToList();

        return new Dictionary<string, object?>
        {
            ["@context"] = "https://schema.org",
            ["@type"] = "ItemList",
            ["itemListElement"] = items,
        };
    }

    private static string AvailabilitySchema(ProductStatus status) => status switch
    {
        ProductStatus.InStock or ProductStatus.LowStock => "https://schema.org/InStock",
        ProductStatus.PreOrder => "https://schema.org/PreOrder",
        _ => "https://schema.org/OutOfStock",
    };
}
