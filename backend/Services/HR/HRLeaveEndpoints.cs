using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;
using HR.Application.Leave;
using HR.Endpoints;
using System.Security.Claims;

namespace HR;

/// <summary>
/// Leave Request + Shift Management Endpoints
/// Phase 2.2: HR Leave Management & Employee Portal
/// </summary>
public static class HRLeaveEndpoints
{
    public static void MapHRLeaveEndpoints(this IEndpointRouteBuilder app)
    {
        // W2-7 khoản 6: Shifts + ShiftAssignments tách sang Endpoints/ShiftEndpoints.cs (file này
        // đã 480 dòng). Gọi từ đây, không đổi Program.cs (frozen).
        app.MapShiftEndpoints();
        // W2-7 khoản 7/8: route self-service "/hr/leave" (số ít) khớp hợp đồng FE — xem cuối file.
        app.MapLeaveSelfServiceEndpoints();

        var group = app.MapGroup("/api/hr").RequireModulePermissions(PermissionModules.HR);

        // ============================
        // LEAVE REQUESTS
        // ============================
        // W1-10: nghỉ phép = dữ liệu nhân sự -> GET HR.ViewEmployees, ghi HR.ManageEmployees.
        var leaveGroup = group.MapGroup("/leaves").RequireModulePermissions(PermissionModules.HR);

        // GET /api/hr/leaves
        // W2-7: page/pageSize không có default -> ASP.NET Core minimal API coi là bắt buộc,
        // gọi "/leaves" (không kèm ?page=&pageSize=) trả 400 thay vì trang đầu mặc định. Bug
        // giống hệt phát hiện được ở EmployeeEndpoints/AttendanceEndpoints khi chạy probe thật.
        leaveGroup.MapGet("", async (
            Guid? employeeId, string? status, string? type,
            HRDbContext db, int page = 0, int pageSize = 0) =>
        {
            page = page <= 0 ? 1 : page;
            pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 100);

            var query = db.LeaveRequests.AsQueryable();
            if (employeeId.HasValue) query = query.Where(l => l.EmployeeId == employeeId.Value);
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<RequestStatus>(status, out var st))
                query = query.Where(l => l.Status == st);
            if (!string.IsNullOrEmpty(type) && Enum.TryParse<LeaveType>(type, out var lt))
                query = query.Where(l => l.Type == lt);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new
                {
                    l.Id,
                    l.EmployeeId,
                    EmployeeName = db.Employees.Where(e => e.Id == l.EmployeeId).Select(e => e.FullName).FirstOrDefault(),
                    Type = l.Type.ToString(),
                    l.StartDate,
                    l.EndDate,
                    l.Days,
                    l.Reason,
                    Status = l.Status.ToString(),
                    l.ApprovedAt,
                    l.ApprovedBy,
                    l.RejectReason,
                    l.RejectedAt,
                    l.IsPaidLeave,
                    l.HandoverTo,
                    l.HandoverNotes,
                    l.ContactDuringLeave,
                    l.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(new { items, total, page, pageSize });
        });

