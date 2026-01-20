using BuildingBlocks.SharedKernel;
using BuildingBlocks.Validation;

namespace Content.Domain;

public class Coupon : Entity<Guid>
{
    public string Code { get; private set; }
    public DiscountType DiscountType { get; private set; }
    public decimal DiscountValue { get; private set; }
    public decimal? MinPurchase { get; private set; }
    public decimal? MaxDiscount { get; private set; }
    public DateTime ValidFrom { get; private set; }
    public DateTime ValidTo { get; private set; }
    public int? UsageLimit { get; private set; }
    public int UsedCount { get; private set; }

    protected Coupon() { }

    public Coupon(
        string code,
        DiscountType discountType,
        decimal discountValue,
        decimal? minPurchase,
        decimal? maxDiscount,
        DateTime validFrom,
        DateTime validTo,
        int? usageLimit = null)
    {
        Id = Guid.NewGuid();
        Code = code.ToUpper();
        DiscountType = discountType;
        DiscountValue = discountValue;
        MinPurchase = minPurchase;
        MaxDiscount = maxDiscount;
        ValidFrom = validFrom;
        ValidTo = validTo;
        UsageLimit = usageLimit;
        UsedCount = 0;
        CreatedAt = DateTime.UtcNow;
    }

    public bool IsValid()
    {
        var now = DateTime.UtcNow;

        if (!IsActive)
            return false;

        if (now < ValidFrom)
            return false;

        if (now > ValidTo)
            return false;

        if (UsageLimit.HasValue && UsedCount >= UsageLimit)
            return false;

        return true;
    }

    public bool IsValid(decimal orderAmount)
    {
        if (!IsValid())
            return false;

        if (MinPurchase.HasValue && orderAmount < MinPurchase)
            return false;

        return true;
    }

    public void Apply()
    {
        if (!IsValid())
            throw new InvalidOperationException("Cannot apply invalid coupon");

        UsedCount++;
        UpdatedAt = DateTime.UtcNow;
    }

    public decimal CalculateDiscount(decimal orderAmount)
    {
        if (!IsValid(orderAmount))
            return 0;

        decimal discount = DiscountType switch
        {
            DiscountType.Percentage => orderAmount * (DiscountValue / 100m),
            DiscountType.Fixed => DiscountValue,
            _ => 0
        };

        if (MaxDiscount.HasValue && discount > MaxDiscount.Value)
        {
            discount = MaxDiscount.Value;
        }

        return discount;
    }

    public void UpdateDetails(
        DiscountType discountType,
        decimal discountValue,
        decimal? minPurchase,
        decimal? maxDiscount,
        DateTime validFrom,
        DateTime validTo,
        int? usageLimit)
    {
        DiscountType = discountType;
        DiscountValue = discountValue;
        MinPurchase = minPurchase;
        MaxDiscount = maxDiscount;
        ValidFrom = validFrom;
        ValidTo = validTo;
        UsageLimit = usageLimit;
        UpdatedAt = DateTime.UtcNow;
    }

    public ValidationResult Validate()
    {
        var result = new ValidationResult();

        if (!CommonValidators.IsNotEmpty(Code))
        {
            result.AddError(nameof(Code), "Code is required");
        }
        else if (!CommonValidators.IsMaxLength(Code, 50))
        {
            result.AddError(nameof(Code), "Code must not exceed 50 characters");
        }

        if (!CommonValidators.IsPositive(DiscountValue))
        {
            result.AddError(nameof(DiscountValue), "Discount value must be positive");
        }

        if (DiscountType == DiscountType.Percentage && DiscountValue > 100)
        {
            result.AddError(nameof(DiscountValue), "Percentage discount cannot exceed 100%");
        }

        if (MinPurchase.HasValue && !CommonValidators.IsNonNegative(MinPurchase.Value))
        {
            result.AddError(nameof(MinPurchase), "Minimum purchase must be non-negative");
        }

        if (MaxDiscount.HasValue && !CommonValidators.IsPositive(MaxDiscount.Value))
        {
            result.AddError(nameof(MaxDiscount), "Maximum discount must be positive");
        }

        if (ValidFrom >= ValidTo)
        {
            result.AddError(nameof(ValidTo), "Valid to date must be after valid from date");
        }

        if (UsageLimit.HasValue && UsageLimit.Value <= 0)
        {
            result.AddError(nameof(UsageLimit), "Usage limit must be positive");
        }

        return result;
    }
}

public enum DiscountType
{
    Percentage,
    Fixed
}
