using System.Text.Json;
using Content.Domain;

namespace Sales.Application.Pricing.Rules;

/// <summary>
/// ValueJson: số tiền tối thiểu (vd: "5000000") hoặc {"amount": 5000000}.
/// Operator hỗ trợ Gte (mặc định) / Lte / Eq.
/// </summary>
public class MinOrderValueRule : IPromotionRule
{
    public ConditionType HandledType => ConditionType.MinOrderValue;

    public bool Evaluate(PromotionCondition condition, PricingContext ctx)
    {
        var value = ParseAmount(condition.ValueJson);
        return condition.Operator switch
        {
            ConditionOperator.Lte => ctx.Subtotal <= value,
            ConditionOperator.Eq => ctx.Subtotal == value,
            _ => ctx.Subtotal >= value, // Gte fallback
        };
    }

    private static decimal ParseAmount(string valueJson)
    {
        if (decimal.TryParse(valueJson, out var direct)) return direct;
        try
        {
            using var doc = JsonDocument.Parse(valueJson);
            if (doc.RootElement.TryGetProperty("amount", out var el))
                return el.GetDecimal();
            if (doc.RootElement.ValueKind == JsonValueKind.Number)
                return doc.RootElement.GetDecimal();
        }
        catch (JsonException) { }
        return 0m;
    }
}
