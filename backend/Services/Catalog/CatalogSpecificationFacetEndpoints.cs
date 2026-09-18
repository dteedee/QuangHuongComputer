using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Catalog;

/// <summary>
/// Facet lọc theo danh mục: `/categories/{id}/filters` - trả các attribute IsFilterable + danh
/// sách giá trị + số lượng. Đã unit-tested/ổn định trước W2-1 (Key Insight "keep, do not
/// redesign") - GIỮ NGUYÊN logic gốc, chỉ tách file.
/// </summary>
public static class CatalogSpecificationFacetEndpoints
{
    public static void MapCatalogSpecificationFacetEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapGet("/categories/{id:guid}/filters", async (
            Guid id, CatalogDbContext db, CancellationToken ct) =>
        {
            var attributes = await db.SpecificationAttributes.AsNoTracking()
                .Where(a => a.IsFilterable)
                .Where(a => db.SpecificationGroups
                    .Any(g => g.Id == a.GroupId && (g.CategoryId == null || g.CategoryId == id)))
                .OrderBy(a => a.SortOrder)
                .ToListAsync(ct);

            var productIds = await db.Products.AsNoTracking()
                .Where(p => p.CategoryId == id && p.IsActive)
                .Select(p => p.Id).ToListAsync(ct);
            if (productIds.Count == 0) return Results.Ok(Array.Empty<object>());

            var facets = new List<object>();
            foreach (var attr in attributes)
            {
                var query = db.ProductSpecificationValues.AsNoTracking()
                    .Where(v => v.AttributeId == attr.Id && productIds.Contains(v.ProductId));

                object valuesPayload;
                switch (attr.DataType)
                {
                    case SpecDataType.Number:
                        valuesPayload = await query
                            .Where(v => v.ValueNumber != null)
                            .GroupBy(v => v.ValueNumber)
                            .Select(g => new { value = g.Key, count = g.Count() })
                            .OrderBy(x => x.value)
                            .ToListAsync(ct);
                        break;
                    case SpecDataType.Boolean:
                        valuesPayload = await query
                            .Where(v => v.ValueBool != null)
                            .GroupBy(v => v.ValueBool)
                            .Select(g => new { value = (object?)g.Key, count = g.Count() })
                            .ToListAsync(ct);
                        break;
                    case SpecDataType.Enum:
                        valuesPayload = await query
                            .Where(v => v.ValueEnum != null)
                            .GroupBy(v => v.ValueEnum)
                            .Select(g => new { value = (object?)g.Key, count = g.Count() })
                            .OrderBy(x => (string)x.value!)
                            .ToListAsync(ct);
                        break;
                    default: // Text
                        valuesPayload = await query
                            .Where(v => v.ValueText != null)
                            .GroupBy(v => v.ValueText)
                            .Select(g => new { value = (object?)g.Key, count = g.Count() })
                            .OrderBy(x => (string)x.value!)
                            .ToListAsync(ct);
                        break;
                }

                facets.Add(new
                {
                    attributeId = attr.Id,
                    attributeKey = attr.Key,
                    attributeName = attr.Name,
                    unit = attr.Unit,
                    dataType = attr.DataType.ToString(),
                    values = valuesPayload,
                });
            }
            return Results.Ok(facets);
        });
    }
}
