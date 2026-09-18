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
/// W2-6: WarrantyClaim aggregate — nộp yêu cầu (khách), danh sách + chi tiết + thống kê (nhân viên).
/// Vòng đời (approve/reject/resolve/assign/receipt) ở claim-actions-endpoints.cs — tách để mỗi file
/// dưới ~200 dòng (development-rules.md).
/// </summary>
public static class ClaimEndpoints
{
    /// <summary>
    /// W1-10: "nhân viên bảo hành" = có quyền <c>Permissions.Warranty.ViewAll</c> (Admin luôn qua),
    /// thay cho danh sách role WarrantyStaffRoles đã bị xoá. Cùng luật với
    /// <c>PermissionAuthorizationHandler</c> nên hành vi khớp với policy của endpoint.
    /// </summary>
    internal static bool IsWarrantyStaff(ClaimsPrincipal user) =>
        user.IsInRole(Roles.Admin)
        || user.FindAll(Permissions.PermissionType).Any(c => c.Value == Permissions.Warranty.ViewAll);

    /// <summary>D08 §4: actor ghi vào ApprovedBy/ResolvedBy — null khi token thiếu NameIdentifier
    /// hợp lệ thay vì ném lỗi (endpoint vẫn phải hoàn thành thao tác).</summary>
    internal static Guid? ActorId(ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public static void MapClaimEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapClaimActionEndpoints();
        app.MapClaimAdminQueryEndpoints();

        var group = app.MapGroup("/api/warranty").RequireAuthorization(SecurityPolicies.Authenticated);

        // Submit a claim
        group.MapPost("/claims", async ([FromBody] CreateClaimDto model, WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var warranty = await db.ProductWarranties.FirstOrDefaultAsync(w => w.SerialNumber == model.SerialNumber);
            if (warranty == null)
                return Results.NotFound(new { Message = "Warranty not found for this serial number" });

            // W0-3: trước đây bất kỳ ai cũng mở được yêu cầu bảo hành trên serial của người khác
            // (chỉ cần biết số serial). Chỉ chủ sở hữu bảo hành hoặc nhân viên mới được mở.
            var isStaff = IsWarrantyStaff(user);
            if (!isStaff && warranty.CustomerId != userId)
                return Results.Json(
                    new { Message = "Serial này không thuộc về tài khoản của bạn" },
                    statusCode: StatusCodes.Status403Forbidden);

            var isManager = user.IsInRole("Admin") || user.IsInRole("Manager");
            if (!warranty.IsValid() && !model.IsManagerOverride)
                return Results.BadRequest(new { Message = "Warranty has expired. Contact support for assistance.", IsExpired = true });

            if (model.IsManagerOverride && !isManager)
                return Results.Forbid();

            var duplicateClaim = await db.Claims
                .Where(c => c.SerialNumber == model.SerialNumber
                    && c.IssueDescription == model.IssueDescription
                    && (c.Status == ClaimStatus.Pending || c.Status == ClaimStatus.Approved))
                .FirstOrDefaultAsync();
            if (duplicateClaim != null)
                return Results.Conflict(new { Message = "A similar claim is already open for this product", ClaimId = duplicateClaim.Id });

            var claim = new WarrantyClaim(
                userId, model.SerialNumber, model.IssueDescription, model.PreferredResolution,
                model.AttachmentUrls, model.IsManagerOverride);

            db.Claims.Add(claim);
            await db.SaveChangesAsync();
            return Results.Ok(claim);
        }).WithValidation<CreateClaimDto>();

        // My Claims
        group.MapGet("/claims", async (WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var claims = await db.Claims.Where(c => c.CustomerId == userId).ToListAsync();
            return Results.Ok(claims);
        });

    }
}

public record CreateClaimDto(
    string SerialNumber,
    string IssueDescription,
    ResolutionPreference PreferredResolution = ResolutionPreference.Repair,
    List<string>? AttachmentUrls = null,
    bool IsManagerOverride = false
);
