using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Returns;
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
        // Chính sách đổi/trả là cấu hình nghiệp vụ Sales -> quyền ManageReturns
        // (giữ đúng phạm vi cũ Admin/Manager; Sale chỉ có ViewReturns nên không sửa được).
        var admin = app.MapGroup("/api/sales/return-policies")
            .RequirePermission(Permissions.Sales.ManageReturns);

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

        // Public: hiển thị policy ở trang sản phẩm (khách chưa đăng nhập cũng phải đọc được).
        // W1-10: khai báo AllowAnonymous tường minh; cần thêm rule vào PublicEndpointAllowList
        // (integration request W1 -> chủ file BuildingBlocks/Security/PublicEndpointAllowList.cs).
        var pub = app.MapGroup("/api/sales/return-policies");
        // D08 — chính sách hiệu lực cho MỘT SẢN PHẨM: leo ngược cây danh mục đến gốc.
        // `categoryId` giữ lại cho đường gọi cũ, nhưng `productId` mới là câu hỏi đúng: trang sản
        // phẩm biết sản phẩm, không biết sản phẩm đó nằm ở tầng nào của cây danh mục.
        pub.MapGet("/effective", async (
            [FromQuery] Guid? productId,
            [FromQuery] Guid? categoryId,
            SalesDbContext db,
            Catalog.Infrastructure.CatalogDbContext catalogDb,
            CancellationToken ct) =>
        {
            EffectiveReturnPolicy? policy = null;
            var excluded = false;
            var warrantyMonths = 0;

            if (productId.HasValue)
            {
                var resolution = await ReturnPolicyResolver.ResolveAsync(db, catalogDb, productId.Value, ct);
                policy = resolution.Policy;
                excluded = resolution.ProductExcluded;
                warrantyMonths = resolution.WarrantyMonths;
            }
            else
            {
                var all = await ReturnPolicyResolver.AllAsync(db, ct);
                if (categoryId.HasValue)
                {
                    var chain = await ReturnPolicyResolver.CategoryChainAsync(catalogDb, categoryId, ct);
                    foreach (var id in chain)
                    {
                        policy = all.FirstOrDefault(p => p.CategoryId == id);
                        if (policy != null) break;
                    }
                }
                policy ??= all.FirstOrDefault(p => p.CategoryId == null);
            }

            if (policy == null)
                return Results.NotFound(new { message = "Không có chính sách áp dụng." });

            return Results.Ok(new
            {
                policy.Id, policy.Name, policy.CategoryId,
                policy.DaysForReturn, policy.DaysForExchange, policy.DaysForDefectReplace,
                policy.RequireOriginalPackaging, policy.RequireAllAccessories,
                policy.AllowOpenedBoxReturn, policy.RestockingFeePercent,
                policy.MissingAccessoriesFeePercent, policy.DaysForStatutoryReturn,
                isReturnExcluded = excluded,
                warrantyMonths,
                reasons = ReturnReasonMatrixView.Build(policy),
            });
        }).AllowAnonymous();

        // D08 — bảng quyền trả hàng hiển thị công khai (trang "Chính sách đổi trả").
        pub.MapGet("/public-matrix", async (SalesDbContext db, CancellationToken ct) =>
        {
            var all = await ReturnPolicyResolver.AllAsync(db, ct);
            var fallback = all.FirstOrDefault(p => p.CategoryId == null);

            return Results.Ok(new
            {
                policies = all.Select(p => new
                {
                    p.Id, p.Name, p.CategoryId,
                    p.DaysForReturn, p.DaysForExchange, p.DaysForDefectReplace,
                    p.RestockingFeePercent, p.MissingAccessoriesFeePercent,
                    p.AllowOpenedBoxReturn, p.DaysForStatutoryReturn,
                }).ToList(),
                reasons = fallback == null ? null : ReturnReasonMatrixView.Build(fallback),
            });
        }).AllowAnonymous();
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
