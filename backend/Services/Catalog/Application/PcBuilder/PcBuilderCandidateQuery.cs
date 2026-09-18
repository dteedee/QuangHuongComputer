using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Repository;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.PcBuilder;

/// <summary>Một ứng viên cho một slot, kèm verdict nhanh so với build hiện tại (để FE tô màu).</summary>
public sealed record PcCandidateDto(
    Guid ProductId,
    string Name,
    string Sku,
    string Slug,
    decimal Price,
    decimal? OldPrice,
    string? ImageUrl,
    bool InStock,
    IReadOnlyDictionary<string, string> FilterAttributes,
    PcRuleVerdictKind Compatibility);

/// <summary>
/// <c>GET .../candidates</c>: lọc SQL-side theo CategoryId (FK thật, có index) + đã đăng web +
/// còn hàng-trước (Implementation Steps #3), rồi tinh lọc theo subCategory + tương thích với build
/// hiện tại TRÊN tập đã thu hẹp. Với 68-70 sản phẩm/danh mục &lt;= ~25 dòng, việc lọc
/// subCategory/spec trong tiến trình là hợp lý và tránh rủi ro dịch LINQ -&gt; toán tử jsonb Postgres
/// chưa được kiểm chứng cho lô nhỏ này (ghi rõ trong báo cáo track, không giấu).
/// </summary>
public static class PcBuilderCandidateQuery
{
    public static async Task<PagedResult<PcCandidateDto>> RunAsync(
        CatalogDbContext db,
        string slotId,
        IReadOnlyList<PcResolvedComponent> currentBuild,
        PagedRequest paging,
        CancellationToken ct)
    {
        var slot = PcBuilderSlotDefinitions.Find(slotId)
            ?? throw new RequestValidationException("slot", $"Không rõ nhóm linh kiện '{slotId}'.");

        var category = await db.Categories.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Slug == slot.CategorySlug, ct);
        if (category == null)
            return new PagedResult<PcCandidateDto>(new List<PcCandidateDto>(), 0, paging.Page, paging.PageSize);

        var rows = await db.Products.WherePublished().AsNoTracking()
            .Where(p => p.CategoryId == category.Id)
            .Select(p => new
            {
                p.Id, p.Name, p.Sku, p.Slug, p.Price, p.OldPrice,
                p.ImageUrl, p.StockQuantity, p.Attributes
            })
            .ToListAsync(ct);

        // Build hiện tại KHÔNG kể chính slot đang duyệt - candidate thay thế mục cũ của slot đó,
        // không cộng dồn với nó khi tính tương thích thử.
        var otherComponents = currentBuild.Where(c => !string.Equals(c.SlotId, slotId, StringComparison.OrdinalIgnoreCase)).ToList();

        var candidates = rows
            .Select(r => new { r, Spec = PcComponentSpec.Parse(r.Attributes) })
            .Where(x => slot.SubCategories == null ||
                        (x.Spec.SubCategory != null && slot.SubCategories.Contains(x.Spec.SubCategory, StringComparer.OrdinalIgnoreCase)))
            .Select(x => ToCandidateDto(x.r.Id, x.r.Name, x.r.Sku, x.r.Slug, x.r.Price, x.r.OldPrice,
                x.r.ImageUrl, x.r.StockQuantity, x.Spec, slotId, otherComponents))
            // Chỉ loại ứng viên ĐÃ CHỨNG MINH không tương thích - compatible và cannotVerify đều
            // giữ lại (honesty rule của phase-47: cannotVerify không phải là incompatible).
            .Where(c => c.Compatibility != PcRuleVerdictKind.Incompatible)
            .OrderByDescending(c => c.InStock)
            .ThenBy(c => c.Price)
            .ToList();

        return candidates.ToPagedResult(paging);
    }

    private static PcCandidateDto ToCandidateDto(
        Guid id, string name, string sku, string slug, decimal price, decimal? oldPrice,
        string? imageUrl, int stockQuantity, PcComponentSpec spec, string slotId,
        IReadOnlyList<PcResolvedComponent> otherComponents)
    {
        var trialComponent = new PcResolvedComponent(id, name, sku, slotId, 1, price, stockQuantity > 0, spec);
        var trial = PcBuildEvaluator.Evaluate(otherComponents.Append(trialComponent).ToList());

        return new PcCandidateDto(
            id, name, sku, slug, price, oldPrice, imageUrl, stockQuantity > 0,
            spec.FilterAttributes, trial.OverallVerdict);
    }
}
