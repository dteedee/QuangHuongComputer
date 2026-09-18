namespace Catalog.Application.PcBuilder.Rules;

/// <summary>
/// Loại RAM (DDR4/DDR5) của Mainboard phải khớp từng thanh RAM đã chọn. Dữ liệu đo được: Mainboard
/// ghi khoá <c>ramType</c>, RAM lại ghi khoá <c>type</c> (lệch khoá, đã ghi ở spec-keys.md) - rule
/// này BẮT BUỘC đọc đúng hai khoá khác nhau, không phải lỗi.
/// </summary>
public static class RamTypeCompatibilityRule
{
    public const string RuleId = "ram-type";
    private const string MainboardKey = "ramType";
    private const string RamKey = "type";

    public static IReadOnlyList<PcRuleVerdict> Evaluate(PcBuildContext build)
    {
        var mainboard = build.FirstOrDefault("mainboard");
        var rams = build.AllOf("ram");
        if (mainboard == null || rams.Count == 0) return Array.Empty<PcRuleVerdict>();

        var hasMainboardType = mainboard.Spec.FilterAttributes.TryGetValue(MainboardKey, out var mainboardType);
        var results = new List<PcRuleVerdict>();

        foreach (var ram in rams)
        {
            var ruleName = $"Loại RAM - {ram.Sku}";
            var hasRamType = ram.Spec.FilterAttributes.TryGetValue(RamKey, out var ramType);

            if (!hasMainboardType || !hasRamType)
            {
                var missing = new List<string>();
                if (!hasMainboardType) missing.Add($"Mainboard ({mainboard.Sku}): thiếu '{MainboardKey}'");
                if (!hasRamType) missing.Add($"RAM ({ram.Sku}): thiếu '{RamKey}'");
                results.Add(new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.CannotVerify,
                    "Không đủ dữ liệu loại RAM để kiểm tra.", missing));
                continue;
            }

            var match = string.Equals(mainboardType, ramType, StringComparison.OrdinalIgnoreCase);
            results.Add(match
                ? new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.Compatible,
                    $"RAM {ramType} khớp chuẩn {mainboardType} của mainboard.")
                : new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.Incompatible,
                    $"Mainboard chỉ hỗ trợ {mainboardType} nhưng RAM {ram.Sku} là {ramType}."));
        }

        return results;
    }
}
