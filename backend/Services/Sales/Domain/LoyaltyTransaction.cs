using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

/// <summary>
/// Một BÚT TOÁN điểm thưởng. Số dư của tài khoản phải luôn bằng tổng các bút toán ở đây — đó là
/// lý do mọi đường cộng/trừ điểm đều phải đi qua <c>LoyaltyLedger</c> chứ không sửa thẳng số dư.
/// Cột <c>ReversalOf</c> (shadow property, xem integration request W2-10) trỏ về bút toán gốc khi
/// điểm bị đảo do huỷ đơn / trả hàng, nên đảo hai lần là không thể.
/// </summary>
public class LoyaltyTransaction : Entity<Guid>
{
    public Guid AccountId { get; private set; }
    public LoyaltyTransactionType Type { get; private set; }
    public int Points { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public Guid? OrderId { get; private set; }
    public string? ReferenceCode { get; private set; }
    public int BalanceAfter { get; private set; }

    protected LoyaltyTransaction() { }

    public LoyaltyTransaction(
        Guid accountId,
        LoyaltyTransactionType type,
        int points,
        string description,
        Guid? orderId = null,
        string? referenceCode = null)
    {
        Id = Guid.NewGuid();
        AccountId = accountId;
        Type = type;
        Points = points;
        Description = description;
        OrderId = orderId;
        ReferenceCode = referenceCode;
        CreatedAt = DateTime.UtcNow;
    }

    public void SetBalanceAfter(int balance)
    {
        BalanceAfter = balance;
    }
}

public enum LoyaltyTransactionType
{
    Earn,        // Tích điểm khi mua hàng
    Redeem,      // Đổi điểm lấy giảm giá
    Expired,     // Điểm hết hạn
    Adjustment,  // Admin điều chỉnh
    Refund,      // Hoàn điểm khi trả hàng
    Bonus,       // Điểm thưởng (sinh nhật, sự kiện)
    Referral     // Điểm giới thiệu
}
