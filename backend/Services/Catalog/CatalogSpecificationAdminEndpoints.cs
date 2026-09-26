using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using BuildingBlocks.Endpoints;

namespace Catalog;

/// <summary>
/// Todo "Spec group/attribute CRUD + reorder" (step 6 phase file): admin tạo/sửa/xoá
/// `SpecificationGroup` + `SpecificationAttribute`, đổi thứ tự hiển thị. Key unique per group đã
/// được CSDL ép (`uq_specification_attributes_group_key`); datatype không cho đổi khi đã có giá
/// trị (step 6: "datatype immutable once values exist").
/// </summary>
public static class CatalogSpecificationAdminEndpoints
{
    public static void MapCatalogSpecificationAdminEndpoints(this IEndpointRouteBuilder group)
    {
        // ============ GROUP ============
        group.MapPost("/specifications/groups", async (
            CreateSpecGroupRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            var g = new SpecificationGroup(req.Name, req.CategoryId, req.SortOrder);
            db.SpecificationGroups.Add(g);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/catalog/specifications/groups/{g.Id}", new { id = g.Id });
        }).RequireAuthorization(Permissions.Catalog.Manage).WithValidation<CreateSpecGroupRequest>();

        group.MapPut("/specifications/groups/{id:guid}", async (
            Guid id, UpdateSpecGroupRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            var g = await db.SpecificationGroups.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (g == null) return Results.NotFound();
            g.Update(req.Name, req.CategoryId, req.SortOrder);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(Permissions.Catalog.Manage).WithValidation<UpdateSpecGroupRequest>();

        group.MapDelete("/specifications/groups/{id:guid}", async (Guid id, CatalogDbContext db, CancellationToken ct) =>
        {
            var g = await db.SpecificationGroups.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (g == null) return Results.NotFound();
            var hasAttrs = await db.SpecificationAttributes.AnyAsync(a => a.GroupId == id, ct);
            if (hasAttrs)
                return Results.Conflict(new { error = "Nhóm còn thuộc tính bên trong - xoá thuộc tính trước." });
            db.SpecificationGroups.Remove(g);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(Permissions.Catalog.Manage);

        // Đổi thứ tự nhóm: body { ids: [uuid,...] } - vị trí = index.
        group.MapPost("/specifications/groups/reorder", async (ReorderIdsRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            if (req.Ids == null || req.Ids.Count == 0) return Results.BadRequest();
            var groups = await db.SpecificationGroups.Where(g => req.Ids.Contains(g.Id)).ToListAsync(ct);
            var order = req.Ids.Select((gid, idx) => new { gid, idx }).ToDictionary(x => x.gid, x => x.idx);
            foreach (var g in groups)
                if (order.TryGetValue(g.Id, out var pos)) g.Update(g.Name, g.CategoryId, pos);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(Permissions.Catalog.Manage);

        // ============ ATTRIBUTE ============
        group.MapPost("/specifications/groups/{groupId:guid}/attributes", async (
            Guid groupId, CreateSpecAttributeRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            var groupExists = await db.SpecificationGroups.AnyAsync(g => g.Id == groupId, ct);
            if (!groupExists) return Results.NotFound(new { error = "Nhóm thông số không tồn tại" });

            var keyTaken = await db.SpecificationAttributes
                .AnyAsync(a => a.GroupId == groupId && a.Key == req.Key.Trim().ToLower(), ct);
            if (keyTaken) return Results.Conflict(new { error = $"Key '{req.Key}' đã tồn tại trong nhóm này" });

            try
            {
                var attr = new SpecificationAttribute(
                    groupId, req.Key, req.Name, req.DataType, req.Unit, req.EnumValuesJson,
                    req.IsFilterable, req.IsComparable, req.SortOrder);
                db.SpecificationAttributes.Add(attr);
                await db.SaveChangesAsync(ct);
                return Results.Created($"/api/catalog/specifications/attributes/{attr.Id}", new { id = attr.Id });
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        }).RequireAuthorization(Permissions.Catalog.Manage).WithValidation<CreateSpecAttributeRequest>();

        group.MapPut("/specifications/attributes/{id:guid}", async (
            Guid id, UpdateSpecAttributeRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            var attr = await db.SpecificationAttributes.FirstOrDefaultAsync(a => a.Id == id, ct);
            if (attr == null) return Results.NotFound();

            // Step 6: "datatype immutable once values exist".
            if (req.DataType != attr.DataType)
            {
                var hasValues = await db.ProductSpecificationValues.AnyAsync(v => v.AttributeId == id, ct);
                if (hasValues)
                    return Results.Conflict(new { error = "Không thể đổi kiểu dữ liệu khi đã có sản phẩm dùng thuộc tính này" });
            }

            try
            {
                attr.Update(req.Name, req.Unit, req.DataType, req.EnumValuesJson, req.IsFilterable, req.IsComparable, req.SortOrder);
                await db.SaveChangesAsync(ct);
                return Results.NoContent();
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        }).RequireAuthorization(Permissions.Catalog.Manage).WithValidation<UpdateSpecAttributeRequest>();

        group.MapDelete("/specifications/attributes/{id:guid}", async (Guid id, CatalogDbContext db, CancellationToken ct) =>
        {
            var attr = await db.SpecificationAttributes.FirstOrDefaultAsync(a => a.Id == id, ct);
            if (attr == null) return Results.NotFound();
            var hasValues = await db.ProductSpecificationValues.AnyAsync(v => v.AttributeId == id, ct);
            if (hasValues)
                return Results.Conflict(new { error = "Còn sản phẩm đang dùng thuộc tính này - xoá giá trị trước." });
            db.SpecificationAttributes.Remove(attr);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(Permissions.Catalog.Manage);

        group.MapPost("/specifications/groups/{groupId:guid}/attributes/reorder", async (
            Guid groupId, ReorderIdsRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            if (req.Ids == null || req.Ids.Count == 0) return Results.BadRequest();
            var attrs = await db.SpecificationAttributes.Where(a => a.GroupId == groupId && req.Ids.Contains(a.Id)).ToListAsync(ct);
            var order = req.Ids.Select((aid, idx) => new { aid, idx }).ToDictionary(x => x.aid, x => x.idx);
            foreach (var a in attrs)
                if (order.TryGetValue(a.Id, out var pos))
                    a.Update(a.Name, a.Unit, a.DataType, a.EnumValuesJson, a.IsFilterable, a.IsComparable, pos);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(Permissions.Catalog.Manage);
    }

    public record CreateSpecGroupRequest(string Name, Guid? CategoryId, int SortOrder = 0);
    public record UpdateSpecGroupRequest(string Name, Guid? CategoryId, int SortOrder = 0);
    public record ReorderIdsRequest(List<Guid> Ids);
    public record CreateSpecAttributeRequest(
        string Key, string Name, SpecDataType DataType, string? Unit = null, string? EnumValuesJson = null,
        bool IsFilterable = true, bool IsComparable = true, int SortOrder = 0);
    public record UpdateSpecAttributeRequest(
        string Name, SpecDataType DataType, string? Unit, string? EnumValuesJson,
        bool IsFilterable, bool IsComparable, int SortOrder);
}
