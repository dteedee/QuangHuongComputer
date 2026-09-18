using System.Security.Claims;
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
/// W2-6: ProductWarranty aggregate — đăng ký (nhân viên), tra cứu, danh sách admin, serial-timeline.
/// Split ra khỏi WarrantyEndpoints.cs (624 dòng, vi phạm giới hạn 200 dòng/file) cùng
/// claim-endpoints.cs và policy-endpoints.cs — 3 file theo aggregate như Architecture yêu cầu.
/// </summary>
public static class WarrantyEndpoints
{
    public static void MapWarrantyEndpoints(this IEndpointRouteBuilder app)
    {
        // ApiGateway/Program.cs (not owned by this track — see integration-requests-w2.md) only
        // calls app.MapWarrantyEndpoints(); it never learned about the new claim/policy endpoint
        // files created by this split. Fan out from the one entry point Program.cs already calls
        // instead of waiting on an integration-request round trip.
        app.MapClaimEndpoints();
        app.MapPolicyEndpoints();
        app.MapWarrantyAdminQueryEndpoints();

        // W1-10: nhánh khách hàng ("bảo hành của tôi") -> chỉ cần đăng nhập.
        var group = app.MapGroup("/api/warranty").RequireAuthorization(SecurityPolicies.Authenticated);

        // Register warranty for product (staff-only manual entry; forward registration is the
        // OrderFulfilledConsumer per D08 — this stays for historical backfill, Risk Assessment).
        group.MapPost("/register", async ([FromBody] RegisterWarrantyDto model, WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            if (model.CustomerId == Guid.Empty)
                return Results.BadRequest(new { Message = "customerId không hợp lệ" });
            var ownerId = model.CustomerId ?? userId;

            var warranty = new ProductWarranty(
                model.ProductId, model.SerialNumber, ownerId, model.PurchaseDate,
                model.WarrantyPeriodMonths, model.OrderNumber);
            db.ProductWarranties.Add(warranty);
            await db.SaveChangesAsync();
            return Results.Ok(warranty);
            // W1-10: chỉ nhân viên mới lập bản ghi bảo hành -> Warranty.ReviewClaim.
        }).RequireAuthorization(Permissions.Warranty.ReviewClaim).WithValidation<RegisterWarrantyDto>();

        // Check Coverage by Serial Number (+ claim history + serial timeline).
        // Security fix (this pass): the customer-auth /lookup/* branch had NO ownership check —
        // any signed-in customer could pull another customer's claim history by guessing a serial.
        // W0-3 already closed the equivalent hole on POST /claims; this closes it here too, same
        // rule (owner or staff only).
        group.MapGet("/lookup/serial/{serialNumber}", async (string serialNumber, WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var warranty = await db.ProductWarranties.FirstOrDefaultAsync(w => w.SerialNumber == serialNumber);
            if (warranty == null)
                return Results.NotFound(new { Message = "Không tìm thấy bảo hành cho serial này" });
            if (!IsOwnerOrStaff(warranty.CustomerId, user))
                return Results.Json(new { Message = "Serial này không thuộc về tài khoản của bạn" },
                    statusCode: StatusCodes.Status403Forbidden);

            var claims = await ClaimHistoryFor(db, serialNumber);
            return Results.Ok(ToCoverageDto(warranty, claims));
        });

        // Check Coverage by Invoice/Order Number
        group.MapGet("/lookup/invoice/{orderNumber}", async (string orderNumber, WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var warranties = await db.ProductWarranties.Where(w => w.OrderNumber == orderNumber).ToListAsync();
            if (!warranties.Any())
                return Results.NotFound(new { Message = "Không tìm thấy bảo hành cho hóa đơn này" });
            if (!warranties.All(w => IsOwnerOrStaff(w.CustomerId, user)))
                return Results.Json(new { Message = "Hóa đơn này không thuộc về tài khoản của bạn" },
                    statusCode: StatusCodes.Status403Forbidden);

            var result = new List<object>();
            foreach (var warranty in warranties)
                result.Add(ToCoverageDto(warranty, await ClaimHistoryFor(db, warranty.SerialNumber)));
            return Results.Ok(result);
        });

        // Legacy endpoint for backward compatibility
        group.MapGet("/lookup/{serialNumber}", async (string serialNumber, WarrantyDbContext db) =>
        {
            var warranty = await db.ProductWarranties.FirstOrDefaultAsync(w => w.SerialNumber == serialNumber);
            if (warranty == null)
                return Results.NotFound(new { Message = "Serial number not found" });

            return Results.Ok(new
            {
                warranty.SerialNumber,
                warranty.ProductId,
                Status = warranty.IsValid() ? "Active" : "Expired",
                warranty.ExpirationDate,
                IsValid = warranty.IsValid()
            });
        });

        // Admin: All warranties (paged — Todo "Paging/filtering on all lists").
        // Response body STAYS an array — frontend/src/api/warranty/admin-claims.ts reads
        // WarrantyCoverage[] directly (not owned by this track). Total count goes in a header
        // so paging is real without a breaking body-shape change; FE cutover to the paged
        // envelope is W3-6's job per docs/api-contracts/warranty.md.
        group.MapGet("/admin/warranties", async (
            WarrantyDbContext db,
            HttpResponse response,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20) =>
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 200);
            var query = db.ProductWarranties.OrderByDescending(w => w.PurchaseDate);
            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            response.Headers["X-Total-Count"] = total.ToString();
            return Results.Ok(items);
            // W1-10: danh sách toàn bộ bảo hành -> Warranty.ViewAll.
        }).RequireAuthorization(Permissions.Warranty.ViewAll);

    }

    private static bool IsOwnerOrStaff(Guid warrantyCustomerId, ClaimsPrincipal user) =>
        ClaimEndpoints.IsWarrantyStaff(user) || ClaimEndpoints.ActorId(user) == warrantyCustomerId;

    private static async Task<List<object>> ClaimHistoryFor(WarrantyDbContext db, string serialNumber)
    {
        var claims = await db.Claims
            .Where(c => c.SerialNumber == serialNumber)
            .OrderByDescending(c => c.FiledDate)
            .Select(c => new
            {
                c.Id,
                c.IssueDescription,
                c.Status,
                c.FiledDate,
                c.ResolvedDate,
                c.PreferredResolution
            })
            .ToListAsync();
        return claims.Cast<object>().ToList();
    }

    private static object ToCoverageDto(ProductWarranty warranty, List<object> claims) => new
    {
        warranty.SerialNumber,
        warranty.ProductId,
        warranty.OrderNumber,
        Status = warranty.Status.ToString(),
        warranty.ExpirationDate,
        warranty.PurchaseDate,
        warranty.WarrantyPeriodMonths,
        warranty.ExtendedDays,
        IsValid = warranty.IsValid(),
        ClaimHistory = claims
    };
}

public record RegisterWarrantyDto(
    Guid ProductId,
    string SerialNumber,
    DateTime PurchaseDate,
    int WarrantyPeriodMonths,
    string? OrderNumber = null,
    // Khách hàng sở hữu bảo hành. Chỉ nhân viên gọi được endpoint này (quyền Warranty.ReviewClaim), nên
    // trường này an toàn: bỏ trống ⇒ gán cho chính người gọi (hành vi cũ).
    Guid? CustomerId = null
);
