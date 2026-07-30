using BuildingBlocks.SharedKernel;

namespace Content.Domain;

/// <summary>
/// Nhật ký sử dụng promotion — chống lạm dụng (giới hạn/khách).
/// Ghi trong cùng transaction đặt hàng để bảo đảm nhất quán.
/// </summary>
public class PromotionUsage : Entity<Guid>
{
    public Guid PromotionId { get; private set; }
    /// <summary>null với guest checkout — dùng CustomerPhone làm fallback.</summary>
    public Guid? CustomerId { get; private set; }
    public string? CustomerPhone { get; private set; }
    public Guid OrderId { get; private set; }
    public DateTime UsedAt { get; private set; }

    protected PromotionUsage() { }

    public PromotionUsage(
        Guid promotionId,
        Guid? customerId,
        string? customerPhone,
        Guid orderId)
    {
        Id = Guid.NewGuid();
        PromotionId = promotionId;
        CustomerId = customerId;
        CustomerPhone = customerPhone;
        OrderId = orderId;
        UsedAt = DateTime.UtcNow;
        CreatedAt = UsedAt;
    }
}
