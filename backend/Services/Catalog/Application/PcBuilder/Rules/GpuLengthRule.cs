namespace Catalog.Application.PcBuilder.Rules;

/// <summary>
/// Chiều dài VGA (mm) không được vượt quá chiều dài tối đa case cho phép. Dữ liệu đo được: Case có
/// khoá số <c>maxGpuLengthMm</c> (392, 410...) nhưng KHÔNG sản phẩm VGA nào trong 68 SP mẫu mang
/// chiều dài vật lý (chỉ có <c>vram</c>, <c>chipset</c>) -&gt; rule này LUÔN trả cannotVerify với dữ
/// liệu thật hôm nay; giữ nguyên vì Risk Assessment coi đây là câu trả lời đúng, không phải bịa số.
/// </summary>
public static class GpuLengthRule
{
    public const string RuleId = "case-gpu-length";
    private const string CaseKey = "maxGpuLengthMm";
    private const string GpuKey = "lengthMm";

    public static IReadOnlyList<PcRuleVerdict> Evaluate(PcBuildContext build)
    {
        var pcCase = build.FirstOrDefault("case");
        var vga = build.FirstOrDefault("vga");
        if (pcCase == null || vga == null) return Array.Empty<PcRuleVerdict>();

        const string ruleName = "Chiều dài VGA/case";
        var hasCaseMax = pcCase.Spec.TryGetNumber(CaseKey, out var maxLengthMm);
        var hasGpuLength = vga.Spec.TryGetNumber(GpuKey, out var gpuLengthMm);

        if (!hasCaseMax || !hasGpuLength)
        {
            var missing = new List<string>();
            if (!hasCaseMax) missing.Add($"Case ({pcCase.Sku}): thiếu '{CaseKey}'");
            if (!hasGpuLength) missing.Add($"VGA ({vga.Sku}): thiếu '{GpuKey}'");
            return new[]
            {
                new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.CannotVerify,
                    "Không đủ dữ liệu chiều dài để kiểm tra VGA có vừa case hay không.", missing)
            };
        }

        return new[]
        {
            gpuLengthMm <= maxLengthMm
                ? new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.Compatible,
                    $"VGA dài {gpuLengthMm}mm, case cho phép tối đa {maxLengthMm}mm.")
                : new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.Incompatible,
                    $"VGA dài {gpuLengthMm}mm vượt quá {maxLengthMm}mm mà case ({pcCase.Sku}) cho phép.")
        };
    }
}
