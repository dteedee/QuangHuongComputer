using Catalog.Application.PcBuilder.Rules;

namespace Catalog.Application.PcBuilder;

/// <summary>Verdict tổng + chi tiết từng luật + tổng tiền + payload thêm-vào-giỏ cho W3-9.</summary>
public sealed record PcBuildEvaluationResult(
    PcRuleVerdictKind OverallVerdict,
    IReadOnlyList<PcRuleVerdict> Rules,
    decimal TotalPrice,
    int? EstimatedWattageW,
    IReadOnlyList<PcBuildLineDto> CartPayload);

/// <summary>
/// Điểm vào duy nhất chạy toàn bộ 6 luật (Implementation Steps #2) trên một build đã phân giải.
/// Pure function - không chạm DB, không side effect - nên unit-test được thẳng với dữ liệu giả lập,
/// tách biệt khỏi việc dữ liệu thật hôm nay có đủ hay không (xem từng rule).
/// </summary>
public static class PcBuildEvaluator
{
    public static PcBuildEvaluationResult Evaluate(IReadOnlyList<PcResolvedComponent> components)
    {
        var context = new PcBuildContext(components);

        var verdicts = new List<PcRuleVerdict>();
        verdicts.AddRange(SocketCompatibilityRule.Evaluate(context));
        verdicts.AddRange(RamTypeCompatibilityRule.Evaluate(context));
        verdicts.AddRange(FormFactorCompatibilityRule.Evaluate(context));
        verdicts.AddRange(GpuLengthRule.Evaluate(context));
        verdicts.AddRange(PsuHeadroomRule.Evaluate(context));
        verdicts.AddRange(M2SlotRule.Evaluate(context));

        var overall = verdicts.Any(v => v.Verdict == PcRuleVerdictKind.Incompatible)
            ? PcRuleVerdictKind.Incompatible
            : verdicts.Any(v => v.Verdict == PcRuleVerdictKind.CannotVerify)
                ? PcRuleVerdictKind.CannotVerify
                : PcRuleVerdictKind.Compatible;

        var totalPrice = components.Sum(c => c.UnitPrice * c.Quantity);

        // Luôn null: không sản phẩm nào trong dữ liệu thật hôm nay mang TDP/công suất tiêu thụ
        // (xem PsuHeadroomRule). Trả 0 hay một số áng chừng sẽ là bịa dữ liệu (D12 "never fabricate").
        int? estimatedWattageW = null;

        var cartPayload = components.Select(c => new PcBuildLineDto(c.ProductId, c.Quantity)).ToList();

        return new PcBuildEvaluationResult(overall, verdicts, totalPrice, estimatedWattageW, cartPayload);
    }
}
