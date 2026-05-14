using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;
using System.Security.Claims;

namespace HR;

public static class ApprovalEndpoints
{
    public static void MapApprovalEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/approvals")
            .RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "Accountant"));

        // GET /api/hr/approvals/pending — pending approvals for current manager
        group.MapGet("/pending", async (ClaimsPrincipal user, HRDbContext db) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var pending = await db.ApprovalRequests
                .Where(a => a.Status == ApprovalStatus.Pending)
                .OrderBy(a => a.SubmittedAt)
                .Select(a => new
                {
                    a.Id, a.Type, a.ReferenceId, a.RequesterId,
                    a.RequesterName, a.Comments, a.SubmittedAt,
                    Status = a.Status.ToString(),
                    TypeName = a.Type.ToString()
                })
                .ToListAsync();

            return Results.Ok(pending);
        });

        // GET /api/hr/approvals/my-requests — own submitted requests
        group.MapGet("/my-requests", async (ClaimsPrincipal user, HRDbContext db) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var requests = await db.ApprovalRequests
                .Where(a => a.RequesterId == userId)
                .OrderByDescending(a => a.SubmittedAt)
                .Select(a => new
                {
                    a.Id, a.ReferenceId, a.Comments,
                    a.SubmittedAt, a.DecidedAt, a.RejectionReason,
                    Status = a.Status.ToString(),
                    TypeName = a.Type.ToString()
                })
                .ToListAsync();

            return Results.Ok(requests);
        });

        // POST /api/hr/approvals/{id}/approve
        group.MapPost("/{id:guid}/approve", async (Guid id, ApproveRequestDto dto, ClaimsPrincipal user, HRDbContext db) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var approverId))
                return Results.Unauthorized();

            var request = await db.ApprovalRequests.FindAsync(id);
            if (request == null) return Results.NotFound(new { error = "Không tìm thấy yêu cầu" });
            if (request.Status != ApprovalStatus.Pending)
                return Results.BadRequest(new { error = "Yêu cầu không ở trạng thái chờ duyệt" });

            request.Status = ApprovalStatus.Approved;
            request.ApproverId = approverId;
            request.Comments = dto.Comments;
            request.DecidedAt = DateTime.UtcNow;

            // Sync leave request status if applicable
            if (request.Type == ApprovalType.LeaveRequest)
            {
                var leave = await db.LeaveRequests.FindAsync(request.ReferenceId);
                if (leave != null)
                {
                    var approverName = user.FindFirstValue(ClaimTypes.Name) ?? "Manager";
                    leave.Approve(approverName);
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã duyệt yêu cầu", id = request.Id });
        });

        // POST /api/hr/approvals/{id}/reject
        group.MapPost("/{id:guid}/reject", async (Guid id, RejectApprovalDto dto, ClaimsPrincipal user, HRDbContext db) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var approverId))
                return Results.Unauthorized();

            var request = await db.ApprovalRequests.FindAsync(id);
            if (request == null) return Results.NotFound(new { error = "Không tìm thấy yêu cầu" });
            if (request.Status != ApprovalStatus.Pending)
                return Results.BadRequest(new { error = "Yêu cầu không ở trạng thái chờ duyệt" });

            request.Status = ApprovalStatus.Rejected;
            request.ApproverId = approverId;
            request.RejectionReason = dto.Reason;
            request.DecidedAt = DateTime.UtcNow;

            // Sync leave request status if applicable
            if (request.Type == ApprovalType.LeaveRequest)
            {
                var leave = await db.LeaveRequests.FindAsync(request.ReferenceId);
                if (leave != null)
                {
                    var rejectorName = user.FindFirstValue(ClaimTypes.Name) ?? "Manager";
                    leave.Reject(dto.Reason, rejectorName);
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã từ chối yêu cầu", id = request.Id });
        });
    }
}

public record ApproveRequestDto(string? Comments);
public record RejectApprovalDto(string Reason);
