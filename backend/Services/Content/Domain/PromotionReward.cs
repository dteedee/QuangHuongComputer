using BuildingBlocks.SharedKernel;

namespace Content.Domain;

/// <summary>
/// Phần thưởng khi promotion Mua X Tặng Y được kích hoạt.
/// DiscountPercent = 100 nghĩa tặng miễn phí; nhỏ hơn nghĩa giảm giá phần trăm sản phẩm quà.
/// </summary>
public class PromotionReward : Entity<Guid>
{
    public Guid PromotionId { get; private set; }
    public Guid? ProductId { get; private set; }
    public Guid? VariantId { get; private set; }
    public int Quantity { get; private set; }
    public decimal DiscountPercent { get; private set; } = 100;

    /// <summary>
    /// Hợp đồng promotion (phase-20, "Do step 5 FIRST", W2-3 tiêu thụ contract này):
    /// FlashSale = Promotion.Type=FlashSale, reward DiscountType=FixedPrice, per-product
    /// FlashPrice cố định, QuantityLimit + SoldCount đếm theo từng sản phẩm trong sale.
    /// null khi reward không phải flash sale (Mua X Tặng Y thường thì).
    /// </summary>
    public decimal? FlashPrice { get; private set; }
    public int? QuantityLimit { get; private set; }
    public int SoldCount { get; private set; }

    protected PromotionReward() { }

    internal PromotionReward(
        Guid promotionId,
        Guid? productId,
        Guid? variantId,
        int quantity,
        decimal discountPercent,
        decimal? flashPrice = null,
        int? quantityLimit = null)
    {
        Id = Guid.NewGuid();
        PromotionId = promotionId;
        ProductId = productId;
        VariantId = variantId;
        Quantity = quantity;
        DiscountPercent = discountPercent;
        FlashPrice = flashPrice;
        QuantityLimit = quantityLimit;
        SoldCount = 0;
        CreatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Tăng bộ đếm đã bán — CHỈ gọi khi đơn Paid/Confirmed (W2-3 consumer của outbox event).
    /// Ném exception nếu vượt QuantityLimit (concurrency safeguard, giống Promotion.IncrementUsage).
    /// </summary>
    public void IncrementSold(int count = 1)
    {
        if (count <= 0) throw new ArgumentException("Count phải > 0");
        var next = SoldCount + count;
        if (QuantityLimit.HasValue && next > QuantityLimit.Value)
            throw new InvalidOperationException(
                $"Flash sale reward đã hết số lượng ({SoldCount}/{QuantityLimit}).");
        SoldCount = next;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsSoldOut() => QuantityLimit.HasValue && SoldCount >= QuantityLimit.Value;
}
