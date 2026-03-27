using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;
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
        var group = app.MapGroup("/api/hr").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "Accountant"));

        // ============================
        // LEAVE REQUESTS
        // ============================
        var leaveGroup = group.MapGroup("/leaves");

        // GET /api/hr/leaves
        leaveGroup.MapGet("", async (
            Guid? employeeId, string? status, string? type,
            int page, int pageSize,
            HRDbContext db) =>
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

        // POST /api/hr/leaves
        leaveGroup.MapPost("", async (CreateLeaveRequestDto dto, HRDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(dto.EmployeeId);
            if (employee == null) return Results.NotFound(new { error = "Nhân viên không tồn tại" });

            // Check for overlapping leave
            var overlap = await db.LeaveRequests.AnyAsync(l =>
                l.EmployeeId == dto.EmployeeId &&
                l.Status != RequestStatus.Cancelled &&
                l.Status != RequestStatus.Rejected &&
                l.StartDate <= dto.EndDate &&
                l.EndDate >= dto.StartDate);

            if (overlap) return Results.BadRequest(new { error = "Nhân viên đã có đơn nghỉ phép trùng ngày" });

            var leave = new LeaveRequest(
                dto.EmployeeId,
                Enum.Parse<LeaveType>(dto.Type),
                dto.StartDate,
                dto.EndDate,
                dto.Days,
                dto.Reason,
                dto.IsPaidLeave,
                dto.HandoverNotes,
                dto.HandoverTo,
                dto.ContactDuringLeave
            );

            db.LeaveRequests.Add(leave);
            await db.SaveChangesAsync();

            return Results.Created($"/api/hr/leaves/{leave.Id}", new { leave.Id, Status = leave.Status.ToString() });
        });

        // PUT /api/hr/leaves/{id}/approve
        leaveGroup.MapPut("{id:guid}/approve", async (Guid id, ClaimsPrincipal user, HRDbContext db) =>
        {
            var leave = await db.LeaveRequests.FindAsync(id);
            if (leave == null) return Results.NotFound();

            try
            {
                var approvedBy = user.FindFirst(ClaimTypes.Name)?.Value ?? "System";
                leave.Approve(approvedBy);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã duyệt đơn nghỉ phép", status = leave.Status.ToString() });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // PUT /api/hr/leaves/{id}/reject
        leaveGroup.MapPut("{id:guid}/reject", async (Guid id, RejectLeaveDto dto, ClaimsPrincipal user, HRDbContext db) =>
        {
            var leave = await db.LeaveRequests.FindAsync(id);
            if (leave == null) return Results.NotFound();

            try
            {
                var rejectedBy = user.FindFirst(ClaimTypes.Name)?.Value ?? "System";
                leave.Reject(dto.Reason, rejectedBy);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã từ chối đơn nghỉ phép", status = leave.Status.ToString() });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
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
                return Results.BadRequest(new { error = ex.Message });
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

        // ============================
        // SHIFTS
        // ============================
        var shiftGroup = group.MapGroup("/shifts");

        // GET /api/hr/shifts
        shiftGroup.MapGet("", async (HRDbContext db) =>
        {
            var shifts = await db.Shifts
                .OrderBy(s => s.DisplayOrder)
                .ThenBy(s => s.StartTime)
                .Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.StartTime,
                    s.EndTime,
                    s.BreakDurationMinutes,
                    s.Description,
                    s.ColorCode,
                    s.DisplayOrder,
                    s.IsActive,
                    Hours = s.CalculateHours()
                })
                .ToListAsync();
            return Results.Ok(shifts);
        });

        // POST /api/hr/shifts
        shiftGroup.MapPost("", async (CreateShiftDto dto, HRDbContext db) =>
        {
            var shift = new Shift(dto.Name, dto.StartTime, dto.EndTime,
                dto.BreakDurationMinutes, dto.Description, dto.ColorCode, dto.DisplayOrder);
            db.Shifts.Add(shift);
            await db.SaveChangesAsync();
            return Results.Created($"/api/hr/shifts/{shift.Id}", new { shift.Id, shift.Name });
        });

        // PUT /api/hr/shifts/{id}
        shiftGroup.MapPut("{id:guid}", async (Guid id, UpdateShiftDto dto, HRDbContext db) =>
        {
            var shift = await db.Shifts.FindAsync(id);
            if (shift == null) return Results.NotFound();
            shift.Update(dto.Name, dto.StartTime, dto.EndTime, dto.BreakDurationMinutes);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Cập nhật ca thành công" });
        });

        // PUT /api/hr/shifts/{id}/toggle
        shiftGroup.MapPut("{id:guid}/toggle", async (Guid id, HRDbContext db) =>
        {
            var shift = await db.Shifts.FindAsync(id);
            if (shift == null) return Results.NotFound();
            shift.SetActive(!shift.IsActive);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã cập nhật trạng thái", isActive = shift.IsActive });
        });

        // ============================
        // SHIFT ASSIGNMENTS
        // ============================
        var assignmentGroup = group.MapGroup("/shift-assignments");

        // GET /api/hr/shift-assignments
        assignmentGroup.MapGet("", async (
            Guid? employeeId, Guid? shiftId, string? status,
            DateOnly? fromDate, DateOnly? toDate,
            HRDbContext db) =>
        {
            var query = db.ShiftAssignments.AsQueryable();
            if (employeeId.HasValue) query = query.Where(a => a.EmployeeId == employeeId.Value);
            if (shiftId.HasValue) query = query.Where(a => a.ShiftId == shiftId.Value);
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<AssignmentStatus>(status, out var st))
                query = query.Where(a => a.Status == st);
            if (fromDate.HasValue) query = query.Where(a => a.Date >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(a => a.Date <= toDate.Value);

            var items = await query
                .OrderByDescending(a => a.Date)
                .ThenBy(a => a.EmployeeId)
                .Take(200)
                .Select(a => new
                {
                    a.Id,
                    a.EmployeeId,
                    EmployeeName = db.Employees.Where(e => e.Id == a.EmployeeId).Select(e => e.FullName).FirstOrDefault(),
                    a.ShiftId,
                    ShiftName = db.Shifts.Where(s => s.Id == a.ShiftId).Select(s => s.Name).FirstOrDefault(),
                    a.Date,
                    Status = a.Status.ToString(),
                    a.ActualStartTime,
                    a.ActualEndTime,
                    a.ActualHoursWorked,
                    a.CheckInAt,
                    a.CheckOutAt,
                    a.Notes
                })
                .ToListAsync();

            return Results.Ok(items);
        });

        // POST /api/hr/shift-assignments
        assignmentGroup.MapPost("", async (CreateShiftAssignmentDto dto, HRDbContext db) =>
        {
            // Check for existing assignment on same date
            var exists = await db.ShiftAssignments.AnyAsync(a =>
                a.EmployeeId == dto.EmployeeId && a.Date == dto.Date && a.Status != AssignmentStatus.Cancelled);
            if (exists) return Results.BadRequest(new { error = "Nhân viên đã có ca làm việc vào ngày này" });

            var assignment = new ShiftAssignment(dto.EmployeeId, dto.ShiftId, dto.Date);
            db.ShiftAssignments.Add(assignment);
            await db.SaveChangesAsync();
            return Results.Created($"/api/hr/shift-assignments/{assignment.Id}", new { assignment.Id });
        });

        // POST /api/hr/shift-assignments/batch — Assign shifts to multiple employees
        assignmentGroup.MapPost("batch", async (BatchAssignmentDto dto, HRDbContext db) =>
        {
            var created = 0;
            foreach (var empId in dto.EmployeeIds)
            {
                foreach (var date in dto.Dates)
                {
                    var exists = await db.ShiftAssignments.AnyAsync(a =>
                        a.EmployeeId == empId && a.Date == date && a.Status != AssignmentStatus.Cancelled);
                    if (exists) continue;

                    db.ShiftAssignments.Add(new ShiftAssignment(empId, dto.ShiftId, date));
                    created++;
                }
            }
            await db.SaveChangesAsync();
            return Results.Ok(new { message = $"Đã phân {created} ca làm việc", created });
        });

        // PUT /api/hr/shift-assignments/{id}/check-in
        assignmentGroup.MapPut("{id:guid}/check-in", async (Guid id, HttpContext httpContext, HRDbContext db) =>
        {
            var assignment = await db.ShiftAssignments.FindAsync(id);
            if (assignment == null) return Results.NotFound();
            try
            {
                var ip = httpContext.Connection.RemoteIpAddress?.ToString();
                assignment.CheckIn(TimeSpan.FromTicks(DateTime.UtcNow.TimeOfDay.Ticks), ip);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Check-in thành công", checkInAt = assignment.CheckInAt });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // PUT /api/hr/shift-assignments/{id}/check-out
        assignmentGroup.MapPut("{id:guid}/check-out", async (Guid id, HttpContext httpContext, HRDbContext db) =>
        {
            var assignment = await db.ShiftAssignments.FindAsync(id);
            if (assignment == null) return Results.NotFound();
            try
            {
                var ip = httpContext.Connection.RemoteIpAddress?.ToString();
                assignment.CheckOut(TimeSpan.FromTicks(DateTime.UtcNow.TimeOfDay.Ticks), ip);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Check-out thành công", hoursWorked = assignment.ActualHoursWorked });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // PUT /api/hr/shift-assignments/{id}/cancel
        assignmentGroup.MapPut("{id:guid}/cancel", async (Guid id, HRDbContext db) =>
        {
            var assignment = await db.ShiftAssignments.FindAsync(id);
            if (assignment == null) return Results.NotFound();
            try
            {
                assignment.Cancel();
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã hủy ca" });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });
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

public record CreateShiftDto(
    string Name,
    TimeSpan StartTime,
    TimeSpan EndTime,
    decimal? BreakDurationMinutes = null,
    string? Description = null,
    string? ColorCode = null,
    int DisplayOrder = 0
);

public record UpdateShiftDto(
    string Name,
    TimeSpan StartTime,
    TimeSpan EndTime,
    decimal? BreakDurationMinutes = null
);

public record CreateShiftAssignmentDto(
    Guid EmployeeId,
    Guid ShiftId,
    DateOnly Date
);

public record BatchAssignmentDto(
    List<Guid> EmployeeIds,
    Guid ShiftId,
    List<DateOnly> Dates
);
