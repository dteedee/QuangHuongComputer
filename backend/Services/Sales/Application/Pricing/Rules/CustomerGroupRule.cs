using System.Text.Json;
using Content.Domain;

namespace Sales.Application.Pricing.Rules;

/// <summary>
/// ValueJson: chuỗi hoặc array chuỗi group name ("Personal","Student","Business").
/// So khớp không phân biệt hoa/thường.
/// </summary>
public class CustomerGroupRule : IPromotionRule
{
    public ConditionType HandledType => ConditionType.CustomerGroup;

    public bool Evaluate(PromotionCondition condition, PricingContext ctx)
    {
        var groups = ParseGroups(condition.ValueJson);
        if (groups.Count == 0) return true;
        if (string.IsNullOrEmpty(ctx.Customer.CustomerGroup)) return false;
        return groups.Contains(ctx.Customer.CustomerGroup);
    }

    private static HashSet<string> ParseGroups(string valueJson)
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(valueJson)) return set;
        try
        {
            using var doc = JsonDocument.Parse(valueJson);
            switch (doc.RootElement.ValueKind)
            {
                case JsonValueKind.String:
                    set.Add(doc.RootElement.GetString()!);
                    break;
                case JsonValueKind.Array:
                    foreach (var el in doc.RootElement.EnumerateArray())
                        if (el.ValueKind == JsonValueKind.String)
                            set.Add(el.GetString()!);
                    break;
            }
        }
        catch (JsonException)
        {
            set.Add(valueJson.Trim());
        }
        return set;
    }
}
