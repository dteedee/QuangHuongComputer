using Catalog.Application.Specifications;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Catalog;

/// <summary>
/// Endpoint thông số kỹ thuật: group / attribute + facet lọc động cho danh mục.
/// Facet trả về cho endpoint /categories/{id}/filters dùng cho UI lọc tự động.
/// </summary>
public static class CatalogSpecificationEndpoints
{
    public static void MapCatalogSpecificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog");

        // Toàn bộ group thông số (không giới hạn category)
        group.MapGet("/specifications/groups", async (CatalogDbContext db, CancellationToken ct) =>
        {
            var groups = await db.SpecificationGroups.AsNoTracking()
                .OrderBy(g => g.SortOrder).ThenBy(g => g.Name)
                .Select(g => new
                {
                    id = g.Id,
                    name = g.Name,
                    categoryId = g.CategoryId,
                    sortOrder = g.SortOrder,
                    attributes = db.SpecificationAttributes
                        .Where(a => a.GroupId == g.Id)
                        .OrderBy(a => a.SortOrder)
                        .Select(a => new
                        {
                            a.Id, a.Key, a.Name, a.Unit, a.DataType,
                            a.IsFilterable, a.IsComparable, a.SortOrder
                        }).ToList()
                }).ToListAsync(ct);
            return Results.Ok(groups);
        });

        // Group + attribute của 1 danh mục cụ thể (bao gồm group chung có CategoryId=null)
        group.MapGet("/categories/{id:guid}/spec-groups", async (
            Guid id, CatalogDbContext db, CancellationToken ct) =>
        {
            var groups = await db.SpecificationGroups.AsNoTracking()
                .Where(g => g.CategoryId == null || g.CategoryId == id)
                .OrderBy(g => g.SortOrder)
                .Select(g => new
                {
                    id = g.Id, name = g.Name, sortOrder = g.SortOrder,
                    attributes = db.SpecificationAttributes
                        .Where(a => a.GroupId == g.Id)
                        .OrderBy(a => a.SortOrder)
                        .Select(a => new
                        {
                            a.Id, a.Key, a.Name, a.Unit, a.DataType,
                            a.IsFilterable, a.IsComparable
                        }).ToList()
                }).ToListAsync(ct);
            return Results.Ok(groups);
        });

        // Facet lọc: trả các attribute IsFilterable + danh sách value + số lượng
        group.MapGet("/categories/{id:guid}/filters", async (
            Guid id, CatalogDbContext db, CancellationToken ct) =>
        {
            // Lấy các attribute filterable thuộc group chung hoặc gắn với category
            var attributes = await db.SpecificationAttributes.AsNoTracking()
                .Where(a => a.IsFilterable)
                .Where(a => db.SpecificationGroups
                    .Any(g => g.Id == a.GroupId && (g.CategoryId == null || g.CategoryId == id)))
                .OrderBy(a => a.SortOrder)
                .ToListAsync(ct);

            // Các ProductId trong category (chỉ tính khi filter facet)
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

        // Bulk upsert spec value cho product
        group.MapPost("/products/{id:guid}/specifications", async (
            Guid id, List<UpsertSpecValueRequest> req, CatalogDbContext db, CancellationToken ct) =>
        {
            if (req == null || req.Count == 0) return Results.BadRequest();
            var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (product == null) return Results.NotFound();

            var attrIds = req.Select(r => r.AttributeId).Distinct().ToList();
            var attrs = await db.SpecificationAttributes.AsNoTracking()
                .Where(a => attrIds.Contains(a.Id)).ToDictionaryAsync(a => a.Id, ct);

            var existing = await db.ProductSpecificationValues
                .Where(v => v.ProductId == id && attrIds.Contains(v.AttributeId))
                .ToListAsync(ct);
            db.ProductSpecificationValues.RemoveRange(existing);

            foreach (var r in req)
            {
                if (!attrs.TryGetValue(r.AttributeId, out var attr)) continue;
                ProductSpecificationValue v = attr.DataType switch
                {
                    SpecDataType.Number when r.ValueNumber.HasValue =>
                        ProductSpecificationValue.ForNumber(id, r.AttributeId, r.ValueNumber.Value),
                    SpecDataType.Boolean when r.ValueBool.HasValue =>
                        ProductSpecificationValue.ForBool(id, r.AttributeId, r.ValueBool.Value),
                    SpecDataType.Enum when !string.IsNullOrWhiteSpace(r.ValueEnum) =>
                        ProductSpecificationValue.ForEnum(id, r.AttributeId, r.ValueEnum!),
                    SpecDataType.Text when !string.IsNullOrWhiteSpace(r.ValueText) =>
                        ProductSpecificationValue.ForText(id, r.AttributeId, r.ValueText!),
                    _ => null!,
                };
                if (v != null) db.ProductSpecificationValues.Add(v);
            }
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        group.MapPut("/products/{id:guid}/specifications/{aid:guid}", async (
            Guid id, Guid aid, UpsertSpecValueRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            var attr = await db.SpecificationAttributes.FirstOrDefaultAsync(a => a.Id == aid, ct);
            if (attr == null) return Results.NotFound();
            var existing = await db.ProductSpecificationValues
                .FirstOrDefaultAsync(v => v.ProductId == id && v.AttributeId == aid, ct);
            if (existing == null) return Results.NotFound();

            switch (attr.DataType)
            {
                case SpecDataType.Number when req.ValueNumber.HasValue: existing.UpdateNumber(req.ValueNumber.Value); break;
                case SpecDataType.Boolean when req.ValueBool.HasValue: existing.UpdateBool(req.ValueBool.Value); break;
                case SpecDataType.Enum when !string.IsNullOrWhiteSpace(req.ValueEnum): existing.UpdateEnum(req.ValueEnum!); break;
                case SpecDataType.Text when !string.IsNullOrWhiteSpace(req.ValueText): existing.UpdateText(req.ValueText!); break;
                default: return Results.BadRequest(new { error = "Giá trị không phù hợp với DataType của attribute" });
            }
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        group.MapDelete("/products/{id:guid}/specifications/{aid:guid}", async (
            Guid id, Guid aid, CatalogDbContext db, CancellationToken ct) =>
        {
            var existing = await db.ProductSpecificationValues
                .FirstOrDefaultAsync(v => v.ProductId == id && v.AttributeId == aid, ct);
            if (existing == null) return Results.NotFound();
            db.ProductSpecificationValues.Remove(existing);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("Admin"));
    }

    public record UpsertSpecValueRequest(
        Guid AttributeId, string? ValueText, decimal? ValueNumber, bool? ValueBool, string? ValueEnum);
}
