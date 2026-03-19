using BuildingBlocks.SharedKernel;

namespace Content.Domain;

public class FlashSale : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string? ImageUrl { get; private set; }
    public string? BannerImageUrl { get; private set; }

    // Discount settings
    public DiscountType DiscountType { get; private set; }
    public decimal DiscountValue { get; private set; }
    public decimal? MaxDiscount { get; private set; }

    // Time settings
    public DateTime StartTime { get; private set; }
    public DateTime EndTime { get; private set; }

    // Product targeting
    public string? ProductIds { get; private set; } // JSON array of product IDs
    public string? CategoryIds { get; private set; } // JSON array of category IDs
    public bool ApplyToAllProducts { get; private set; }

    // Limits
    public int? MaxQuantityPerOrder { get; private set; }
    public int? TotalQuantityLimit { get; private set; }
    public int SoldQuantity { get; private set; }

    // Display
    public int DisplayOrder { get; private set; }
    public FlashSaleStatus Status { get; private set; }
    public string? BadgeText { get; private set; } // e.g., "HOT", "SALE", "50%"
    public string? BadgeColor { get; private set; } // e.g., "#FF0000"

    protected FlashSale() { }

    public FlashSale(
        string name,
        string description,
        DiscountType discountType,
        decimal discountValue,
        DateTime startTime,
        DateTime endTime,
        decimal? maxDiscount = null,
        string? imageUrl = null,
        string? bannerImageUrl = null,
        string? productIds = null,
        string? categoryIds = null,
        bool applyToAllProducts = false,
        int? maxQuantityPerOrder = null,
        int? totalQuantityLimit = null,
        int displayOrder = 0,
        string? badgeText = null,
        string? badgeColor = null)
    {
        Id = Guid.NewGuid();
        Name = name;
        Description = description;
        DiscountType = discountType;
        DiscountValue = discountValue;
        MaxDiscount = maxDiscount;
        StartTime = startTime;
        EndTime = endTime;
        ImageUrl = imageUrl;
        BannerImageUrl = bannerImageUrl;
        ProductIds = productIds;
        CategoryIds = categoryIds;
        ApplyToAllProducts = applyToAllProducts;
        MaxQuantityPerOrder = maxQuantityPerOrder;
        TotalQuantityLimit = totalQuantityLimit;
        SoldQuantity = 0;
        DisplayOrder = displayOrder;
        Status = FlashSaleStatus.Scheduled;
        BadgeText = badgeText ?? GetDefaultBadgeText(discountType, discountValue);
        BadgeColor = badgeColor ?? "#D70018";
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    private static string GetDefaultBadgeText(DiscountType type, decimal value)
    {
        return type == DiscountType.Percentage ? $"-{value:0}%" : "SALE";
    }

    public bool IsCurrentlyActive()
    {
        var now = DateTime.UtcNow;
        return IsActive
            && Status == FlashSaleStatus.Active
            && now >= StartTime
            && now <= EndTime
            && (!TotalQuantityLimit.HasValue || SoldQuantity < TotalQuantityLimit.Value);
    }

    public bool IsUpcoming()
    {
        var now = DateTime.UtcNow;
        return IsActive && now < StartTime;
    }

    public bool HasEnded()
    {
        var now = DateTime.UtcNow;
        return now > EndTime || Status == FlashSaleStatus.Ended;
    }

    public bool IsSoldOut()
    {
        return TotalQuantityLimit.HasValue && SoldQuantity >= TotalQuantityLimit.Value;
    }

    public TimeSpan GetTimeRemaining()
    {
        var now = DateTime.UtcNow;
        if (now < StartTime)
            return StartTime - now;
        if (now <= EndTime)
            return EndTime - now;
        return TimeSpan.Zero;
    }

    public decimal CalculateDiscount(decimal originalPrice)
    {
        if (!IsCurrentlyActive())
            return 0;

        decimal discount = DiscountType switch
        {
            DiscountType.Percentage => originalPrice * (DiscountValue / 100m),
            DiscountType.FixedAmount => DiscountValue,
            _ => 0
        };

        if (MaxDiscount.HasValue && discount > MaxDiscount.Value)
        {
            discount = MaxDiscount.Value;
        }

        return Math.Min(discount, originalPrice);
    }

    public decimal GetSalePrice(decimal originalPrice)
    {
        var discount = CalculateDiscount(originalPrice);
        return Math.Max(0, originalPrice - discount);
    }

    public void IncrementSoldQuantity(int quantity = 1)
    {
        SoldQuantity += quantity;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        if (HasEnded())
            throw new InvalidOperationException("Cannot activate ended flash sale");

        Status = FlashSaleStatus.Active;
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        Status = FlashSaleStatus.Cancelled;
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void End()
    {
        Status = FlashSaleStatus.Ended;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateDetails(
        string name,
        string description,
        DiscountType discountType,
        decimal discountValue,
        DateTime startTime,
        DateTime endTime,
        decimal? maxDiscount = null,
        string? imageUrl = null,
        string? bannerImageUrl = null,
        string? productIds = null,
        string? categoryIds = null,
        bool applyToAllProducts = false,
        int? maxQuantityPerOrder = null,
        int? totalQuantityLimit = null,
        int displayOrder = 0,
        string? badgeText = null,
        string? badgeColor = null)
    {
        Name = name;
        Description = description;
        DiscountType = discountType;
        DiscountValue = discountValue;
        MaxDiscount = maxDiscount;
        StartTime = startTime;
        EndTime = endTime;
        ImageUrl = imageUrl;
        BannerImageUrl = bannerImageUrl;
        ProductIds = productIds;
        CategoryIds = categoryIds;
        ApplyToAllProducts = applyToAllProducts;
        MaxQuantityPerOrder = maxQuantityPerOrder;
        TotalQuantityLimit = totalQuantityLimit;
        DisplayOrder = displayOrder;
        BadgeText = badgeText ?? GetDefaultBadgeText(discountType, discountValue);
        BadgeColor = badgeColor ?? "#D70018";
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateStatus()
    {
        var now = DateTime.UtcNow;

        if (!IsActive)
        {
            Status = FlashSaleStatus.Cancelled;
        }
        else if (IsSoldOut())
        {
            Status = FlashSaleStatus.Ended;
        }
        else if (now > EndTime)
        {
            Status = FlashSaleStatus.Ended;
        }
        else if (now >= StartTime && now <= EndTime)
        {
            Status = FlashSaleStatus.Active;
        }
        else if (now < StartTime)
        {
            Status = FlashSaleStatus.Scheduled;
        }

        UpdatedAt = DateTime.UtcNow;
    }
}

public enum FlashSaleStatus
{
    Scheduled,  // Chưa bắt đầu
    Active,     // Đang diễn ra
    Ended,      // Đã kết thúc
    Cancelled   // Đã hủy
}
