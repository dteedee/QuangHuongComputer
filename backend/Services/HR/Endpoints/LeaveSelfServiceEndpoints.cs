using System.Security.Claims;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Application.Leave;
using HR.Domain;
using HR.Infrastructure;

namespace HR.Endpoints;

/// <summary>
/// W2-7 khoản 7/8 — route "/api/hr/leave" (số ít) khớp hợp đồng FE (api/hr.ts leavePhase06Api):
/// mine/pending/create/approve/reject. Trước đây BE chỉ có "/api/hr/leaves" (số nhiều, khác
/// contract) nên trang self-service của FE 404. Dùng chung LeaveApprovalService với
/// HRLeaveEndpoints — MỘT đường duyệt duy nhất, không tạo logic thứ hai.
/// </summary>
public static class LeaveSelfServiceEndpoints
{
    public static void MapLeaveSelfServiceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/leave").RequireAuthorization(SecurityPolicies.Staff);

        // GET /api/hr/leave/mine
        group.MapGet("/mine", async (ClaimsPrincipal user, HRDbContext db) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid)) return Results.Unauthorized();
            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == uid);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên." });

            var items = await db.LeaveRequests
                .Where(l => l.EmployeeId == employee.Id)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();
            return Results.Ok(items);
        });

        // GET /api/hr/leave/pending — chờ duyệt (quản lý/HR)
        group.MapGet("/pending", async (HRDbContext db) =>
            Results.Ok(await db.LeaveRequests
                .Where(l => l.Status == RequestStatus.Pending)
                .OrderBy(l => l.StartDate)
                .ToListAsync())
        ).RequireAuthorization(Permissions.HR.ApproveLeave);

        // POST /api/hr/leave — nộp đơn (Days tính server-side, không nhận từ client).
        group.MapPost("", async (LeaveSelfServiceCreateDto dto, ClaimsPrincipal user, HRDbContext db, LeaveApprovalService svc) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid)) return Results.Unauthorized();
            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == uid);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên." });

            var (leave, error) = await svc.SubmitAsync(employee, dto.Type, dto.StartDate, dto.EndDate, dto.Reason);
            if (error != null) return Results.BadRequest(new { error });
            return Results.Created($"/api/hr/leave/{leave!.Id}", leave);
        });

        // POST /api/hr/leave/{id}/approve
        group.MapPost("/{id:guid}/approve", async (Guid id, ClaimsPrincipal user, LeaveApprovalService svc) =>
        {
            var approvedBy = user.FindFirstValue(ClaimTypes.Name) ?? "System";
            var uidStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid.TryParse(uidStr, out var approverId);
            var error = await svc.ApproveAsync(id, approvedBy, approverId == Guid.Empty ? null : approverId);
            if (error != null)
                return error.StartsWith("Không tìm thấy") ? Results.NotFound(new { error }) : Results.BadRequest(new { error });
            return Results.Ok(new { message = "Đã duyệt đơn nghỉ phép." });
        }).RequireAuthorization(Permissions.HR.ApproveLeave);

        // POST /api/hr/leave/{id}/reject
        group.MapPost("/{id:guid}/reject", async (Guid id, LeaveRejectDto dto, ClaimsPrincipal user, LeaveApprovalService svc) =>
        {
            var rejectedBy = user.FindFirstValue(ClaimTypes.Name) ?? "System";
            var uidStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid.TryParse(uidStr, out var approverId);
            var error = await svc.RejectAsync(id, dto.Reason, rejectedBy, approverId == Guid.Empty ? null : approverId);
            if (error != null)
                return error.StartsWith("Không tìm thấy") ? Results.NotFound(new { error }) : Results.BadRequest(new { error });
            return Results.Ok(new { message = "Đã từ chối đơn nghỉ phép." });
        }).RequireAuthorization(Permissions.HR.ApproveLeave);

        // POST /api/hr/leave/{id}/cancel — nhân viên tự huỷ đơn của MÌNH (IDOR guard: chỉ chủ đơn).
        group.MapPost("/{id:guid}/cancel", async (Guid id, ClaimsPrincipal user, HRDbContext db) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid)) return Results.Unauthorized();
            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == uid);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên." });

            var leave = await db.LeaveRequests.FindAsync(id);
            if (leave == null) return Results.NotFound();
            if (leave.EmployeeId != employee.Id) return Results.Forbid();

            try
            {
                leave.Cancel();
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã huỷ đơn nghỉ phép." });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });
    }
}

public record LeaveSelfServiceCreateDto(LeaveType Type, DateTime StartDate, DateTime EndDate, string? Reason);
public record LeaveRejectDto(string Reason);
