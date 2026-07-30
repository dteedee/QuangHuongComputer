using Content.Domain;

namespace Sales.Application.Pricing.Rules;

/// <summary>ValueJson bỏ qua. Thoả khi <see cref="CustomerContext.IsFirstOrder"/> = true.</summary>
public class FirstOrderRule : IPromotionRule
{
    public ConditionType HandledType => ConditionType.FirstOrder;

    public bool Evaluate(PromotionCondition condition, PricingContext ctx)
        => ctx.Customer.IsFirstOrder;
}
