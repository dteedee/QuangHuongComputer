using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;
using System.Security.Claims;

namespace HR;

public static class EmployeeAssetEndpoints
{
    public static void MapEmployeeAssetEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/employees/{employeeId:guid}/assets")
            .RequireAuthorization(p => p.RequireRole("Admin", "Manager"));

        group.MapGet("/", async (Guid employeeId, HRDbContext db) =>
            Results.Ok(await db.EmployeeAssets
                .Where(a => a.EmployeeId == employeeId)
                .OrderByDescending(a => a.AssignedDate)
                .ToListAsync()));

        group.MapPost("/", async (Guid employeeId, CreateEmployeeAssetDto dto, HttpContext ctx, HRDbContext db) =>
        {
            var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid? assignerId = null;
            if (!string.IsNullOrEmpty(uid) && Guid.TryParse(uid, out var uidGuid)) assignerId = uidGuid;

            try
            {
                var asset = new EmployeeAsset(
                    employeeId,
                    dto.AssetType,
                    dto.AssetCode,
                    dto.Value,
                    dto.ConditionOnAssign,
                    dto.SerialNumber,
                    dto.InventorySerialId,
                    dto.AssignedDate,
                    assignerId,
                    dto.Notes);
                db.EmployeeAssets.Add(asset);
                await db.SaveChangesAsync();
                return Results.Created($"/api/hr/employees/{employeeId}/assets/{asset.Id}", asset);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        // POST /api/hr/employees/{eid}/assets/{id}/return
        var single = app.MapGroup("/api/hr/employees/{employeeId:guid}/assets/{id:guid}")
            .RequireAuthorization(p => p.RequireRole("Admin", "Manager"));

        single.MapPost("/return", async (Guid employeeId, Guid id, ReturnAssetDto dto, HttpContext ctx, HRDbContext db) =>
        {
            var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid) || !Guid.TryParse(uid, out var receiverId))
                return Results.Unauthorized();
            var asset = await db.EmployeeAssets.FindAsync(id);
            if (asset == null || asset.EmployeeId != employeeId) return Results.NotFound();
            try
            {
                asset.Return(dto.ConditionOnReturn, receiverId, dto.Notes);
                await db.SaveChangesAsync();
                return Results.Ok(asset);
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        single.MapDelete("/", async (Guid employeeId, Guid id, HRDbContext db) =>
        {
            var asset = await db.EmployeeAssets.FindAsync(id);
            if (asset == null || asset.EmployeeId != employeeId) return Results.NotFound();
            db.EmployeeAssets.Remove(asset);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

public record CreateEmployeeAssetDto(
    string AssetType,
    string AssetCode,
    decimal Value,
    AssetCondition ConditionOnAssign = AssetCondition.New,
    string? SerialNumber = null,
    Guid? InventorySerialId = null,
    DateTime? AssignedDate = null,
    string? Notes = null);

public record ReturnAssetDto(AssetCondition ConditionOnReturn, string? Notes);
