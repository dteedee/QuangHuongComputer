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

    protected PromotionReward() { }

    internal PromotionReward(
        Guid promotionId,
        Guid? productId,
        Guid? variantId,
        int quantity,
        decimal discountPercent)
    {
        Id = Guid.NewGuid();
        PromotionId = promotionId;
        ProductId = productId;
        VariantId = variantId;
        Quantity = quantity;
        DiscountPercent = discountPercent;
        CreatedAt = DateTime.UtcNow;
    }
}