        // GET /api/hr/leaves/{id}
        leaveGroup.MapGet("{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var leave = await db.LeaveRequests.FindAsync(id);
            if (leave == null) return Results.NotFound(new { error = "Không tìm thấy đơn nghỉ phép" });

            var employeeName = await db.Employees
                .Where(e => e.Id == leave.EmployeeId)
                .Select(e => e.FullName).FirstOrDefaultAsync();

            return Results.Ok(new
            {
                leave.Id,
                leave.EmployeeId,
                EmployeeName = employeeName,
                Type = leave.Type.ToString(),
                leave.StartDate,
                leave.EndDate,
                leave.Days,
                leave.Reason,
                Status = leave.Status.ToString(),
                leave.ApprovedAt,
                leave.ApprovedBy,
                leave.RejectReason,
                leave.RejectedAt,
                leave.IsPaidLeave,
                leave.HandoverTo,
                leave.HandoverNotes,
                leave.ContactDuringLeave,
                leave.CreatedAt
            });
        });

        // POST /api/hr/leaves — W2-7 khoản 6: đi qua LeaveApprovalService (MỘT đường nộp/duyệt
        // duy nhất) để hạn mức phép được kiểm tra thật, thay vì tạo LeaveRequest trực tiếp không
        // kiểm tra gì (dto.Days trước đây do client tự khai, không xác minh với số ngày công thật).
        leaveGroup.MapPost("", async (CreateLeaveRequestDto dto, HRDbContext db, LeaveApprovalService svc) =>
        {
            var employee = await db.Employees.FindAsync(dto.EmployeeId);
            if (employee == null) return Results.NotFound(new { error = "Nhân viên không tồn tại" });

            var (leave, error) = await svc.SubmitAsync(
                employee, Enum.Parse<LeaveType>(dto.Type), dto.StartDate, dto.EndDate, dto.Reason,
                dto.IsPaidLeave, dto.HandoverTo, dto.HandoverNotes, dto.ContactDuringLeave);
            if (error != null) return Results.BadRequest(new { error });

            return Results.Created($"/api/hr/leaves/{leave!.Id}", new { leave.Id, leave.Days, Status = leave.Status.ToString() });
        });

        // PUT /api/hr/leaves/{id}/approve — cùng đường duyệt với POST /api/hr/leave/{id}/approve
        // và POST /api/hr/approvals/{id}/approve (LeaveApprovalService.ApproveAsync).
        leaveGroup.MapPut("{id:guid}/approve", async (Guid id, ClaimsPrincipal user, LeaveApprovalService svc) =>
        {
            var approvedBy = user.FindFirst(ClaimTypes.Name)?.Value ?? "System";
            var approverIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid.TryParse(approverIdStr, out var approverId);
            var error = await svc.ApproveAsync(id, approvedBy, approverId == Guid.Empty ? null : approverId);
            if (error != null)
                return error.StartsWith("Không tìm thấy") ? Results.NotFound(new { error }) : Results.BadRequest(new { error });
            return Results.Ok(new { message = "Đã duyệt đơn nghỉ phép" });
        });

        // PUT /api/hr/leaves/{id}/reject
        leaveGroup.MapPut("{id:guid}/reject", async (Guid id, RejectLeaveDto dto, ClaimsPrincipal user, LeaveApprovalService svc) =>
        {
            var rejectedBy = user.FindFirst(ClaimTypes.Name)?.Value ?? "System";
            var approverIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid.TryParse(approverIdStr, out var approverId);
            var error = await svc.RejectAsync(id, dto.Reason, rejectedBy, approverId == Guid.Empty ? null : approverId);
            if (error != null)
                return error.StartsWith("Không tìm thấy") ? Results.NotFound(new { error }) : Results.BadRequest(new { error });
            return Results.Ok(new { message = "Đã từ chối đơn nghỉ phép" });
        });

        // PUT /api/hr/leaves/{id}/cancel
        leaveGroup.MapPut("{id:guid}/cancel", async (Guid id, HRDbContext db) =>
        {
            var leave = await db.LeaveRequests.FindAsync(id);
            if (leave == null) return Results.NotFound();

            try
            {
                leave.Cancel();
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã hủy đơn nghỉ phép" });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        });

        // GET /api/hr/leaves/summary — Leave balance summary per employee
        leaveGroup.MapGet("summary/{employeeId:guid}", async (Guid employeeId, int year, HRDbContext db) =>
        {
            year = year <= 0 ? DateTime.UtcNow.Year : year;
            var employee = await db.Employees.FindAsync(employeeId);
            if (employee == null) return Results.NotFound(new { error = "Nhân viên không tồn tại" });

            var approved = await db.LeaveRequests
                .Where(l => l.EmployeeId == employeeId && l.Status == RequestStatus.Approved
                    && l.StartDate.Year == year)
                .ToListAsync();

            var summary = new
            {
                EmployeeId = employeeId,
                Year = year,
                AnnualLeaveUsed = approved.Where(l => l.Type == LeaveType.Annual).Sum(l => l.Days),
                SickLeaveUsed = approved.Where(l => l.Type == LeaveType.Sick).Sum(l => l.Days),
                UnpaidLeaveUsed = approved.Where(l => l.Type == LeaveType.Unpaid).Sum(l => l.Days),
                TotalDaysUsed = approved.Sum(l => l.Days),
                PendingRequests = await db.LeaveRequests.CountAsync(l => l.EmployeeId == employeeId && l.Status == RequestStatus.Pending),
                AnnualLeaveTotal = 12m, // Default 12 days/year per Vietnamese labor law
                SickLeaveTotal = 30m   // Default 30 days/year per Vietnamese labor law
            };

            return Results.Ok(summary);
        });

        // Shifts + ShiftAssignments: xem Endpoints/ShiftEndpoints.cs (gọi ở đầu MapHRLeaveEndpoints).
    }
}

// DTOs
public record CreateLeaveRequestDto(
    Guid EmployeeId,
    string Type,
    DateTime StartDate,
    DateTime EndDate,
    decimal Days,
    string? Reason,
    bool IsPaidLeave = true,
    string? HandoverNotes = null,
    string? HandoverTo = null,
    string? ContactDuringLeave = null
);

public record RejectLeaveDto(string Reason);
