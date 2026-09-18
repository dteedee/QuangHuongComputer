namespace Catalog.Application.PcBuilder.Rules;

/// <summary>
/// CPU socket phải khớp Mainboard socket, và (nếu có) khớp Tản nhiệt. Dữ liệu đo được: CPU/Mainboard
/// ghi một giá trị đơn ("AM5", "LGA1851"); Tản nhiệt ghi DANH SÁCH gộp
/// ("Intel 115X/1200/1700/1851, AMD AM4/AM5") nên so bằng "chuỗi socket CPU có xuất hiện trong
/// chuỗi Tản nhiệt", không so bằng tuyệt đối.
/// </summary>
public static class SocketCompatibilityRule
{
    public const string CpuMainboardRuleId = "socket-cpu-mainboard";
    public const string CpuCoolerRuleId = "socket-cpu-cooler";
    private const string Key = "socket";

    public static IReadOnlyList<PcRuleVerdict> Evaluate(PcBuildContext build)
    {
        var results = new List<PcRuleVerdict>();

        var cpu = build.FirstOrDefault("cpu");
        var mainboard = build.FirstOrDefault("mainboard");
        if (cpu != null && mainboard != null)
            results.Add(EvaluatePair(CpuMainboardRuleId, cpu, mainboard, "CPU", "Mainboard", exactMatch: true));

        var cooler = build.FirstOrDefault("cooler");
        if (cpu != null && cooler != null)
            results.Add(EvaluatePair(CpuCoolerRuleId, cpu, cooler, "CPU", "Tản nhiệt", exactMatch: false));

        return results;
    }

    private static PcRuleVerdict EvaluatePair(
        string ruleId, PcResolvedComponent a, PcResolvedComponent b, string labelA, string labelB, bool exactMatch)
    {
        var ruleName = $"Socket {labelA}/{labelB}";
        var hasA = a.Spec.FilterAttributes.TryGetValue(Key, out var socketA);
        var hasB = b.Spec.FilterAttributes.TryGetValue(Key, out var socketB);

        if (!hasA || !hasB)
        {
            var missing = new List<string>();
            if (!hasA) missing.Add($"{labelA} ({a.Sku}): thiếu '{Key}'");
            if (!hasB) missing.Add($"{labelB} ({b.Sku}): thiếu '{Key}'");
            return new PcRuleVerdict(ruleId, ruleName, PcRuleVerdictKind.CannotVerify,
                $"Không đủ dữ liệu socket để kiểm tra {labelA} và {labelB}.", missing);
        }

        var match = exactMatch
            ? string.Equals(socketA, socketB, StringComparison.OrdinalIgnoreCase)
            : socketB!.Contains(socketA!, StringComparison.OrdinalIgnoreCase);

        return match
            ? new PcRuleVerdict(ruleId, ruleName, PcRuleVerdictKind.Compatible,
                $"{labelA} socket {socketA} khớp với {labelB} ({b.Sku}).")
            : new PcRuleVerdict(ruleId, ruleName, PcRuleVerdictKind.Incompatible,
                $"{labelA} dùng socket {socketA} nhưng {labelB} ({b.Sku}) chỉ hỗ trợ {socketB}.");
    }
}
