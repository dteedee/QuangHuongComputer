using Content.Domain;

namespace Sales.Application.Pricing;

/// <summary>
/// Contract cho một rule kiểm tra 1 loại điều kiện <see cref="ConditionType"/>.
/// Mỗi rule độc lập → dễ test, dễ mở rộng thêm loại điều kiện mới.
/// </summary>
public interface IPromotionRule
{
    ConditionType HandledType { get; }
    bool Evaluate(PromotionCondition condition, PricingContext ctx);
}
