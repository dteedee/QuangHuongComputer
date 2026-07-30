using System.Text.Json;
using Content.Domain;

namespace Sales.Application.Pricing.Rules;

/// <summary>
/// ValueJson: array int (0=Sunday..6=Saturday) hoặc array chuỗi ("Monday",...).
/// Vd: [1,2,3,4,5] cho các ngày trong tuần.
/// </summary>
public class DayOfWeekRule : IPromotionRule
{
    public ConditionType HandledType => ConditionType.DayOfWeek;

    public bool Evaluate(PromotionCondition condition, PricingContext ctx)
    {
        var days = ParseDays(condition.ValueJson);
        if (days.Count == 0) return true;
        return days.Contains(ctx.EvaluatedAt.DayOfWeek);
    }

    private static HashSet<DayOfWeek> ParseDays(string valueJson)
    {
        var set = new HashSet<DayOfWeek>();
        if (string.IsNullOrWhiteSpace(valueJson)) return set;
        try
        {
            using var doc = JsonDocument.Parse(valueJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return set;
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var i)
                    && i >= 0 && i <= 6)
                    set.Add((DayOfWeek)i);
                else if (el.ValueKind == JsonValueKind.String
                    && Enum.TryParse<DayOfWeek>(el.GetString(), true, out var d))
                    set.Add(d);
            }
        }
        catch (JsonException) { }
        return set;
    }
}
