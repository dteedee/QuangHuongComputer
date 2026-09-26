using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.Bundles;

/// <summary>Một món trong combo, kèm giá lẻ HIỆN HÀNH (không phải snapshot lúc lưu).</summary>
public sealed record BundleItemView(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string? ProductSlug,
    string? ProductImage,
    string? ProductSku,
    bool IsMainItem,
    int Quantity,
    decimal UnitPrice,
    bool IsPublished,
    bool InStock);

/// <summary>
/// Hình dạng combo trả cho storefront và trang quản trị. Mọi con số tiền được TÍNH LẠI từ giá
/// hiện hành của sản phẩm — cùng công thức <see cref="ProductBundle.PricePerSet"/> mà Sales dùng
/// lúc chốt đơn, nên "Tiết kiệm x₫" trên trang sản phẩm khớp với giỏ hàng.
/// </summary>
public sealed record BundleView(
    Guid Id,
    string Name,
    string Description,
    string? ImageUrl,
    DateTime? ValidFrom,
    DateTime? ValidTo,
    bool IsActive,
    string PricingMode,
    decimal? DiscountPercent,
    decimal FixedPrice,
    decimal OriginalPrice,
    decimal BundlePrice,
    decimal Savings,
    bool IsPurchasable,
    IReadOnlyList<BundleItemView> Items)
{
    /// <summary>Tên cũ của trường giá combo — giữ cho client đang đọc `totalPrice`.</summary>
    public decimal TotalPrice => BundlePrice;
}

public static class BundleViewBuilder
{
    /// <summary>Dựng view cho danh sách combo, một truy vấn sản phẩm cho tất cả.</summary>
    public static async Task<IReadOnlyList<BundleView>> BuildAsync(
        CatalogDbContext db, IReadOnlyList<ProductBundle> bundles, CancellationToken ct)
    {
        var productIds = bundles.SelectMany(b => b.Items.Select(i => i.ProductId)).Distinct().ToList();
        var publishedIds = (await db.Products.WherePublished().AsNoTracking()
                .Where(p => productIds.Contains(p.Id)).Select(p => p.Id).ToListAsync(ct))
            .ToHashSet();
        var products = await db.Products.IgnoreQueryFilters().AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Name, p.Slug, p.ImageUrl, p.Sku, p.Price, p.StockQuantity })
            .ToDictionaryAsync(p => p.Id, ct);

        return bundles.Select(b =>
        {
            var items = b.Items
                .OrderByDescending(i => i.IsMainItem)
                .Select(i =>
                {
                    products.TryGetValue(i.ProductId, out var p);
                    return new BundleItemView(
                        i.Id, i.ProductId, p?.Name ?? "Sản phẩm không còn tồn tại", p?.Slug, p?.ImageUrl, p?.Sku,
                        i.IsMainItem, i.Quantity, p?.Price ?? 0m,
                        IsPublished: p != null && publishedIds.Contains(i.ProductId),
                        InStock: p != null && p.StockQuantity >= i.Quantity);
                })
                .ToList();

            var original = items.Sum(i => i.UnitPrice * i.Quantity);
            var price = b.PricePerSet(original);
            var purchasable = items.Count > 0 && items.All(i => i.IsPublished && i.InStock) && price < original;

            return new BundleView(
                b.Id, b.Name, b.Description, b.ImageUrl, b.ValidFrom, b.ValidTo, b.IsActive,
                b.UsesPercent ? "percent" : "fixed", b.DiscountPercent, b.TotalPrice,
                original, price, original - price, purchasable, items);
        }).ToList();
    }

    /// <summary>Combo đang bán cho khách: bật, trong khung hiệu lực (điều kiện dịch được sang SQL).</summary>
    public static IQueryable<ProductBundle> WhereLive(this IQueryable<ProductBundle> query, DateTime utcNow)
        => query.Where(b => (b.ValidFrom == null || b.ValidFrom <= utcNow) && (b.ValidTo == null || b.ValidTo >= utcNow));
}
