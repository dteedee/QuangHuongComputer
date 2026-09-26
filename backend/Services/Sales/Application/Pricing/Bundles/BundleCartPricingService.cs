using Catalog.Domain;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;

namespace Sales.Application.Pricing.Bundles;

/// <summary>
/// Nạp combo (Catalog) + tồn khả dụng (Inventory) rồi gọi <see cref="BundleCartPricer"/>.
/// Một nguồn duy nhất cho giỏ hàng (GET /cart) và chốt đơn (<c>CheckoutPricingStep</c>) — giỏ và
/// đơn không bao giờ ra hai con số combo khác nhau trên cùng dữ liệu.
///
/// Combo tắt bị query filter <c>IsActive</c> của Catalog ẩn đi ⇒ không nạp được ⇒ nhóm không được
/// giảm ("Combo đã ngừng áp dụng").
/// </summary>
public sealed class BundleCartPricingService
{
    private readonly CatalogDbContext _catalogDb;
    private readonly InventoryDbContext _inventoryDb;

    public BundleCartPricingService(CatalogDbContext catalogDb, InventoryDbContext inventoryDb)
    {
        _catalogDb = catalogDb;
        _inventoryDb = inventoryDb;
    }

    /// <param name="payable">Dòng tính tiền (không gồm hàng tặng), đúng thứ tự dùng để dựng đơn.</param>
    /// <param name="checkStock">
    /// true ở giỏ hàng. Lúc chốt đơn truyền false: tồn đã được <c>InventoryReservationService</c>
    /// giữ chỗ ngay trước bước này — thiếu hàng thì chốt đơn đã dừng ở đó.
    /// </param>
    public async Task<BundlePricingResult> PriceAsync(IReadOnlyList<CartItem> payable, bool checkStock, CancellationToken ct)
    {
        var lines = ToLines(payable);
        var bundleIds = lines.Where(l => l.BundleId.HasValue).Select(l => l.BundleId!.Value).Distinct().ToList();
        if (bundleIds.Count == 0) return BundlePricingResult.Empty(lines.Count);

        var bundles = await _catalogDb.ProductBundles.AsNoTracking()
            .Include(b => b.Items)
            .Where(b => bundleIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, ct);

        var stock = checkStock ? await LoadStockAsync(lines, ct) : null;
        return BundleCartPricer.Price(lines, bundles, stock, DateTime.UtcNow);
    }

    public static IReadOnlyList<BundleCartLine> ToLines(IReadOnlyList<CartItem> payable)
        => payable.Select((i, index) => new BundleCartLine(index, i.ProductId, i.VariantId, i.Price, i.Quantity, i.BundleId))
            .ToList();

    /// <summary>
    /// Giỏ tạm CHỈ gồm dòng không bị khoá bởi combo — đưa cho <c>PricingEngine</c> để khuyến mãi
    /// không bao giờ tính trên dòng đã giảm giá combo. Không lưu, không gắn DbContext.
    /// </summary>
    public static Cart PromotionView(Cart cart, IReadOnlyList<CartItem> payable, BundlePricingResult bundles)
    {
        var view = new Cart(cart.CustomerId);
        for (var i = 0; i < payable.Count; i++)
        {
            if (bundles.IsLocked(i)) continue;
            var item = payable[i];
            view.AddItem(item.ProductId, item.ProductName, item.Price, item.Quantity,
                item.VariantId, item.VariantName, item.VariantSku);
        }

        view.SetShippingAmount(cart.ShippingAmount);
        return view;
    }

    private async Task<IReadOnlyDictionary<(Guid, Guid?), int>> LoadStockAsync(
        IReadOnlyList<BundleCartLine> lines, CancellationToken ct)
    {
        var productIds = lines.Where(l => l.BundleId.HasValue).Select(l => l.ProductId).Distinct().ToList();
        var rows = await _inventoryDb.InventoryItems.AsNoTracking()
            .Where(i => productIds.Contains(i.ProductId))
            .Select(i => new { i.ProductId, i.VariantId, AvailableQuantity = i.QuantityOnHand - i.ReservedQuantity })
            .ToListAsync(ct);

        var result = rows.GroupBy(r => (r.ProductId, r.VariantId))
            .ToDictionary(g => ((Guid, Guid?))g.Key, g => g.Sum(r => r.AvailableQuantity));

        // Dòng giỏ không có biến thể nhưng kho tách theo biến thể: cộng mọi dòng kho của sản phẩm.
        foreach (var byProduct in rows.GroupBy(r => r.ProductId))
        {
            result.TryAdd((byProduct.Key, null), byProduct.Sum(r => r.AvailableQuantity));
        }

        return result;
    }
}
