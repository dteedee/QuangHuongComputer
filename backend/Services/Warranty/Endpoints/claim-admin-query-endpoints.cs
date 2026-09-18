using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty;

/// <summary>
/// W2-6: admin read-only queries over WarrantyClaim (list/detail/stats). Split out of
/// claim-endpoints.cs (was 217 lines, over the 200-line/file rule) - mutations stay in
/// claim-actions-endpoints.cs, submit/my-claims stay in claim-endpoints.cs.
/// </summary>
public static class ClaimAdminQueryEndpoints
{
    public static void MapClaimAdminQueryEndpoints(this IEndpointRouteBuilder app)
    {
        // W1-10: GET -> Warranty.ViewAll, POST/PUT -> ReviewClaim, DELETE -> ApproveClaim.
        var adminGroup = app.MapGroup("/api/warranty/admin")
            .RequireModulePermissions(PermissionModules.Warranty);

        // Get all claims with optional filters (paged via X-Total-Count header — body stays an
        // array; frontend/src/api/warranty/admin-claims.ts reads WarrantyClaim[] directly).
        adminGroup.MapGet("/claims", async (
            WarrantyDbContext db,
            HttpResponse response,
            [FromQuery] string? status = null,
            [FromQuery] string? serialNumber = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20) =>
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 200);
            var query = db.Claims.AsQueryable();

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<ClaimStatus>(status, true, out var claimStatus))
                query = query.Where(c => c.Status == claimStatus);
            if (!string.IsNullOrEmpty(serialNumber))
                query = query.Where(c => c.SerialNumber.Contains(serialNumber));

            var total = await query.CountAsync();
            response.Headers["X-Total-Count"] = total.ToString();

            var claims = await query
                .OrderByDescending(c => c.FiledDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new
                {
                    c.Id,
                    c.CustomerId,
                    c.SerialNumber,
                    c.IssueDescription,
                    Status = c.Status.ToString(),
                    c.FiledDate,
                    c.ResolvedDate,
                    c.ResolutionNotes,
                    PreferredResolution = c.PreferredResolution.ToString(),
                    c.AttachmentUrls,
                    c.IsManagerOverride
                })
                .ToListAsync();

            return Results.Ok(claims);
        });

        // Get claim by ID with warranty info
        adminGroup.MapGet("/claims/{id:guid}", async (Guid id, WarrantyDbContext db) =>
        {
            var claim = await db.Claims.FirstOrDefaultAsync(c => c.Id == id);
            if (claim == null)
                return Results.NotFound(new { Message = "Không tìm thấy yêu cầu bảo hành" });

            var warranty = await db.ProductWarranties.FirstOrDefaultAsync(w => w.SerialNumber == claim.SerialNumber);

            return Results.Ok(new
            {
                claim.Id,
                claim.CustomerId,
                claim.SerialNumber,
                claim.IssueDescription,
                Status = claim.Status.ToString(),
                claim.FiledDate,
                claim.ResolvedDate,
                claim.ResolutionNotes,
                PreferredResolution = claim.PreferredResolution.ToString(),
                claim.AttachmentUrls,
                claim.IsManagerOverride,
                claim.ApprovedBy,
                claim.ResolvedBy,
                claim.DeviceReceivedAt,
                claim.DeviceReturnedAt,
                claim.CommittedTurnaroundDays,
                Warranty = warranty != null ? new
                {
                    warranty.ProductId,
                    warranty.OrderNumber,
                    warranty.PurchaseDate,
                    warranty.ExpirationDate,
                    warranty.WarrantyPeriodMonths,
                    WarrantyStatus = warranty.Status.ToString(),
                    IsValid = warranty.IsValid()
                } : null
            });
        });

        // Get claim statistics
        adminGroup.MapGet("/claims/stats", async (WarrantyDbContext db) =>
        {
            var total = await db.Claims.CountAsync();
            var pending = await db.Claims.CountAsync(c => c.Status == ClaimStatus.Pending);
            var approved = await db.Claims.CountAsync(c => c.Status == ClaimStatus.Approved);
            var resolved = await db.Claims.CountAsync(c => c.Status == ClaimStatus.Resolved);
            var rejected = await db.Claims.CountAsync(c => c.Status == ClaimStatus.Rejected);

            var todayStart = DateTime.UtcNow.Date;
            var newToday = await db.Claims.CountAsync(c => c.FiledDate >= todayStart);
            var resolvedToday = await db.Claims.CountAsync(c => c.ResolvedDate >= todayStart);

            return Results.Ok(new
            {
                Total = total,
                Pending = pending,
                Approved = approved,
                Resolved = resolved,
                Rejected = rejected,
                NewToday = newToday,
                ResolvedToday = resolvedToday
            });
        });
    }
}
