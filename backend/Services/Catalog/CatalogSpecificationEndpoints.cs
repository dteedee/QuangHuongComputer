using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Catalog;

/// <summary>
/// Endpoint thông số kỹ thuật - đọc (group + attribute). Facet lọc -> `CatalogSpecificationFacetEndpoints.cs`;
/// giá trị theo sản phẩm -> `CatalogSpecificationValueEndpoints.cs`; CRUD group/attribute (admin,
/// step 6 phase file) -> `CatalogSpecificationAdminEndpoints.cs`. Tách để mỗi file dưới 200 dòng.
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

        group.MapCatalogSpecificationFacetEndpoints();
        group.MapCatalogSpecificationValueEndpoints();
        group.MapCatalogSpecificationAdminEndpoints();
    }
}
