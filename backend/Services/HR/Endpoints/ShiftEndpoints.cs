using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Domain;
using HR.Infrastructure;

namespace HR.Endpoints;

/// <summary>
/// Ca làm việc + phân ca. Tách khỏi HRLeaveEndpoints.cs (đã 480 dòng) — gọi từ
/// <see cref="HR.HRLeaveEndpoints.MapHRLeaveEndpoints"/> nên không cần sửa Program.cs (frozen).
/// </summary>
public static class ShiftEndpoints
{
    public static void MapShiftEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr").RequireModulePermissions(PermissionModules.HR);

        // ============================
        // SHIFTS
        // ============================
        var shiftGroup = group.MapGroup("/shifts").RequireModulePermissions(PermissionModules.Attendance);

        shiftGroup.MapGet("", async (HRDbContext db) =>
        {
            var shifts = await db.Shifts
                .OrderBy(s => s.DisplayOrder).ThenBy(s => s.StartTime)
                .Select(s => new
                {
                    s.Id, s.Name, s.StartTime, s.EndTime, s.BreakDurationMinutes,
                    s.Description, s.ColorCode, s.DisplayOrder, s.IsActive,
                    Hours = s.CalculateHours()
                })
                .ToListAsync();
            return Results.Ok(shifts);
        });

        shiftGroup.MapPost("", async (CreateShiftDto dto, HRDbContext db) =>
        {
            var shift = new Shift(dto.Name, dto.StartTime, dto.EndTime,
                dto.BreakDurationMinutes, dto.Description, dto.ColorCode, dto.DisplayOrder);
            db.Shifts.Add(shift);
            await db.SaveChangesAsync();
            return Results.Created($"/api/hr/shifts/{shift.Id}", new { shift.Id, shift.Name });
        });

        shiftGroup.MapPut("{id:guid}", async (Guid id, UpdateShiftDto dto, HRDbContext db) =>
        {
            var shift = await db.Shifts.FindAsync(id);
            if (shift == null) return Results.NotFound();
            shift.Update(dto.Name, dto.StartTime, dto.EndTime, dto.BreakDurationMinutes);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Cập nhật ca thành công" });
        });

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
        var assignmentGroup = group.MapGroup("/shift-assignments").RequireModulePermissions(PermissionModules.Attendance);

        assignmentGroup.MapGet("", async (
            Guid? employeeId, Guid? shiftId, string? status,
            DateOnly? fromDate, DateOnly? toDate, HRDbContext db) =>
        {
            var query = db.ShiftAssignments.AsQueryable();
            if (employeeId.HasValue) query = query.Where(a => a.EmployeeId == employeeId.Value);
            if (shiftId.HasValue) query = query.Where(a => a.ShiftId == shiftId.Value);
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<AssignmentStatus>(status, out var st))
                query = query.Where(a => a.Status == st);
            if (fromDate.HasValue) query = query.Where(a => a.Date >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(a => a.Date <= toDate.Value);

            var items = await query
                .OrderByDescending(a => a.Date).ThenBy(a => a.EmployeeId)
                .Take(200)
                .Select(a => new
                {
                    a.Id, a.EmployeeId,
                    EmployeeName = db.Employees.Where(e => e.Id == a.EmployeeId).Select(e => e.FullName).FirstOrDefault(),
                    a.ShiftId,
                    ShiftName = db.Shifts.Where(s => s.Id == a.ShiftId).Select(s => s.Name).FirstOrDefault(),
                    a.Date, Status = a.Status.ToString(),
                    a.ActualStartTime, a.ActualEndTime, a.ActualHoursWorked,
                    a.CheckInAt, a.CheckOutAt, a.Notes
                })
                .ToListAsync();

            return Results.Ok(items);
        });

        assignmentGroup.MapPost("", async (CreateShiftAssignmentDto dto, HRDbContext db) =>
        {
            var exists = await db.ShiftAssignments.AnyAsync(a =>
                a.EmployeeId == dto.EmployeeId && a.Date == dto.Date && a.Status != AssignmentStatus.Cancelled);
            if (exists) return Results.BadRequest(new { error = "Nhân viên đã có ca làm việc vào ngày này" });

            var assignment = new ShiftAssignment(dto.EmployeeId, dto.ShiftId, dto.Date);
            db.ShiftAssignments.Add(assignment);
            await db.SaveChangesAsync();
            return Results.Created($"/api/hr/shift-assignments/{assignment.Id}", new { assignment.Id });
        });

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
            catch (InvalidOperationException) { return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." }); }
        });

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
            catch (InvalidOperationException) { return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." }); }
        });

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
            catch (InvalidOperationException) { return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." }); }
        });
    }
}

public record CreateShiftDto(
    string Name, TimeSpan StartTime, TimeSpan EndTime,
    decimal? BreakDurationMinutes = null, string? Description = null,
    string? ColorCode = null, int DisplayOrder = 0);

public record UpdateShiftDto(string Name, TimeSpan StartTime, TimeSpan EndTime, decimal? BreakDurationMinutes = null);
public record CreateShiftAssignmentDto(Guid EmployeeId, Guid ShiftId, DateOnly Date);
public record BatchAssignmentDto(List<Guid> EmployeeIds, Guid ShiftId, List<DateOnly> Dates);
