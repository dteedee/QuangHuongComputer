namespace Catalog.Application.PcBuilder.Rules;

/// <summary>
/// Số SSD chuẩn NVMe/M.2 đã chọn không được vượt quá số khe M.2 của mainboard (Implementation Steps
/// #2, luật thứ 6 "M.2 slots"). Dữ liệu đo được: KHÔNG mainboard nào trong 68 SP mẫu mang số khe
/// M.2 (không có khoá <c>m2Slots</c> trong 122 khoá đo được ở spec-keys.md) -&gt; rule này LUÔN trả
/// cannotVerify khi build có SSD NVMe, với dữ liệu thật hôm nay. Ổ SATA (HDD/SSD 2.5") không cần
/// khe M.2 nên không kích hoạt rule.
/// </summary>
public static class M2SlotRule
{
    public const string RuleId = "mainboard-m2-slots";
    private const string MainboardKey = "m2Slots";
    private const string StorageInterfaceKey = "interface";

    public static IReadOnlyList<PcRuleVerdict> Evaluate(PcBuildContext build)
    {
        var mainboard = build.FirstOrDefault("mainboard");
        var nvmeDrives = build.AllOf("storage")
            .Where(s => s.Spec.FilterAttributes.TryGetValue(StorageInterfaceKey, out var iface)
                        && iface.Contains("NVMe", StringComparison.OrdinalIgnoreCase))
            .ToList();
        if (mainboard == null || nvmeDrives.Count == 0) return Array.Empty<PcRuleVerdict>();

        const string ruleName = "Khe M.2";
        var hasSlotCount = mainboard.Spec.TryGetNumber(MainboardKey, out var slotCount);
        if (!hasSlotCount)
        {
            return new[]
            {
                new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.CannotVerify,
                    $"Không rõ số khe M.2 của mainboard ({mainboard.Sku}) để đối chiếu {nvmeDrives.Count} SSD NVMe đã chọn.",
                    new[] { $"Mainboard ({mainboard.Sku}): thiếu '{MainboardKey}'" })
            };
        }

        return new[]
        {
            nvmeDrives.Count <= slotCount
                ? new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.Compatible,
                    $"Mainboard có {slotCount} khe M.2, đủ cho {nvmeDrives.Count} SSD NVMe đã chọn.")
                : new PcRuleVerdict(RuleId, ruleName, PcRuleVerdictKind.Incompatible,
                    $"Mainboard ({mainboard.Sku}) chỉ có {slotCount} khe M.2 nhưng đã chọn {nvmeDrives.Count} SSD NVMe.")
        };
    }
}
