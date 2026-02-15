using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty;

public static class WarrantyEndpoints
{
    public static void MapWarrantyEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warranty").RequireAuthorization();

        // Submit a claim
        group.MapPost("/claims", async ([FromBody] CreateClaimDto model, WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            // Validate serial number
            if (string.IsNullOrWhiteSpace(model.SerialNumber))
                return Results.BadRequest(new { Message = "Serial number is required" });

            // Check if warranty exists
            var warranty = await db.ProductWarranties.FirstOrDefaultAsync(w => w.SerialNumber == model.SerialNumber);
            if (warranty == null)
                return Results.NotFound(new { Message = "Warranty not found for this serial number" });

            // Check if warranty is expired (unless manager override)
            var isManager = user.IsInRole("Admin") || user.IsInRole("Manager");
            if (!warranty.IsValid() && !model.IsManagerOverride)
            {
                return Results.BadRequest(new { Message = "Warranty has expired. Contact support for assistance.", IsExpired = true });
            }

            // Only managers can use override
            if (model.IsManagerOverride && !isManager)
            {
                return Results.Forbid();
            }

            // Check for duplicate claims (same serial, same issue, status is Pending or Approved)
            var duplicateClaim = await db.Claims
                .Where(c => c.SerialNumber == model.SerialNumber
                    && c.IssueDescription == model.IssueDescription
                    && (c.Status == ClaimStatus.Pending || c.Status == ClaimStatus.Approved))
                .FirstOrDefaultAsync();

            if (duplicateClaim != null)
            {
                return Results.Conflict(new { Message = "A similar claim is already open for this product", ClaimId = duplicateClaim.Id });
            }

            // Create claim
            var claim = new WarrantyClaim(
                userId,
                model.SerialNumber,
                model.IssueDescription,
                model.PreferredResolution,
                model.AttachmentUrls,
                model.IsManagerOverride);

            db.Claims.Add(claim);
            await db.SaveChangesAsync();
            return Results.Ok(claim);
        });

        // My Claims
        group.MapGet("/claims", async (WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Results.Unauthorized();

            var claims = await db.Claims.Where(c => c.CustomerId == userId).ToListAsync();
            return Results.Ok(claims);
        });

        // Register warranty for product
        group.MapPost("/register", async ([FromBody] RegisterWarrantyDto model, WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var warranty = new ProductWarranty(model.ProductId, model.SerialNumber, userId, model.PurchaseDate, model.WarrantyPeriodMonths);
            db.ProductWarranties.Add(warranty);
            await db.SaveChangesAsync();
            return Results.Ok(warranty);
        });

        // Check Coverage by Serial Number
        group.MapGet("/lookup/serial/{serialNumber}", async (string serialNumber, WarrantyDbContext db) =>
        {
            var warranty = await db.ProductWarranties.FirstOrDefaultAsync(w => w.SerialNumber == serialNumber);
            if (warranty == null)
                return Results.NotFound(new { Message = "Không tìm thấy bảo hành cho serial này" });

            // Get claim history for this serial
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

            return Results.Ok(new
            {
                warranty.SerialNumber,
                warranty.ProductId,
                warranty.OrderNumber,
                Status = warranty.Status.ToString(),
                warranty.ExpirationDate,
                warranty.PurchaseDate,
                warranty.WarrantyPeriodMonths,
                IsValid = warranty.IsValid(),
                ClaimHistory = claims
            });
        });

        // Check Coverage by Invoice/Order Number
        group.MapGet("/lookup/invoice/{orderNumber}", async (string orderNumber, WarrantyDbContext db) =>
        {
            var warranties = await db.ProductWarranties
                .Where(w => w.OrderNumber == orderNumber)
                .ToListAsync();

            if (!warranties.Any())
                return Results.NotFound(new { Message = "Không tìm thấy bảo hành cho hóa đơn này" });

            var result = new List<object>();
            foreach (var warranty in warranties)
            {
                // Get claim history for each warranty
                var claims = await db.Claims
                    .Where(c => c.SerialNumber == warranty.SerialNumber)
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

                result.Add(new
                {
                    warranty.SerialNumber,
                    warranty.ProductId,
                    warranty.OrderNumber,
                    Status = warranty.Status.ToString(),
                    warranty.ExpirationDate,
                    warranty.PurchaseDate,
                    warranty.WarrantyPeriodMonths,
                    IsValid = warranty.IsValid(),
                    ClaimHistory = claims
                });
            }

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

        // Admin: All warranties
        group.MapGet("/admin/warranties", async (WarrantyDbContext db) =>
        {
            var warranties = await db.ProductWarranties.OrderByDescending(w => w.PurchaseDate).ToListAsync();
            return Results.Ok(warranties);
        }).RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "TechnicianInShop"));

