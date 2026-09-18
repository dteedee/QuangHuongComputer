using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty;

/// <summary>
/// W2-6 / D08: WarrantyPolicy (thời hạn theo danh mục) + WarrantySlaPolicy (SLA nội bộ) CRUD, cộng
/// 2 endpoint công khai <c>/effective</c> và <c>/public-matrix</c> mà trang chính sách, PDP và wizard
/// claim đều đọc để không lệch ma trận (D08 §9). Split ra khỏi WarrantyEndpoints.cs.
/// </summary>
public static class PolicyEndpoints
{
    public static void MapPolicyEndpoints(this IEndpointRouteBuilder app)
    {
        // D08 §2/§9 (binding): công khai, KHÔNG PII, KHÔNG cần đăng nhập.
        var publicGroup = app.MapGroup("/api/warranty/policies");

        publicGroup.MapGet("/effective", async (
            [FromQuery] Guid? productId,
            Catalog.Infrastructure.CatalogDbContext catalogDb,
            Warranty.Application.WarrantyPolicyResolver resolver) =>
        {
            if (productId is not { } pid)
                return Results.BadRequest(new { Error = "productId là bắt buộc" });
            if (await catalogDb.Products.AsNoTracking().AnyAsync(p => p.Id == pid) is false)
                return Results.NotFound(new { Error = "Không tìm thấy sản phẩm" });

            var manufacturer = await resolver.ResolveAsync(pid, WarrantyProvider.Manufacturer);
            var store = await resolver.ResolveAsync(pid, WarrantyProvider.Store);
            return Results.Ok(new
            {
                ProductId = pid,
                Manufacturer = new { manufacturer.Months, manufacturer.PolicyId, manufacturer.Source },
                Store = new { store.Months, store.PolicyId, store.Source }
            });
        });

        publicGroup.MapGet("/public-matrix", async (WarrantyDbContext db) =>
        {
            var policies = await db.Policies
                .Where(p => p.IsActive)
                .OrderBy(p => p.CategoryId == null) // DEFAULT cuối cùng
                .ThenBy(p => p.Provider)
                .Select(p => new
                {
                    p.CategoryId,
                    p.Provider,
                    p.DurationMonths,
                    p.Name,
                    p.Scope,
                    p.Exclusions
                })
                .ToListAsync();
            return Results.Ok(new { Policies = policies, Version = "D08-2026-09-18" });
        });

        // Admin CRUD (Requirement "Per-product warranty period + policy CRUD", step 2).
        // W1-10 module-permission convention: GET -> Warranty.ViewAll, POST/PUT -> ReviewClaim,
        // DELETE -> ApproveClaim.
        var adminGroup = app.MapGroup("/api/warranty/admin/policies")
            .RequireModulePermissions(PermissionModules.Warranty);

        adminGroup.MapGet("/", async (WarrantyDbContext db, [FromQuery] bool includeInactive = false) =>
        {
            var q = db.Policies.AsNoTracking().AsQueryable();
            if (!includeInactive) q = q.Where(p => p.IsActive);
            var list = await q.OrderBy(p => p.CategoryId == null).ThenBy(p => p.Provider).ToListAsync();
            return Results.Ok(list);
        });

        adminGroup.MapGet("/{id:guid}", async (Guid id, WarrantyDbContext db) =>
        {
            var p = await db.Policies.FindAsync(id);
            return p == null ? Results.NotFound() : Results.Ok(p);
        });

        adminGroup.MapPost("/", async ([FromBody] CreateWarrantyPolicyDto dto, WarrantyDbContext db) =>
        {
            // D08 §2: 1 policy active / (CategoryId, Provider) — kiểm tra trước để trả 409 rõ ràng
            // thay vì để unique index ở DB ném DbUpdateException khó đọc.
            var conflict = await db.Policies.AnyAsync(p =>
                p.CategoryId == dto.CategoryId && p.Provider == dto.Provider && p.IsActive);
            if (conflict)
                return Results.Conflict(new { Error = "Đã có policy active cho danh mục + nhà cung cấp này." });

            var policy = new WarrantyPolicy(
                dto.Name, dto.Description, dto.DurationMonths, dto.CoverageTerms,
                dto.Scope, dto.Exclusions, dto.Provider, dto.CategoryId);
            db.Policies.Add(policy);
            await db.SaveChangesAsync();
            return Results.Created($"/api/warranty/admin/policies/{policy.Id}", policy);
        }).WithValidation<CreateWarrantyPolicyDto>();

        adminGroup.MapPut("/{id:guid}", async (Guid id, [FromBody] UpdateWarrantyPolicyDto dto, WarrantyDbContext db) =>
        {
            var policy = await db.Policies.FindAsync(id);
            if (policy == null) return Results.NotFound();

            var conflict = await db.Policies.AnyAsync(p =>
                p.Id != id && p.CategoryId == dto.CategoryId && p.Provider == dto.Provider && p.IsActive);
            if (conflict)
                return Results.Conflict(new { Error = "Đã có policy active cho danh mục + nhà cung cấp này." });

            policy.Update(dto.Name, dto.Description, dto.DurationMonths, dto.CoverageTerms,
                dto.Scope, dto.Exclusions, dto.Provider, dto.CategoryId);
            await db.SaveChangesAsync();
            return Results.Ok(policy);
        }).WithValidation<UpdateWarrantyPolicyDto>();

        adminGroup.MapDelete("/{id:guid}", async (Guid id, WarrantyDbContext db) =>
        {
            var policy = await db.Policies.FindAsync(id);
            if (policy == null) return Results.NotFound();
            db.Policies.Remove(policy);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Phase 07: SLA policy CRUD (internal ops target — never printed, D08 §4).
        var slaGroup = app.MapGroup("/api/warranty/admin/sla-policies")
            .RequireModulePermissions(PermissionModules.Warranty);

        slaGroup.MapGet("/", async (WarrantyDbContext db) =>
            Results.Ok(await db.SlaPolicies.OrderBy(p => p.ClaimType).ToListAsync()));

        slaGroup.MapPost("/", async ([FromBody] CreateSlaPolicyDto dto, WarrantyDbContext db) =>
        {
            var existing = await db.SlaPolicies.FirstOrDefaultAsync(p => p.ClaimType == dto.ClaimType);
            if (existing != null) return Results.Conflict(new { Error = "Đã tồn tại policy cho ClaimType này" });
            var p = new WarrantySlaPolicy(dto.ClaimType, dto.TargetHours, dto.WarningAtPercent, dto.IsActive, dto.Notes);
            db.SlaPolicies.Add(p);
            await db.SaveChangesAsync();
            return Results.Created($"/api/warranty/admin/sla-policies/{p.Id}", p);
        });

        slaGroup.MapPut("/{id:guid}", async (Guid id, [FromBody] UpdateSlaPolicyDto dto, WarrantyDbContext db) =>
        {
            var p = await db.SlaPolicies.FindAsync(id);
            if (p == null) return Results.NotFound();
            p.Update(dto.TargetHours, dto.WarningAtPercent, dto.IsActive, dto.Notes);
            await db.SaveChangesAsync();
            return Results.Ok(p);
        });
    }
}

public record CreateWarrantyPolicyDto(
    string Name,
    string Description,
    int DurationMonths,
    string CoverageTerms,
    string? Scope,
    string? Exclusions,
    WarrantyProvider Provider = WarrantyProvider.Manufacturer,
    Guid? CategoryId = null);

public record UpdateWarrantyPolicyDto(
    string Name,
    string Description,
    int DurationMonths,
    string CoverageTerms,
    string? Scope,
    string? Exclusions,
    WarrantyProvider Provider,
    Guid? CategoryId);

public record CreateSlaPolicyDto(
    ClaimType ClaimType,
    int TargetHours,
    int WarningAtPercent = 80,
    bool IsActive = true,
    string? Notes = null);

public record UpdateSlaPolicyDto(
    int TargetHours,
    int WarningAtPercent,
    bool IsActive,
    string? Notes);
