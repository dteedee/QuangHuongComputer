using BuildingBlocks.SharedKernel;

namespace Content.Domain;

/// <summary>
/// Một điều kiện ràng buộc để promotion được áp.
/// ValueJson linh hoạt tuỳ Type — rule handler tự parse ở tầng ứng dụng.
/// </summary>
public class PromotionCondition : Entity<Guid>
{
    public Guid PromotionId { get; private set; }
    public ConditionType Type { get; private set; }
    public ConditionOperator Operator { get; private set; }
    public string ValueJson { get; private set; } = string.Empty;

    protected PromotionCondition() { }

    internal PromotionCondition(
        Guid promotionId,
        ConditionType type,
        ConditionOperator op,
        string valueJson)
    {
        Id = Guid.NewGuid();
        PromotionId = promotionId;
        Type = type;
        Operator = op;
        ValueJson = valueJson ?? string.Empty;
        CreatedAt = DateTime.UtcNow;
    }
}

public enum ConditionType
{
    MinOrderValue = 1,
    Category = 2,
    Brand = 3,
    Product = 4,
    CustomerGroup = 5,
    TimeOfDay = 6,
    DayOfWeek = 7,
    FirstOrder = 8,
    Quantity = 9
}

public enum ConditionOperator
{
    Eq = 1,
    Gte = 2,
    Lte = 3,
    In = 4,
    Between = 5
}
