using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;
using HR.Application.Leave;
using System.Security.Claims;

namespace HR;

public static class ApprovalEndpoints
{
    public static void MapApprovalEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/approvals")
            .RequireModulePermissions(PermissionModules.HR);

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
        // W2-7 khoản 6: BUG đã sửa — ApprovalRequest.RequesterId được ghi bằng Employee.Id lúc
        // tạo đơn (HRLeaveEndpoints/LeaveApprovalService), nhưng route này lại so với
        // ClaimTypes.NameIdentifier — Id của Identity USER, một GUID khác hẳn. Kết quả luôn rỗng.
        // Phải tra Employee của người gọi trước, rồi so RequesterId với Employee.Id.
        group.MapGet("/my-requests", async (ClaimsPrincipal user, HRDbContext db) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userIdStr);
            if (employee == null) return Results.Ok(Array.Empty<object>());

            var requests = await db.ApprovalRequests
                .Where(a => a.RequesterId == employee.Id)
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
        // W2-7 khoản 6: khi Type=LeaveRequest, đi qua LeaveApprovalService (MỘT đường duyệt duy
        // nhất — trước đây gọi thẳng leave.Approve() ở đây, KHÔNG kiểm tra hạn mức phép, khác
        // hẳn logic của /leaves/{id}/approve — 2 đường có thể duyệt cùng 1 đơn không đồng bộ).
        group.MapPost("/{id:guid}/approve", async (Guid id, ApproveRequestDto dto, ClaimsPrincipal user, HRDbContext db, LeaveApprovalService leaveSvc) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var approverId))
                return Results.Unauthorized();

            var request = await db.ApprovalRequests.FindAsync(id);
            if (request == null) return Results.NotFound(new { error = "Không tìm thấy yêu cầu" });
            if (request.Status != ApprovalStatus.Pending)
                return Results.BadRequest(new { error = "Yêu cầu không ở trạng thái chờ duyệt" });

            if (request.Type == ApprovalType.LeaveRequest)
            {
                var approverName = user.FindFirstValue(ClaimTypes.Name) ?? "Manager";
                var leaveError = await leaveSvc.ApproveAsync(request.ReferenceId, approverName, approverId);
                if (leaveError != null) return Results.BadRequest(new { error = leaveError });
                // LeaveApprovalService.ApproveAsync đã tự đồng bộ ApprovalRequest (Status/ApproverId/
                // DecidedAt) — chỉ còn ghi Comments (trường LeaveApprovalService không biết).
                request.Comments = dto.Comments;
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã duyệt yêu cầu", id = request.Id });
            }

            request.Status = ApprovalStatus.Approved;
            request.ApproverId = approverId;
            request.Comments = dto.Comments;
            request.DecidedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã duyệt yêu cầu", id = request.Id });
        });

        // POST /api/hr/approvals/{id}/reject
        group.MapPost("/{id:guid}/reject", async (Guid id, RejectApprovalDto dto, ClaimsPrincipal user, HRDbContext db, LeaveApprovalService leaveSvc) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var approverId))
                return Results.Unauthorized();

            var request = await db.ApprovalRequests.FindAsync(id);
            if (request == null) return Results.NotFound(new { error = "Không tìm thấy yêu cầu" });
            if (request.Status != ApprovalStatus.Pending)
                return Results.BadRequest(new { error = "Yêu cầu không ở trạng thái chờ duyệt" });

            if (request.Type == ApprovalType.LeaveRequest)
            {
                var rejectorName = user.FindFirstValue(ClaimTypes.Name) ?? "Manager";
                var leaveError = await leaveSvc.RejectAsync(request.ReferenceId, dto.Reason, rejectorName, approverId);
                if (leaveError != null) return Results.BadRequest(new { error = leaveError });
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã từ chối yêu cầu", id = request.Id });
            }

            request.Status = ApprovalStatus.Rejected;
            request.ApproverId = approverId;
            request.RejectionReason = dto.Reason;
            request.DecidedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã từ chối yêu cầu", id = request.Id });
        });
    }
}

public record ApproveRequestDto(string? Comments);
public record RejectApprovalDto(string Reason);
