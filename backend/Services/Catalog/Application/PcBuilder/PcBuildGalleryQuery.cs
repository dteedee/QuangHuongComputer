using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.PcBuilder;

public sealed record PcGalleryItemView(
    Guid ProductId, string Name, string? Sku, string? Slug, string? ImageUrl, string SlotId, string SlotLabel,
    int Quantity, decimal UnitPrice, bool IsAvailable, bool InStock);

public sealed record PcGalleryRuleView(string RuleId, string RuleName, string Verdict, string Message);

/// <summary>
/// Một thẻ "Cấu hình mẫu". <see cref="LiveTotal"/> = Σ giá HIỆN HÀNH × số lượng (không phải giá lúc
/// lưu), <see cref="OverallVerdict"/> chạy lại bộ luật tương thích trên dữ liệu hiện hành.
/// </summary>
public sealed record PcGalleryBuildView(
    Guid Id, string BuildCode, string Title, string UseCaseTag, string UseCaseLabel,
    bool IsFeatured, bool IsPublic, int SortOrder,
    decimal LiveTotal, decimal SavedTotal, string OverallVerdict, bool IsPurchasable,
    IReadOnlyList<PcGalleryRuleView> Issues, IReadOnlyList<PcGalleryItemView> Items);

/// <summary>
/// Đọc gallery: CHỈ bản ghi thoả <see cref="SavedPcBuild.IsPubliclyVisible"/> cho khách
/// (nhân viên xem tất cả cấu hình mẫu qua <c>includeHidden</c>). Giá + tương thích tính lại mỗi lần
/// đọc — gallery ít bản ghi (do nhân viên tuyển chọn) nên chi phí nhỏ, đổi lại không bao giờ hiện giá cũ.
/// </summary>
public static class PcBuildGalleryQuery
{
    public static async Task<IReadOnlyList<PcGalleryBuildView>> ListAsync(
        CatalogDbContext db, string? tag, decimal? minBudget, decimal? maxBudget, bool includeHidden, CancellationToken ct)
    {
        var query = db.SavedPcBuilds.AsNoTracking().Include(b => b.Items).AsQueryable();
        query = includeHidden
            ? query.Where(b => b.CustomerId == null && b.UseCaseTag != null)
            : query.Where(SavedPcBuild.IsPubliclyVisible);
        if (!string.IsNullOrWhiteSpace(tag)) query = query.Where(b => b.UseCaseTag == tag);

        var builds = await query
            .OrderByDescending(b => b.IsFeatured).ThenBy(b => b.SortOrder).ThenByDescending(b => b.CreatedAt)
            .Take(100)
            .ToListAsync(ct);

        var productIds = builds.SelectMany(b => b.Items.Select(i => i.ProductId)).Distinct().ToList();
        var display = await db.Products.WherePublished().AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Slug, p.ImageUrl })
            .ToDictionaryAsync(p => p.Id, ct);

        var result = new List<PcGalleryBuildView>(builds.Count);
        foreach (var build in builds)
        {
            var view = await BuildViewAsync(db, build, id => display.TryGetValue(id, out var d) ? (d.Slug, d.ImageUrl) : null, ct);
            if (minBudget.HasValue && view.LiveTotal < minBudget.Value) continue;
            if (maxBudget.HasValue && view.LiveTotal > maxBudget.Value) continue;
            result.Add(view);
        }

        return result;
    }

    private static async Task<PcGalleryBuildView> BuildViewAsync(
        CatalogDbContext db, SavedPcBuild build, Func<Guid, (string Slug, string? ImageUrl)?> display, CancellationToken ct)
    {
        var lines = build.Items.Select(i => new PcBuildLineDto(i.ProductId, i.Quantity)).ToList();
        var resolved = await PcBuildResolver.ResolveAsync(db, lines, ct);
        var evaluation = PcBuildEvaluator.Evaluate(resolved.Components);

        var items = build.Items.Select(i =>
        {
            var c = resolved.Components.FirstOrDefault(x => x.ProductId == i.ProductId);
            var d = display(i.ProductId);
            var slotId = c?.SlotId ?? i.ComponentType;
            return new PcGalleryItemView(i.ProductId, c?.Name ?? "Linh kiện không còn bán", c?.Sku, d?.Slug, d?.ImageUrl,
                slotId, PcBuilderSlotDefinitions.Find(slotId)?.Name ?? "Linh kiện khác", i.Quantity, c?.UnitPrice ?? i.UnitPrice,
                IsAvailable: c != null, InStock: c?.InStock ?? false);
        }).ToList();

        var issues = evaluation.Rules
            .Where(r => r.Verdict != PcRuleVerdictKind.Compatible)
            .Select(r => new PcGalleryRuleView(r.RuleId, r.RuleName, r.Verdict.ToString(), r.Message))
            .ToList();

        return new PcGalleryBuildView(
            build.Id, build.BuildCode, build.Name, build.UseCaseTag ?? string.Empty,
            PcBuildUseCaseTags.LabelOf(build.UseCaseTag), build.IsFeatured, build.IsPublic, build.SortOrder,
            LiveTotal: items.Where(i => i.IsAvailable).Sum(i => i.UnitPrice * i.Quantity),
            SavedTotal: build.TotalPrice,
            OverallVerdict: evaluation.OverallVerdict.ToString(),
            IsPurchasable: items.Count > 0 && items.All(i => i.IsAvailable && i.InStock),
            issues, items);
    }
}
