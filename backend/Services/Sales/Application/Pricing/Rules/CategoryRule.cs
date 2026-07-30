using System.Text.Json;
using Content.Domain;

namespace Sales.Application.Pricing.Rules;

/// <summary>
/// ValueJson: array Guid categoryId, ví dụ ["guid1","guid2"].
/// Operator In (mặc định): thoả nếu ít nhất 1 line thuộc category trong list.
/// </summary>
public class CategoryRule : IPromotionRule
{
    public ConditionType HandledType => ConditionType.Category;

    public bool Evaluate(PromotionCondition condition, PricingContext ctx)
    {
        var ids = ParseGuidList(condition.ValueJson);
        if (ids.Count == 0) return true;
        return ctx.Lines.Any(l => l.CategoryId.HasValue && ids.Contains(l.CategoryId.Value));
    }

    internal static HashSet<Guid> ParseGuidList(string valueJson)
    {
        var result = new HashSet<Guid>();
        if (string.IsNullOrWhiteSpace(valueJson)) return result;
        try
        {
            using var doc = JsonDocument.Parse(valueJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return result;
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                if (el.ValueKind == JsonValueKind.String &&
                    Guid.TryParse(el.GetString(), out var g))
                    result.Add(g);
            }
        }
        catch (JsonException) { }
        return result;
    }
}
