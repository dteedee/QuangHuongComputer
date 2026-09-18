using BuildingBlocks.Security;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Catalog;

/// <summary>Giá trị thông số gắn với một sản phẩm cụ thể (không phải schema group/attribute - xem `CatalogSpecificationAdminEndpoints.cs`).</summary>
public static class CatalogSpecificationValueEndpoints
{
    public static void MapCatalogSpecificationValueEndpoints(this IEndpointRouteBuilder group)
    {
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
        }).RequireAuthorization(Permissions.Catalog.Create);

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
        }).RequireAuthorization(Permissions.Catalog.Edit);

        group.MapDelete("/products/{id:guid}/specifications/{aid:guid}", async (
            Guid id, Guid aid, CatalogDbContext db, CancellationToken ct) =>
        {
            var existing = await db.ProductSpecificationValues
                .FirstOrDefaultAsync(v => v.ProductId == id && v.AttributeId == aid, ct);
            if (existing == null) return Results.NotFound();
            db.ProductSpecificationValues.Remove(existing);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(Permissions.Catalog.Delete);
    }

    public record UpsertSpecValueRequest(
        Guid AttributeId, string? ValueText, decimal? ValueNumber, bool? ValueBool, string? ValueEnum);
}
