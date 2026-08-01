using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales;

/// <summary>
/// Phase 07: CRUD chính sách đổi trả (admin) + endpoint public tra hiệu lực theo Category.
/// </summary>
public static class ReturnPolicyEndpoints
{
    public static void MapReturnPolicyEndpoints(this IEndpointRouteBuilder app)
    {
        var admin = app.MapGroup("/api/sales/return-policies")
            .RequireAuthorization(p => p.RequireRole("Admin", "Manager"));

        admin.MapGet("/", async (SalesDbContext db) =>
        {
            var policies = await db.ReturnPolicies
                .IgnoreQueryFilters() // Admin thấy cả policy inactive
                .OrderBy(p => p.CategoryId == null ? 0 : 1)
                .ThenBy(p => p.Name)
                .ToListAsync();
            return Results.Ok(policies);
        });

        admin.MapPost("/", async ([FromBody] CreateReturnPolicyDto dto, SalesDbContext db) =>
        {
            var policy = new ReturnPolicy(
                dto.Name, dto.CategoryId,
                dto.DaysForReturn, dto.DaysForExchange, dto.DaysForDefectReplace,
                dto.RequireOriginalPackaging, dto.RequireAllAccessories,
                dto.RestockingFeePercent, dto.IsActive, dto.Notes);
            db.ReturnPolicies.Add(policy);
            await db.SaveChangesAsync();
            return Results.Created($"/api/sales/return-policies/{policy.Id}", policy);
        });

        admin.MapPut("/{id:guid}", async (Guid id, [FromBody] UpdateReturnPolicyDto dto, SalesDbContext db) =>
        {
            var p = await db.ReturnPolicies.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
            if (p == null) return Results.NotFound();
            p.Update(dto.Name, dto.DaysForReturn, dto.DaysForExchange, dto.DaysForDefectReplace,
                dto.RequireOriginalPackaging, dto.RequireAllAccessories,
                dto.RestockingFeePercent, dto.IsActive, dto.Notes);
            await db.SaveChangesAsync();
            return Results.Ok(p);
        });

        admin.MapDelete("/{id:guid}", async (Guid id, SalesDbContext db) =>
        {
            var p = await db.ReturnPolicies.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
            if (p == null) return Results.NotFound();
            p.Deactivate();
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Public: hiển thị policy ở trang sản phẩm.
        var pub = app.MapGroup("/api/sales/return-policies");
        pub.MapGet("/effective", async ([FromQuery] Guid? categoryId, SalesDbContext db) =>
        {
            ReturnPolicy? policy = null;
            if (categoryId.HasValue)
                policy = await db.ReturnPolicies.FirstOrDefaultAsync(p => p.CategoryId == categoryId && p.IsActive);
            policy ??= await db.ReturnPolicies.FirstOrDefaultAsync(p => p.CategoryId == null && p.IsActive);

            if (policy == null)
                return Results.NotFound(new { Message = "Không có chính sách áp dụng." });

            return Results.Ok(new
            {
                policy.Id, policy.Name, policy.CategoryId,
                policy.DaysForReturn, policy.DaysForExchange, policy.DaysForDefectReplace,
                policy.RequireOriginalPackaging, policy.RequireAllAccessories,
                policy.RestockingFeePercent, policy.Notes
            });
        });
    }
}

public record CreateReturnPolicyDto(
    string Name,
    Guid? CategoryId,
    int DaysForReturn,
    int DaysForExchange,
    int DaysForDefectReplace,
    bool RequireOriginalPackaging,
    bool RequireAllAccessories,
    decimal RestockingFeePercent,
    bool IsActive,
    string? Notes);

public record UpdateReturnPolicyDto(
    string Name,
    int DaysForReturn,
    int DaysForExchange,
    int DaysForDefectReplace,
    bool RequireOriginalPackaging,
    bool RequireAllAccessories,
    decimal RestockingFeePercent,
    bool IsActive,
    string? Notes);
