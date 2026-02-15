using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

public class LoyaltyAccount : Entity<Guid>
{
    public string UserId { get; private set; } = string.Empty;
    public int TotalPoints { get; private set; }
    public int AvailablePoints { get; private set; }
    public int LifetimePoints { get; private set; }
    public LoyaltyTier Tier { get; private set; }
    public DateTime? LastActivityAt { get; private set; }
    public DateTime? TierExpiresAt { get; private set; }

    private readonly List<LoyaltyTransaction> _transactions = new();
    public IReadOnlyCollection<LoyaltyTransaction> Transactions => _transactions.AsReadOnly();

    protected LoyaltyAccount() { }

    public LoyaltyAccount(string userId)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        TotalPoints = 0;
        AvailablePoints = 0;
        LifetimePoints = 0;
        Tier = LoyaltyTier.Bronze;
        CreatedAt = DateTime.UtcNow;
    }

    public void EarnPoints(int points, string description, Guid? orderId = null, string? referenceCode = null)
    {
        if (points <= 0)
            throw new ArgumentException("Points must be positive", nameof(points));

        var transaction = new LoyaltyTransaction(
            accountId: Id,
            type: LoyaltyTransactionType.Earn,
            points: points,
            description: description,
            orderId: orderId,
            referenceCode: referenceCode
        );

        _transactions.Add(transaction);
        TotalPoints += points;
        AvailablePoints += points;
        LifetimePoints += points;
        LastActivityAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        UpdateTier();
    }

    public void RedeemPoints(int points, string description, Guid? orderId = null, string? referenceCode = null)
    {
        if (points <= 0)
            throw new ArgumentException("Points must be positive", nameof(points));

        if (points > AvailablePoints)
            throw new InvalidOperationException($"Insufficient points. Available: {AvailablePoints}, Requested: {points}");

        var transaction = new LoyaltyTransaction(
            accountId: Id,
            type: LoyaltyTransactionType.Redeem,
            points: -points,
            description: description,
            orderId: orderId,
            referenceCode: referenceCode
        );

        _transactions.Add(transaction);
        AvailablePoints -= points;
        LastActivityAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ExpirePoints(int points, string description)
    {
        if (points <= 0 || points > AvailablePoints)
            return;

        var transaction = new LoyaltyTransaction(
            accountId: Id,
            type: LoyaltyTransactionType.Expired,
            points: -points,
            description: description
        );

        _transactions.Add(transaction);
        AvailablePoints -= points;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AdjustPoints(int points, string description, string adjustedBy)
    {
        var transaction = new LoyaltyTransaction(
            accountId: Id,
            type: LoyaltyTransactionType.Adjustment,
            points: points,
            description: $"{description} (by {adjustedBy})"
        );

        _transactions.Add(transaction);
        AvailablePoints += points;
        TotalPoints += points;
        if (points > 0) LifetimePoints += points;
        UpdatedAt = DateTime.UtcNow;

        UpdateTier();
    }

    public void RefundPoints(int points, string description, Guid? orderId = null)
    {
        if (points <= 0)
            throw new ArgumentException("Points must be positive", nameof(points));

        var transaction = new LoyaltyTransaction(
            accountId: Id,
            type: LoyaltyTransactionType.Refund,
            points: points,
            description: description,
            orderId: orderId
        );

        _transactions.Add(transaction);
        AvailablePoints += points;
        UpdatedAt = DateTime.UtcNow;
    }

    private void UpdateTier()
    {
        var newTier = LifetimePoints switch
        {
            >= 100000 => LoyaltyTier.Diamond,
            >= 50000 => LoyaltyTier.Platinum,
            >= 20000 => LoyaltyTier.Gold,
            >= 5000 => LoyaltyTier.Silver,
            _ => LoyaltyTier.Bronze
        };

        if (newTier != Tier)
        {
            Tier = newTier;
            TierExpiresAt = DateTime.UtcNow.AddYears(1);
        }
    }

    public decimal GetPointsMultiplier()
    {
        return Tier switch
        {
            LoyaltyTier.Diamond => 2.0m,
            LoyaltyTier.Platinum => 1.75m,
            LoyaltyTier.Gold => 1.5m,
            LoyaltyTier.Silver => 1.25m,
            _ => 1.0m
        };
    }

    public static int CalculatePointsForOrder(decimal orderAmount, decimal multiplier = 1.0m)
    {
        // 1 point per 10,000 VND spent
        var basePoints = (int)(orderAmount / 10000);
        return (int)(basePoints * multiplier);
    }

    public static decimal CalculateRedemptionValue(int points)
    {
        // 1 point = 100 VND discount
        return points * 100m;
    }
}

public enum LoyaltyTier
{
    Bronze = 0,    // 0 - 4,999 points
    Silver = 1,    // 5,000 - 19,999 points
    Gold = 2,      // 20,000 - 49,999 points
    Platinum = 3,  // 50,000 - 99,999 points
    Diamond = 4    // 100,000+ points
}

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
