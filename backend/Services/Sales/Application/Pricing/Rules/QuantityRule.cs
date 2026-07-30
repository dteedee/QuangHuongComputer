using System.Text.Json;
using Content.Domain;

namespace Sales.Application.Pricing.Rules;

/// <summary>
/// ValueJson: số nguyên (vd: "3") hoặc {"quantity":3, "productId":"guid"}.
/// Operator Gte (mặc định): tổng số lượng >= giá trị. Với productId chỉ đếm dòng khớp.
/// </summary>
public class QuantityRule : IPromotionRule
{
    public ConditionType HandledType => ConditionType.Quantity;

    public bool Evaluate(PromotionCondition condition, PricingContext ctx)
    {
        var (qty, productId) = Parse(condition.ValueJson);
        var totalQty = productId.HasValue
            ? ctx.Lines.Where(l => l.ProductId == productId.Value).Sum(l => l.Quantity)
            : ctx.Lines.Sum(l => l.Quantity);

        return condition.Operator switch
        {
            ConditionOperator.Lte => totalQty <= qty,
            ConditionOperator.Eq => totalQty == qty,
            _ => totalQty >= qty,
        };
    }

    private static (int qty, Guid? productId) Parse(string valueJson)
    {
        if (int.TryParse(valueJson, out var direct)) return (direct, null);
        try
        {
            using var doc = JsonDocument.Parse(valueJson);
            var qty = doc.RootElement.TryGetProperty("quantity", out var qEl) ? qEl.GetInt32() : 0;
            Guid? pid = null;
            if (doc.RootElement.TryGetProperty("productId", out var pEl)
                && pEl.ValueKind == JsonValueKind.String
                && Guid.TryParse(pEl.GetString(), out var g))
                pid = g;
            return (qty, pid);
        }
        catch (JsonException)
        {
            return (0, null);
        }
    }
}
