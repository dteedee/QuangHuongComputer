namespace Catalog.Application.PcBuilder.Rules;

/// <summary>
/// Kích thước Mainboard (<c>formFactor</c>, vd "ATX") phải nằm trong danh sách case hỗ trợ
/// (<c>motherboardSupport</c>, vd "E-ATX/ATX/Micro-ATX/Mini-ITX"). Dữ liệu đo được: không phải case
/// nào cũng có khoá <c>motherboardSupport</c> (một trong hai case mẫu chỉ có <c>formFactor</c> mô tả
/// KÍCH THƯỚC THÙNG của chính nó, vd "Mid-Tower ATX" - không phải danh sách mainboard hỗ trợ) -&gt;
/// rule PHẢI trả cannotVerify cho case đó thay vì suy diễn từ formFactor của case.
/// </summary>
public static class FormFactorCompatibilityRule
{
    public const string RuleId = "mainboard-case-form-factor";
    private const string MainboardKey = "formFactor";
    private const string CaseKey = "motherboardSupport";
    private static readonly char[] Separators = { '/', ',', ';' };

    public static IReadOnlyList<PcRuleVerdict> Evaluate(PcBuildContext build)
    {
        var mainboard = build.FirstOrDefault("mainboard");
        var pcCase = build.FirstOrDefault("case");
        if (mainboard == null || pcCase == null) return Array.Empty<PcRuleVerdict>();

        const string ruleName = "Kích thước mainboard/case";
        var hasMainboardForm = mainboard.Spec.FilterAttributes.TryGetValue(MainboardKey, out var mainboardForm);
        var hasCaseSupport = pcCase.Spec.FilterAttributes.TryGetValue(CaseKey, out var supported);

        if (!hasMainboardForm || !hasCaseSupport)
        {
            var missing = new List<string>();
            if (!hasMainboardForm) missing.Add($"Mainboard ({mainboard.Sku}): thiếu '{MainboardKey}'");
            if (!hasCaseSupport) missing.Add($"Case ({pcCase.Sku}): thiếu '{CaseKey}'");
            return new[]
            {
                new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.CannotVerify,
                    "Không đủ dữ liệu kích thước để kiểm tra mainboard và case.", missing)
            };
        }

        var supportedForms = supported!.Split(Separators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var match = supportedForms.Any(f =>
            f.Contains(mainboardForm!, StringComparison.OrdinalIgnoreCase) ||
            mainboardForm!.Contains(f, StringComparison.OrdinalIgnoreCase));

        return new[]
        {
            match
                ? new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.Compatible,
                    $"Case hỗ trợ {supported}, bao gồm chuẩn {mainboardForm} của mainboard.")
                : new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.Incompatible,
                    $"Case ({pcCase.Sku}) chỉ hỗ trợ {supported}, không có chuẩn {mainboardForm} của mainboard.")
        };
    }
}
