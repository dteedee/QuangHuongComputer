using Catalog.Application.PcBuilder;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Endpoints.PcBuilder;

/// <summary><c>GET /api/catalog/pc-builder/slots</c> - danh sách khay linh kiện + số ứng viên hiện có (đã đăng web, còn hàng).</summary>
public static class PcBuilderSlotsEndpoint
{
    public static void MapPcBuilderSlots(this IEndpointRouteBuilder app)
    {
        app.MapGet("/slots", async (CatalogDbContext db, CancellationToken ct) =>
        {
            var categorySlugs = PcBuilderSlotDefinitions.Slots.Select(s => s.CategorySlug).Distinct().ToList();
            var categories = await db.Categories.AsNoTracking()
                .Where(c => categorySlugs.Contains(c.Slug))
                .Select(c => new { c.Id, c.Slug })
                .ToListAsync(ct);

            var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var category in categories)
            {
                var rows = await db.Products.WherePublished().AsNoTracking()
                    .Where(p => p.CategoryId == category.Id)
                    .Select(p => new { p.Attributes, p.StockQuantity })
                    .ToListAsync(ct);

                foreach (var slot in PcBuilderSlotDefinitions.Slots.Where(s => s.CategorySlug == category.Slug))
                {
                    var count = rows.Count(r =>
                    {
                        if (slot.SubCategories == null) return true;
                        var spec = PcComponentSpec.Parse(r.Attributes);
                        return spec.SubCategory != null && slot.SubCategories.Contains(spec.SubCategory, StringComparer.OrdinalIgnoreCase);
                    });
                    counts[slot.Id] = count;
                    var inStockCount = rows.Count(r =>
                    {
                        if (r.StockQuantity <= 0) return false;
                        if (slot.SubCategories == null) return true;
                        var spec = PcComponentSpec.Parse(r.Attributes);
                        return spec.SubCategory != null && slot.SubCategories.Contains(spec.SubCategory, StringComparer.OrdinalIgnoreCase);
                    });
                    counts[slot.Id + ":inStock"] = inStockCount;
                }
            }

            var payload = PcBuilderSlotDefinitions.Slots.Select(s => new
            {
                id = s.Id,
                name = s.Name,
                categorySlug = s.CategorySlug,
                subCategories = s.SubCategories,
                required = s.Required,
                allowMultiple = s.AllowMultiple,
                maxQuantity = s.MaxQuantity,
                candidateCount = counts.GetValueOrDefault(s.Id, 0),
                inStockCandidateCount = counts.GetValueOrDefault(s.Id + ":inStock", 0),
            });

            return Results.Ok(new { slots = payload });
        });
    }
}
