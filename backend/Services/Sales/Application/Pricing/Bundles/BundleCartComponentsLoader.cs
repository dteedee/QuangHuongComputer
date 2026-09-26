using Catalog.Domain;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;

namespace Sales.Application.Pricing.Bundles;

/// <summary>Combo đã nạp để thêm vào giỏ: tên + các món với giá lẻ hiện hành.</summary>
public sealed record LoadedCartBundle(Guid BundleId, string Name, IReadOnlyList<CartBundleComponent> Components);

/// <summary>
/// Nạp một combo để THÊM vào giỏ (tài khoản hoặc vãng lai). Chặn ngay ở cửa: combo tắt/hết hạn,
/// món đã gỡ khỏi web, không đủ hàng. Giá ghi vào giỏ chỉ là ảnh chụp — giỏ và chốt đơn luôn tính
/// lại qua <see cref="BundleCartPricingService"/>.
/// </summary>
public static class BundleCartComponentsLoader
{
    public const int MaxSetsPerAdd = 10;

    public static async Task<(LoadedCartBundle? Bundle, string? Error)> LoadAsync(
        CatalogDbContext catalogDb,
        InventoryDbContext inventoryDb,
        Guid bundleId,
        int sets,
        Cart? existingCart,
        CancellationToken ct)
    {
        if (sets is < 1 or > MaxSetsPerAdd) return (null, $"Số bộ combo từ 1 đến {MaxSetsPerAdd}");

        var bundle = await catalogDb.ProductBundles.AsNoTracking().Include(b => b.Items)
            .FirstOrDefaultAsync(b => b.Id == bundleId, ct);
        if (bundle == null) return (null, "Combo không tồn tại hoặc đã ngừng áp dụng");
        if (!bundle.IsWithinWindow(DateTime.UtcNow)) return (null, "Combo không trong thời gian áp dụng");
        if (bundle.Items.Count == 0) return (null, "Combo không còn sản phẩm nào");

        var ids = bundle.Items.Select(i => i.ProductId).ToList();
        var products = await catalogDb.Products.WherePublished().AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .Select(p => new { p.Id, p.Name, p.Price })
            .ToDictionaryAsync(p => p.Id, ct);
        if (products.Count != ids.Count) return (null, "Một sản phẩm trong combo đã ngừng kinh doanh");

        var stock = await inventoryDb.InventoryItems.AsNoTracking()
            .Where(i => ids.Contains(i.ProductId))
            .GroupBy(i => i.ProductId)
            .Select(g => new { ProductId = g.Key, Available = g.Sum(i => i.QuantityOnHand - i.ReservedQuantity) })
            .ToDictionaryAsync(x => x.ProductId, x => x.Available, ct);

        var components = new List<CartBundleComponent>();
        foreach (var item in bundle.Items)
        {
            var product = products[item.ProductId];
            var alreadyInCart = existingCart?.Items.Where(i => i.ProductId == item.ProductId && !i.IsGift).Sum(i => i.Quantity) ?? 0;
            var needed = item.Quantity * sets + alreadyInCart;
            if (!stock.TryGetValue(item.ProductId, out var available) || available < needed)
                return (null, $"Không đủ hàng cho combo: {product.Name} (còn {Math.Max(available, 0)})");

            components.Add(new CartBundleComponent(item.ProductId, product.Name, product.Price, item.Quantity));
        }

        var listPerSet = components.Sum(c => c.UnitPrice * c.QuantityPerSet);
        if (bundle.PricePerSet(listPerSet) >= listPerSet) return (null, "Combo không còn rẻ hơn giá lẻ");

        return (new LoadedCartBundle(bundle.Id, bundle.Name, components), null);
    }
}
