namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

/// <summary>
/// Combo sản phẩm ("Combo tiết kiệm"). Giá combo có HAI chế độ, loại trừ nhau:
///  · <see cref="DiscountPercent"/> &gt; 0  → giảm % trên tổng giá lẻ HIỆN HÀNH của các món;
///  · ngược lại <see cref="TotalPrice"/>      → giá cố định cho MỘT bộ.
/// Giá lẻ luôn đọc lại từ <c>Products.Price</c> tại thời điểm tính (không tin
/// <c>ProductBundleItem.OriginalUnitPrice</c> — đó chỉ là snapshot lúc lưu để admin tham khảo).
///
/// <c>IsActive</c> (cột có sẵn của <see cref="Entity{TId}"/>) chính là công tắc "đang bán" của
/// combo; query filter của DbContext ẩn combo tắt khỏi mọi truy vấn công khai và khỏi checkout.
/// </summary>
public class ProductBundle : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;

    /// <summary>Giá cố định cho một bộ (VND, đã gồm VAT). Bỏ qua khi <see cref="DiscountPercent"/> &gt; 0.</summary>
    public decimal TotalPrice { get; private set; }

    /// <summary>Tổng giá lẻ tại lúc lưu — chỉ để hiển thị trong trang quản trị.</summary>
    public decimal OriginalPrice { get; private set; }

    /// <summary>Giảm theo % trên tổng giá lẻ hiện hành (0 &lt; x &lt; 100). Null = dùng giá cố định.</summary>
    public decimal? DiscountPercent { get; private set; }

    public string? ImageUrl { get; private set; }
    public DateTime? ValidFrom { get; private set; }
    public DateTime? ValidTo { get; private set; }

    private readonly List<ProductBundleItem> _items = new();
    public IReadOnlyCollection<ProductBundleItem> Items => _items.AsReadOnly();

    protected ProductBundle() { }

    public ProductBundle(string name, string description, decimal totalPrice, decimal originalPrice, string? imageUrl,
        DateTime? validFrom = null, DateTime? validTo = null, decimal? discountPercent = null)
    {
        Id = Guid.NewGuid();
        IsActive = true;
        UpdateDetails(name, description, totalPrice, originalPrice, imageUrl, validFrom, validTo, discountPercent);
        UpdatedAt = null;
    }

    public bool UsesPercent => DiscountPercent is > 0m;

    public void AddItem(Guid productId, bool isMainItem, int quantity, decimal originalUnitPrice, decimal discountPercentage = 0m)
    {
        if (quantity <= 0) throw new ArgumentException("Số lượng mỗi món trong combo phải lớn hơn 0", nameof(quantity));
        if (_items.Any(i => i.ProductId == productId))
            throw new ArgumentException("Một sản phẩm chỉ được xuất hiện một lần trong combo", nameof(productId));
        _items.Add(new ProductBundleItem(Id, productId, isMainItem, quantity, originalUnitPrice, discountPercentage));
    }

    public void ClearItems() => _items.Clear();

    public void UpdateDetails(string name, string description, decimal totalPrice, decimal originalPrice, string? imageUrl,
        DateTime? validFrom, DateTime? validTo, decimal? discountPercent = null)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Tên combo là bắt buộc", nameof(name));
        if (validFrom.HasValue && validTo.HasValue && validTo <= validFrom)
            throw new ArgumentException("Ngày kết thúc phải sau ngày bắt đầu", nameof(validTo));
        if (discountPercent is < 0m or >= 100m)
            throw new ArgumentException("Phần trăm giảm phải trong khoảng (0, 100)", nameof(discountPercent));
        if (discountPercent is not > 0m && totalPrice <= 0m)
            throw new ArgumentException("Combo cần giá cố định hoặc phần trăm giảm", nameof(totalPrice));

        Name = name.Trim();
        Description = description ?? string.Empty;
        TotalPrice = discountPercent is > 0m ? 0m : totalPrice;
        OriginalPrice = originalPrice < 0m ? 0m : originalPrice;
        DiscountPercent = discountPercent is > 0m ? discountPercent : null;
        ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
        ValidFrom = validFrom;
        ValidTo = validTo;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetActive(bool active)
    {
        IsActive = active;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Combo có đang trong khung hiệu lực tại <paramref name="utcNow"/> không (không xét cờ bật/tắt).</summary>
    public bool IsWithinWindow(DateTime utcNow)
        => (ValidFrom == null || ValidFrom <= utcNow) && (ValidTo == null || ValidTo >= utcNow);

    /// <summary>
    /// Giá MỘT bộ khi tổng giá lẻ hiện hành của một bộ là <paramref name="listPricePerSet"/>.
    /// Làm tròn đồng (AwayFromZero, D01 §3.1) và không bao giờ vượt giá lẻ.
    /// </summary>
    public decimal PricePerSet(decimal listPricePerSet)
    {
        if (listPricePerSet <= 0m) return 0m;
        var price = UsesPercent
            ? listPricePerSet - Math.Round(listPricePerSet * DiscountPercent!.Value / 100m, 0, MidpointRounding.AwayFromZero)
            : TotalPrice;
        return Math.Clamp(price, 0m, listPricePerSet);
    }
}

public class ProductBundleItem : Entity<Guid>
{
    public Guid BundleId { get; private set; }
    public Guid ProductId { get; private set; }
    public bool IsMainItem { get; private set; } // món chính, ví dụ chiếc laptop trong "laptop + chuột"
    public int Quantity { get; private set; }
    public decimal OriginalUnitPrice { get; private set; }

    /// <summary>Cột cũ (giảm theo từng món). Không còn tham gia tính giá — giữ để không phá schema.</summary>
    public decimal DiscountPercentage { get; private set; }
    public decimal DiscountedUnitPrice => OriginalUnitPrice * (100 - DiscountPercentage) / 100;

    protected ProductBundleItem() { }

    internal ProductBundleItem(Guid bundleId, Guid productId, bool isMainItem, int quantity, decimal originalUnitPrice, decimal discountPercentage)
    {
        Id = Guid.NewGuid();
        BundleId = bundleId;
        ProductId = productId;
        IsMainItem = isMainItem;
        Quantity = quantity;
        OriginalUnitPrice = originalUnitPrice;
        DiscountPercentage = discountPercentage;
        IsActive = true;
    }
}
