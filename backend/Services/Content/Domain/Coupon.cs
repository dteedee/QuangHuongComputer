using BuildingBlocks.SharedKernel;

namespace Content.Domain;

public class Coupon : Entity<Guid>
{
    public string Code { get; private set; }
    public string Description { get; private set; }
    public DiscountType Type { get; private set; }
    public decimal Value { get; private set; } // Amt or Percentage
    public decimal? MinOrderAmount { get; private set; }
    public decimal? MaxDiscountAmount { get; private set; }
    public DateTime StartDate { get; private set; }
    public DateTime? EndDate { get; private set; }
    public int? UsageLimit { get; private set; }
    public int UsageCount { get; private set; }
    public bool IsActive { get; private set; }

    protected Coupon() { }

    public Coupon(
        string code, 
        string description, 
        DiscountType type, 
        decimal value, 
        decimal minOrderAmount,
        decimal? maxDiscountAmount,
        DateTime startDate, 
        DateTime endDate,
        int? usageLimit = null)
    {
        Id = Guid.NewGuid();
        Code = code.ToUpper();
        Description = description;
        Type = type;
        Value = value;
        MinOrderAmount = minOrderAmount;
        MaxDiscountAmount = maxDiscountAmount;
        StartDate = startDate;
        EndDate = endDate;
        UsageLimit = usageLimit;
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public bool IsValid(decimal orderAmount)
    {
        if (!IsActive) return false;
        if (DateTime.UtcNow < StartDate) return false;
        if (EndDate.HasValue && DateTime.UtcNow > EndDate) return false;
        if (UsageLimit.HasValue && UsageCount >= UsageLimit) return false;
        if (MinOrderAmount.HasValue && orderAmount < MinOrderAmount) return false;
        return true;
    }

    public void IncrementUsage()
    {
        UsageCount++;
    }
}

public enum DiscountType
{
    Percentage,
    FixedAmount
}
