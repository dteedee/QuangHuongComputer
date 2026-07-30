using System.Text.Json;
using Content.Domain;

namespace Sales.Application.Pricing.Rules;

/// <summary>
/// ValueJson: {"from":"18:00","to":"23:00"} (24h, giờ theo <see cref="PricingContext.EvaluatedAt"/>).
/// Hỗ trợ khung vắt qua nửa đêm: from=22:00, to=02:00 → phủ 22-24 và 0-2.
/// </summary>
public class TimeOfDayRule : IPromotionRule
{
    public ConditionType HandledType => ConditionType.TimeOfDay;

    public bool Evaluate(PromotionCondition condition, PricingContext ctx)
    {
        if (!TryParse(condition.ValueJson, out var from, out var to))
            return true;

        var now = ctx.EvaluatedAt.TimeOfDay;
        if (from <= to)
            return now >= from && now <= to;
        return now >= from || now <= to; // wrap over midnight
    }

    private static bool TryParse(string valueJson, out TimeSpan from, out TimeSpan to)
    {
        from = default;
        to = default;
        if (string.IsNullOrWhiteSpace(valueJson)) return false;
        try
        {
            using var doc = JsonDocument.Parse(valueJson);
            if (!doc.RootElement.TryGetProperty("from", out var fromEl)) return false;
            if (!doc.RootElement.TryGetProperty("to", out var toEl)) return false;
            return TimeSpan.TryParse(fromEl.GetString(), out from)
                && TimeSpan.TryParse(toEl.GetString(), out to);
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
