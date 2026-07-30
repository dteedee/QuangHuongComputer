using BuildingBlocks.SharedKernel;
using BuildingBlocks.Validation;

namespace Content.Domain;

/// <summary>
/// Aggregate gốc của động cơ khuyến mãi thay thế Coupon/FlashSale đơn lẻ.
/// Hỗ trợ mã nhập tay + tự động, giảm %/tiền/freeship/mua X tặng Y/bậc thang,
/// điều kiện ràng buộc, hạn mức lượt dùng, độ ưu tiên và loại trừ.
/// </summary>
public class Promotion : Entity<Guid>
{
    /// <summary>null = tự động; có giá trị = mã nhập tay (uppercase).</summary>
    public string? Code { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public PromotionType Type { get; private set; }
    public PromotionStatus Status { get; private set; }

    public DateTime StartAt { get; private set; }
    public DateTime? EndAt { get; private set; }

    /// <summary>Ưu tiên xử lý — cao hơn áp trước.</summary>
    public int Priority { get; private set; } = 100;

    /// <summary>true → áp xong dừng, không cộng dồn.</summary>
    public bool IsExclusive { get; private set; }
    /// <summary>true → không cần Code, tự động áp khi thoả điều kiện.</summary>
    public bool IsAutomatic { get; private set; }

    public PromotionDiscountType DiscountType { get; private set; }
    public decimal DiscountValue { get; private set; }
    /// <summary>Trần giảm (bắt buộc khi DiscountType = Percent, chống bán lỗ).</summary>
    public decimal? MaxDiscountAmount { get; private set; }

    public int? MaxTotalUsage { get; private set; }
    public int? MaxUsagePerCustomer { get; private set; }
    /// <summary>Bộ đếm đã dùng (chỉ tăng khi đơn Paid/Confirmed thành công).</summary>
    public int CurrentUsage { get; private set; }

    /// <summary>null = toàn hệ thống, có Id = chỉ chi nhánh chỉ định.</summary>
    public Guid? StoreId { get; private set; }
    /// <summary>Personal | Student | Business — audience tag từ Phase 02.</summary>
    public string? AudienceTag { get; private set; }

    private readonly List<PromotionCondition> _conditions = new();
    public IReadOnlyCollection<PromotionCondition> Conditions => _conditions.AsReadOnly();

    private readonly List<PromotionReward> _rewards = new();
    public IReadOnlyCollection<PromotionReward> Rewards => _rewards.AsReadOnly();

    protected Promotion() { }

    private Promotion(
        Guid id,
        string? code,
        string name,
        string? description,
        PromotionType type,
        DateTime startAt,
        DateTime? endAt,
        PromotionDiscountType discountType,
        decimal discountValue,
        decimal? maxDiscountAmount,
        int priority,
        bool isExclusive,
        bool isAutomatic,
        int? maxTotalUsage,
        int? maxUsagePerCustomer,
        Guid? storeId,
        string? audienceTag)
    {
        Id = id;
        Code = string.IsNullOrWhiteSpace(code) ? null : code.Trim().ToUpperInvariant();
        Name = name;
        Description = description;
        Type = type;
        StartAt = startAt;
        EndAt = endAt;
        DiscountType = discountType;
        DiscountValue = discountValue;
        MaxDiscountAmount = maxDiscountAmount;
        Priority = priority;
        IsExclusive = isExclusive;
        IsAutomatic = isAutomatic;
        MaxTotalUsage = maxTotalUsage;
        MaxUsagePerCustomer = maxUsagePerCustomer;
        CurrentUsage = 0;
        StoreId = storeId;
        AudienceTag = audienceTag;
        Status = PromotionStatus.Draft;
        CreatedAt = DateTime.UtcNow;
    }

    /// <summary>Factory — validate chặt trước khi khởi tạo.</summary>
    public static Promotion Create(
        string? code,
        string name,
        string? description,
        PromotionType type,
        DateTime startAt,
        DateTime? endAt,
        PromotionDiscountType discountType,
        decimal discountValue,
        decimal? maxDiscountAmount,
        int priority = 100,
        bool isExclusive = false,
        bool isAutomatic = false,
        int? maxTotalUsage = null,
        int? maxUsagePerCustomer = null,
        Guid? storeId = null,
        string? audienceTag = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên khuyến mãi bắt buộc", nameof(name));

        if (type == PromotionType.Code && string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Promotion Type = Code phải có Code", nameof(code));

        if (type == PromotionType.Automatic && !string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Promotion tự động không được có Code", nameof(code));

        if (endAt.HasValue && endAt.Value <= startAt)
            throw new ArgumentException("EndAt phải lớn hơn StartAt");

        if (discountValue < 0)
            throw new ArgumentException("DiscountValue không được âm");

        // Percent BẮT BUỘC MaxDiscountAmount → chống bán lỗ khi đơn giá trị lớn.
        if (discountType == PromotionDiscountType.Percent)
        {
            if (discountValue > 100)
                throw new ArgumentException("Percent > 100 không hợp lệ");
            if (discountValue > 50)
                throw new InvalidOperationException(
                    "Cảnh báo bán lỗ: DiscountValue > 50%. Cần review thủ công.");
            if (!maxDiscountAmount.HasValue || maxDiscountAmount.Value <= 0)
                throw new ArgumentException(
                    "MaxDiscountAmount bắt buộc khi DiscountType = Percent",
                    nameof(maxDiscountAmount));
        }

        return new Promotion(
            Guid.NewGuid(), code, name, description, type,
            startAt, endAt, discountType, discountValue, maxDiscountAmount,
            priority, isExclusive, type == PromotionType.Automatic || isAutomatic,
            maxTotalUsage, maxUsagePerCustomer, storeId, audienceTag);
    }

    public void AddCondition(ConditionType type, ConditionOperator op, string valueJson)
    {
        _conditions.Add(new PromotionCondition(Id, type, op, valueJson));
        UpdatedAt = DateTime.UtcNow;
    }

    public void AddReward(Guid? productId, Guid? variantId, int quantity, decimal discountPercent = 100)
    {
        if (quantity <= 0)
            throw new ArgumentException("Reward quantity phải > 0");
        if (discountPercent < 0 || discountPercent > 100)
            throw new ArgumentException("DiscountPercent trong khoảng 0-100");

        _rewards.Add(new PromotionReward(Id, productId, variantId, quantity, discountPercent));
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        if (Status == PromotionStatus.Expired)
            throw new InvalidOperationException("Không thể kích hoạt promotion đã hết hạn");
        Status = PromotionStatus.Active;
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Pause()
    {
        Status = PromotionStatus.Paused;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Expire()
    {
        Status = PromotionStatus.Expired;
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Tăng bộ đếm sử dụng — CHỈ gọi trong transaction đặt hàng khi đơn Paid/Confirmed.
    /// Ném exception nếu vượt MaxTotalUsage (concurrency safeguard).
    /// </summary>
    public void IncrementUsage(int count = 1)
    {
        if (count <= 0) throw new ArgumentException("Count > 0");
        var next = CurrentUsage + count;
        if (MaxTotalUsage.HasValue && next > MaxTotalUsage.Value)
            throw new InvalidOperationException(
                $"Promotion {Code ?? Name} đã hết lượt sử dụng ({CurrentUsage}/{MaxTotalUsage}).");
        CurrentUsage = next;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Đang trong khung thời gian hiệu lực?</summary>
    public bool IsWithinSchedule(DateTime now)
    {
        if (now < StartAt) return false;
        if (EndAt.HasValue && now > EndAt.Value) return false;
        return true;
    }

    public bool IsRedeemable(DateTime now)
    {
        if (Status != PromotionStatus.Active) return false;
        if (!IsWithinSchedule(now)) return false;
        if (MaxTotalUsage.HasValue && CurrentUsage >= MaxTotalUsage.Value) return false;
        return true;
    }

    public ValidationResult Validate()
    {
        var result = new ValidationResult();

        if (string.IsNullOrWhiteSpace(Name))
            result.AddError(nameof(Name), "Tên bắt buộc");

        if (Type == PromotionType.Code && string.IsNullOrWhiteSpace(Code))
            result.AddError(nameof(Code), "Code bắt buộc cho Type=Code");

        if (EndAt.HasValue && EndAt.Value <= StartAt)
            result.AddError(nameof(EndAt), "EndAt phải sau StartAt");

        if (DiscountType == PromotionDiscountType.Percent && !MaxDiscountAmount.HasValue)
            result.AddError(nameof(MaxDiscountAmount), "MaxDiscountAmount bắt buộc cho Percent");

        return result;
    }
}

public enum PromotionType
{
    Code = 1,
    Automatic = 2,
    FlashSale = 3
}

public enum PromotionStatus
{
    Draft = 1,
    Active = 2,
    Paused = 3,
    Expired = 4
}

/// <summary>
/// Kiểu giảm giá cho Promotion. Đặt tên riêng (thay vì tái dùng DiscountType cũ)
/// để tách bạch mô hình mới, chống nhầm lẫn với Coupon/FlashSale legacy.
/// </summary>
public enum PromotionDiscountType
{
    Percent = 1,
    Fixed = 2,
    FreeShip = 3,
    BuyXGetY = 4,
    Tiered = 5
}
