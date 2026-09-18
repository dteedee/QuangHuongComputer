using BuildingBlocks.Configuration;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.PcBuilder;

public sealed record PcBuilderSuggestionItem(string SlotId, string SlotName, Guid ProductId, string Name, string Sku, decimal Price);

public sealed record PcBuilderSuggestionResult(
    bool Success,
    decimal Budget,
    string UseCase,
    decimal TotalPrice,
    bool WithinBudget,
    IReadOnlyList<PcBuilderSuggestionItem> Items,
    PcBuildEvaluationResult? Evaluation,
    string? CannotSuggestReason);

/// <summary>
/// D10 (Decision updates, binding): thay "AI suggest" (chia ngân sách theo tỷ lệ, KHÔNG kiểm tương
/// thích - <c>AiPCBuilderEndpoints.cs</c> cũ) bằng bộ gợi ý rule-based: bảng phân bổ CÓ THỂ CẤU HÌNH
/// (<see cref="IAppSettings"/>, key <c>PcBuilder:Budget:&lt;useCase&gt;:&lt;slot&gt;</c>), mỗi lựa
/// chọn PHẢI qua <see cref="PcBuildEvaluator"/> (verdict != Incompatible) trước khi được chọn.
/// Không tìm đủ build hợp lệ -&gt; <c>cannotSuggest</c> kèm lý do, KHÔNG trả build một phần/bịa
/// (D12 "never fabricate"). Nhãn UI phải là "Gợi ý theo ngân sách" - không dùng chữ "AI" (D10).
/// </summary>
public static class PcBuilderBudgetAllocator
{
    // Thứ tự xử lý slot có chủ đích: linh kiện "gốc" (cpu) đi trước để socket/ramType/formFactor/
    // gpuLength của các slot sau có cái để đối chiếu ngay khi chọn (progressive constraint).
    private static readonly string[] AllocationOrder = { "cpu", "mainboard", "ram", "case", "vga", "psu", "storage", "cooler" };

    private static readonly IReadOnlyDictionary<string, decimal> DefaultRatios = new Dictionary<string, decimal>
    {
        ["cpu"] = 0.18m, ["mainboard"] = 0.12m, ["ram"] = 0.08m, ["vga"] = 0.30m,
        ["storage"] = 0.10m, ["psu"] = 0.08m, ["case"] = 0.08m, ["cooler"] = 0.06m,
    };

    private static readonly IReadOnlyDictionary<string, decimal> GamingRatios = new Dictionary<string, decimal>
    {
        ["cpu"] = 0.15m, ["mainboard"] = 0.10m, ["ram"] = 0.07m, ["vga"] = 0.40m,
        ["storage"] = 0.08m, ["psu"] = 0.08m, ["case"] = 0.07m, ["cooler"] = 0.05m,
    };

    public static async Task<PcBuilderSuggestionResult> SuggestAsync(
        CatalogDbContext db, IAppSettings settings, decimal budget, string? useCase, CancellationToken ct)
    {
        var normalizedUseCase = string.IsNullOrWhiteSpace(useCase) ? "vanphong" : useCase.Trim().ToLowerInvariant();
        var isGaming = normalizedUseCase.Contains("gaming") || normalizedUseCase.Contains("game");
        var baseRatios = isGaming ? GamingRatios : DefaultRatios;

        var chosen = new List<PcResolvedComponent>();
        var itemDtos = new List<PcBuilderSuggestionItem>();

        foreach (var slotId in AllocationOrder)
        {
            var slot = PcBuilderSlotDefinitions.Find(slotId)!;
            var ratio = settings.GetDecimal($"PcBuilder:Budget:{normalizedUseCase}:{slotId}", baseRatios.GetValueOrDefault(slotId, 0m));
            if (ratio <= 0) continue; // slot không có tỷ lệ trong bảng phân bổ của use-case này

            var slotBudget = budget * ratio;
            var candidate = await PickCompatibleCandidateAsync(db, slot, slotBudget, chosen, ct);

            if (candidate == null)
            {
                if (!slot.Required) continue; // vd VGA/tản nhiệt rời - build vẫn hợp lệ nếu thiếu
                return CannotSuggest(budget, normalizedUseCase,
                    $"Không tìm được {slot.Name} tương thích với các linh kiện đã chọn trong ngân sách.");
            }

            chosen.Add(candidate);
            itemDtos.Add(new PcBuilderSuggestionItem(slot.Id, slot.Name, candidate.ProductId, candidate.Name, candidate.Sku, candidate.UnitPrice));
        }

        var missingRequired = PcBuilderSlotDefinitions.RequiredSlotIds.Except(chosen.Select(c => c.SlotId)).ToList();
        if (missingRequired.Count > 0)
            return CannotSuggest(budget, normalizedUseCase,
                $"Ngân sách không đủ để chọn đủ linh kiện bắt buộc: {string.Join(", ", missingRequired)}.");

        var evaluation = PcBuildEvaluator.Evaluate(chosen);
        return new PcBuilderSuggestionResult(
            true, budget, normalizedUseCase, evaluation.TotalPrice, evaluation.TotalPrice <= budget,
            itemDtos, evaluation, CannotSuggestReason: null);
    }

    private static PcBuilderSuggestionResult CannotSuggest(decimal budget, string useCase, string reason) =>
        new(false, budget, useCase, 0, false, Array.Empty<PcBuilderSuggestionItem>(), null, reason);

    /// <summary>Trong ngân sách + đắt nhất có thể (best value); không ai trong ngân sách -&gt; rẻ nhất TƯƠNG THÍCH (không bao giờ trả hàng không tương thích chỉ vì rẻ).</summary>
    private static async Task<PcResolvedComponent?> PickCompatibleCandidateAsync(
        CatalogDbContext db, PcBuilderSlot slot, decimal slotBudget, IReadOnlyList<PcResolvedComponent> chosenSoFar, CancellationToken ct)
    {
        var category = await db.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Slug == slot.CategorySlug, ct);
        if (category == null) return null;

        var rows = await db.Products.WherePublished().AsNoTracking()
            .Where(p => p.CategoryId == category.Id && p.StockQuantity > 0)
            .Select(p => new { p.Id, p.Name, p.Sku, p.Price, p.Attributes })
            .ToListAsync(ct);

        var eligible = rows
            .Select(r => new { r, Spec = PcComponentSpec.Parse(r.Attributes) })
            .Where(x => slot.SubCategories == null ||
                        (x.Spec.SubCategory != null && slot.SubCategories.Contains(x.Spec.SubCategory, StringComparer.OrdinalIgnoreCase)))
            .Select(x => new PcResolvedComponent(x.r.Id, x.r.Name, x.r.Sku, slot.Id, 1, x.r.Price, true, x.Spec))
            .Where(c => PcBuildEvaluator.Evaluate(chosenSoFar.Append(c).ToList()).OverallVerdict != PcRuleVerdictKind.Incompatible)
            .ToList();

        if (eligible.Count == 0) return null;

        var withinBudget = eligible.Where(c => c.UnitPrice <= slotBudget).OrderByDescending(c => c.UnitPrice).FirstOrDefault();
        return withinBudget ?? eligible.OrderBy(c => c.UnitPrice).First();
    }
}
