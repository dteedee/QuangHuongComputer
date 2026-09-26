namespace Sales.Domain;

/// <summary>Một món của combo khi thêm vào giỏ: số lượng cho MỘT bộ, giá lẻ đọc từ Catalog.</summary>
public sealed record CartBundleComponent(Guid ProductId, string ProductName, decimal UnitPrice, int QuantityPerSet);

/// <summary>
/// Nhóm COMBO trong giỏ. Mỗi combo là một nhóm dòng mang cùng <see cref="CartItem.BundleId"/>;
/// số bộ = số lượng dòng / số lượng mỗi bộ (mọi dòng phải cùng tỉ lệ — <c>BundleCartPricer</c> kiểm).
///
/// Quy tắc "vỡ combo": bỏ bất kỳ món nào hoặc đổi số lượng một món ⇒ các món còn lại TÁCH khỏi
/// nhóm và trở về dòng lẻ (gộp vào dòng lẻ cùng sản phẩm nếu có) ⇒ giá về giá lẻ, và chúng lại
/// đủ điều kiện nhận coupon/khuyến mãi như mọi dòng lẻ khác.
/// </summary>
public partial class Cart
{
    /// <summary>Thêm <paramref name="sets"/> bộ combo. Thêm lại cùng combo thì cộng dồn số bộ.</summary>
    public void AddBundle(Guid bundleId, string bundleName, IReadOnlyList<CartBundleComponent> components, int sets)
    {
        if (sets <= 0) throw new ArgumentException("Số bộ combo phải lớn hơn 0", nameof(sets));
        if (components == null || components.Count == 0)
            throw new ArgumentException("Combo phải có ít nhất một món", nameof(components));

        foreach (var c in components)
        {
            if (c.QuantityPerSet <= 0)
                throw new ArgumentException("Số lượng mỗi món trong combo phải lớn hơn 0", nameof(components));
            AddBundleLine(bundleId, bundleName, c.ProductId, c.ProductName, c.UnitPrice,
                c.QuantityPerSet * sets, null, null, null);
        }

        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Gỡ trọn nhóm combo khỏi giỏ.</summary>
    public void RemoveBundle(Guid bundleId)
    {
        Items.RemoveAll(i => i.BundleId == bundleId);
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Vỡ combo: các dòng còn lại thành dòng lẻ, gộp với dòng lẻ cùng sản phẩm nếu có.</summary>
    public void BreakBundle(Guid bundleId)
    {
        var lines = Items.Where(i => i.BundleId == bundleId).ToList();
        foreach (var line in lines)
        {
            var standalone = Items.FirstOrDefault(i => i.BundleId == null && !i.IsGift
                && i.ProductId == line.ProductId && i.VariantId == line.VariantId);
            if (standalone != null)
            {
                standalone.UpdateQuantity(standalone.Quantity + line.Quantity);
                Items.Remove(line);
            }
            else
            {
                line.DetachFromBundle();
            }
        }

        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Xoá một món của combo (theo sản phẩm) — combo vỡ, các món còn lại về giá lẻ.</summary>
    public void RemoveBundleItem(Guid bundleId, Guid productId)
    {
        Items.RemoveAll(i => i.BundleId == bundleId && i.ProductId == productId);
        BreakBundle(bundleId);
    }

    /// <summary>Đổi số lượng một món của combo — combo vỡ trước rồi mới đổi số lượng dòng lẻ.</summary>
    public void UpdateBundleItemQuantity(Guid bundleId, Guid productId, int quantity)
    {
        var line = Items.FirstOrDefault(i => i.BundleId == bundleId && i.ProductId == productId);
        if (line == null) return;
        var variantId = line.VariantId;
        BreakBundle(bundleId);
        UpdateItemQuantity(productId, variantId, quantity);
    }

    /// <summary>
    /// DELETE /cart/items/{productId}: ưu tiên xoá dòng LẺ của sản phẩm; chỉ khi sản phẩm chỉ nằm
    /// trong combo mới xoá dòng combo (và combo vỡ).
    /// </summary>
    public void RemoveStandaloneOrBundledItem(Guid productId)
    {
        if (Items.Any(i => i.ProductId == productId && i.BundleId == null && !i.IsGift))
            Items.RemoveAll(i => i.ProductId == productId && i.BundleId == null && !i.IsGift);
        else
            RemoveItem(productId);
    }

    internal void AddBundleLine(Guid bundleId, string? bundleName, Guid productId, string productName,
        decimal price, int quantity, Guid? variantId, string? variantName, string? variantSku)
    {
        var existing = Items.FirstOrDefault(i => i.BundleId == bundleId
            && i.ProductId == productId && i.VariantId == variantId);
        if (existing != null)
        {
            existing.UpdateQuantity(existing.Quantity + quantity);
            return;
        }

        var line = new CartItem(productId, productName, price, quantity, variantId, variantName, variantSku);
        line.AttachToBundle(bundleId, bundleName);
        Items.Add(line);
    }

    private static List<Guid> BundleIdsOf(IEnumerable<CartItem> lines)
        => lines.Where(i => i.BundleId.HasValue).Select(i => i.BundleId!.Value).Distinct().ToList();
}