        // ==================== ADMIN CLAIM MANAGEMENT ====================
        var adminGroup = app.MapGroup("/api/warranty/admin")
            .RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "TechnicianInShop", "TechnicianOnSite"));

        // Get all claims with optional filters
        adminGroup.MapGet("/claims", async (
            WarrantyDbContext db,
            [FromQuery] string? status = null,
            [FromQuery] string? serialNumber = null) =>
        {
            var query = db.Claims.AsQueryable();

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<ClaimStatus>(status, true, out var claimStatus))
            {
                query = query.Where(c => c.Status == claimStatus);
            }

            if (!string.IsNullOrEmpty(serialNumber))
            {
                query = query.Where(c => c.SerialNumber.Contains(serialNumber));
            }

            var claims = await query
                .OrderByDescending(c => c.FiledDate)
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

            // Get warranty info
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

        // Approve claim
        adminGroup.MapPost("/claims/{id:guid}/approve", async (Guid id, WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var claim = await db.Claims.FirstOrDefaultAsync(c => c.Id == id);
            if (claim == null)
                return Results.NotFound(new { Message = "Không tìm thấy yêu cầu bảo hành" });

            if (claim.Status != ClaimStatus.Pending)
                return Results.BadRequest(new { Message = "Chỉ có thể duyệt yêu cầu đang chờ xử lý" });

            claim.Approve();
            await db.SaveChangesAsync();

            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Admin";
            return Results.Ok(new
            {
                Message = "Đã duyệt yêu cầu bảo hành",
                claim.Id,
                Status = claim.Status.ToString(),
                ApprovedBy = userName
            });
        });

        // Reject claim
        adminGroup.MapPost("/claims/{id:guid}/reject", async (
            Guid id,
            [FromBody] RejectClaimDto dto,
            WarrantyDbContext db,
            ClaimsPrincipal user) =>
        {
            var claim = await db.Claims.FirstOrDefaultAsync(c => c.Id == id);
            if (claim == null)
                return Results.NotFound(new { Message = "Không tìm thấy yêu cầu bảo hành" });

            if (claim.Status == ClaimStatus.Resolved || claim.Status == ClaimStatus.Rejected)
                return Results.BadRequest(new { Message = "Yêu cầu đã được xử lý" });

            claim.Reject(dto.Reason);
            await db.SaveChangesAsync();

            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Admin";
            return Results.Ok(new
            {
                Message = "Đã từ chối yêu cầu bảo hành",
                claim.Id,
                Status = claim.Status.ToString(),
                claim.ResolutionNotes,
                RejectedBy = userName
            });
        });

        // Resolve claim (complete the repair/replacement/refund)
        adminGroup.MapPost("/claims/{id:guid}/resolve", async (
            Guid id,
            [FromBody] ResolveClaimDto dto,
            WarrantyDbContext db,
            ClaimsPrincipal user) =>
        {
            var claim = await db.Claims.FirstOrDefaultAsync(c => c.Id == id);
            if (claim == null)
                return Results.NotFound(new { Message = "Không tìm thấy yêu cầu bảo hành" });

            if (claim.Status != ClaimStatus.Approved)
                return Results.BadRequest(new { Message = "Chỉ có thể hoàn thành yêu cầu đã được duyệt" });

            claim.Resolve(dto.Notes);
            await db.SaveChangesAsync();

            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Admin";
            return Results.Ok(new
            {
                Message = "Đã hoàn thành xử lý yêu cầu bảo hành",
                claim.Id,
                Status = claim.Status.ToString(),
                claim.ResolutionNotes,
                claim.ResolvedDate,
                ResolvedBy = userName
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

public record CreateClaimDto(
    string SerialNumber,
    string IssueDescription,
    ResolutionPreference PreferredResolution = ResolutionPreference.Repair,
    List<string>? AttachmentUrls = null,
    bool IsManagerOverride = false
);

public record RegisterWarrantyDto(
    Guid ProductId,
    string SerialNumber,
    DateTime PurchaseDate,
    int WarrantyPeriodMonths,
    string? OrderNumber = null
);

public record RejectClaimDto(string Reason);
public record ResolveClaimDto(string Notes);
