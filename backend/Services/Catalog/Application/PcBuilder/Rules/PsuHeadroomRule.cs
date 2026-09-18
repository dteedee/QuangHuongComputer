namespace Catalog.Application.PcBuilder.Rules;

/// <summary>
/// Công suất nguồn (PSU) phải &gt;= tổng công suất tiêu thụ ước tính x 1.3 (Implementation Steps
/// #2: "PSU headroom (sum of TDP x 1.3)"). Dữ liệu đo được: PSU có khoá số <c>wattage</c> (công
/// suất NGUỒN CUNG CẤP), nhưng KHÔNG sản phẩm CPU/VGA nào trong 68 SP mẫu mang công suất TIÊU THỤ
/// (không có <c>tdpW</c>/<c>powerDrawW</c> hay tương đương trong 122 khoá đo được ở spec-keys.md)
/// -&gt; rule này LUÔN trả cannotVerify với dữ liệu thật hôm nay. Đây KHÔNG phải lỗi: bịa số TDP để
/// có một verdict "đẹp" vi phạm luật "never fabricate" (D12). Giữ rule thuần, unit-test được bằng
/// dữ liệu giả lập có tdpW/powerDrawW.
/// </summary>
public static class PsuHeadroomRule
{
    public const string RuleId = "psu-headroom";
    private const decimal HeadroomFactor = 1.3m;
    private const string PsuKey = "wattage";
    private const string CpuDrawKey = "tdpW";
    private const string GpuDrawKey = "powerDrawW";
    private static readonly string[] ConsumerSlots = { "cpu", "vga" };

    public static IReadOnlyList<PcRuleVerdict> Evaluate(PcBuildContext build)
    {
        var psu = build.FirstOrDefault("psu");
        var consumers = ConsumerSlots.SelectMany(build.AllOf).ToList();
        if (psu == null || consumers.Count == 0) return Array.Empty<PcRuleVerdict>();

        const string ruleName = "Công suất nguồn";
        var missing = new List<string>();
        var hasPsuWattage = psu.Spec.TryGetNumber(PsuKey, out var psuWattage);
        if (!hasPsuWattage) missing.Add($"PSU ({psu.Sku}): thiếu '{PsuKey}'");

        decimal totalDrawW = 0;
        foreach (var consumer in consumers)
        {
            var key = string.Equals(consumer.SlotId, "cpu", StringComparison.OrdinalIgnoreCase) ? CpuDrawKey : GpuDrawKey;
            if (consumer.Spec.TryGetNumber(key, out var draw))
                totalDrawW += draw;
            else
                missing.Add($"{consumer.Sku}: thiếu '{key}'");
        }

        if (missing.Count > 0)
        {
            return new[]
            {
                new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.CannotVerify,
                    "Không đủ dữ liệu công suất tiêu thụ (TDP) để tính nhu cầu nguồn.", missing)
            };
        }

        var requiredW = Math.Round(totalDrawW * HeadroomFactor, 0);
        return new[]
        {
            psuWattage >= requiredW
                ? new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.Compatible,
                    $"Nguồn {psuWattage}W đủ cho nhu cầu ước tính {requiredW}W (tổng {totalDrawW}W x hệ số an toàn 1.3).")
                : new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.Incompatible,
                    $"Nguồn {psuWattage}W thấp hơn nhu cầu ước tính {requiredW}W (tổng {totalDrawW}W x hệ số an toàn 1.3).")
        };
    }
}
