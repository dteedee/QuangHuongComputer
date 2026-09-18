using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.PcBuilder;

/// <summary>Sản phẩm không tồn tại/đã ẩn (id không khớp query đã đăng web) -&gt; danh sách id để endpoint báo lỗi.</summary>
public sealed record PcBuildResolveResult(
    IReadOnlyList<PcResolvedComponent> Components,
    IReadOnlyList<Guid> UnknownProductIds);

/// <summary>
/// Nạp Product theo id + gắn slot theo (Category.Slug, Attributes.subCategory) - KHÔNG tin nhãn
/// <c>componentType</c> do client tự gửi (lỗ hổng của code cũ: client tự xưng "CPU" cho bất kỳ sản
/// phẩm nào, làm luật tương thích so sai thứ). Chỉ xét sản phẩm ĐÃ ĐĂNG WEB
/// (<see cref="Domain.ProductPublicationPolicy.WherePublished"/>, D10) - khách vãng lai không kiểm
/// tra tương thích trên hàng chưa công khai.
/// </summary>
public static class PcBuildResolver
{
    public static async Task<PcBuildResolveResult> ResolveAsync(
        CatalogDbContext db, IReadOnlyList<PcBuildLineDto> lines, CancellationToken ct = default)
    {
        var wanted = lines.Where(l => l.Quantity > 0).ToList();
        var ids = wanted.Select(l => l.ProductId).Distinct().ToList();

        var products = await db.Products.WherePublished().AsNoTracking()
            .Include(p => p.Category)
            .Where(p => ids.Contains(p.Id))
            .ToListAsync(ct);

        var resolved = new List<PcResolvedComponent>();
        var unknownIds = new List<Guid>();

        foreach (var line in wanted)
        {
            var product = products.FirstOrDefault(p => p.Id == line.ProductId);
            if (product == null)
            {
                unknownIds.Add(line.ProductId);
                continue;
            }

            var spec = PcComponentSpec.Parse(product.Attributes);
            var slot = PcBuilderSlotDefinitions.ResolveSlot(product.Category?.Slug, spec.SubCategory);

            resolved.Add(new PcResolvedComponent(
                ProductId: product.Id,
                Name: product.Name,
                Sku: product.Sku,
                SlotId: slot?.Id ?? "khac",
                Quantity: line.Quantity,
                UnitPrice: product.Price,
                InStock: product.StockQuantity > 0,
                Spec: spec));
        }

        return new PcBuildResolveResult(resolved, unknownIds);
    }
}
