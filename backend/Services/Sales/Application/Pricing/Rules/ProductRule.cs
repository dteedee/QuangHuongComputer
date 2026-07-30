using Content.Domain;

namespace Sales.Application.Pricing.Rules;

/// <summary>ValueJson: array Guid productId. Thoả nếu ít nhất 1 line trùng productId.</summary>
public class ProductRule : IPromotionRule
{
    public ConditionType HandledType => ConditionType.Product;

    public bool Evaluate(PromotionCondition condition, PricingContext ctx)
    {
        var ids = CategoryRule.ParseGuidList(condition.ValueJson);
        if (ids.Count == 0) return true;
        return ctx.Lines.Any(l => ids.Contains(l.ProductId));
    }
}
