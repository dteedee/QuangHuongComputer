using Content.Domain;

namespace Sales.Application.Pricing.Rules;

/// <summary>ValueJson: array Guid brandId.</summary>
public class BrandRule : IPromotionRule
{
    public ConditionType HandledType => ConditionType.Brand;

    public bool Evaluate(PromotionCondition condition, PricingContext ctx)
    {
        var ids = CategoryRule.ParseGuidList(condition.ValueJson);
        if (ids.Count == 0) return true;
        return ctx.Lines.Any(l => l.BrandId.HasValue && ids.Contains(l.BrandId.Value));
    }
}
