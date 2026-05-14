using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;
using System.Security.Claims;

namespace HR;

public static class AttendanceEndpoints
{
    public static void MapAttendanceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/attendance").RequireAuthorization();

        // POST /api/hr/attendance/check-in
        group.MapPost("/check-in", async (HttpContext httpContext, HRDbContext db) =>
        {
            var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên" });

            var today = DateTime.UtcNow.Date;
            var existing = await db.AttendanceRecords
                .FirstOrDefaultAsync(a => a.EmployeeId == employee.Id && a.Date == today);

            if (existing != null && existing.CheckInTime.HasValue)
                return Results.BadRequest(new { error = "Đã check-in hôm nay rồi" });

            var ip = httpContext.Connection.RemoteIpAddress?.ToString();

            if (existing == null)
            {
                existing = new AttendanceRecord
                {
                    Id = Guid.NewGuid(),
                    EmployeeId = employee.Id,
                    Date = today,
                    CheckInTime = DateTime.UtcNow,
                    Status = AttendanceStatus.Present,
                    IpAddress = ip
                };
                db.AttendanceRecords.Add(existing);
            }
            else
            {
                existing.CheckInTime = DateTime.UtcNow;
                existing.Status = AttendanceStatus.Present;
                existing.IpAddress = ip;
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Check-in thành công", checkInTime = existing.CheckInTime });
        });

        // POST /api/hr/attendance/check-out
        group.MapPost("/check-out", async (HttpContext httpContext, HRDbContext db) =>
        {
            var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên" });

            var today = DateTime.UtcNow.Date;
            var record = await db.AttendanceRecords
                .FirstOrDefaultAsync(a => a.EmployeeId == employee.Id && a.Date == today);

            if (record == null || !record.CheckInTime.HasValue)
                return Results.BadRequest(new { error = "Chưa check-in hôm nay" });

            if (record.CheckOutTime.HasValue)
                return Results.BadRequest(new { error = "Đã check-out hôm nay rồi" });

            record.CheckOutTime = DateTime.UtcNow;
            var hours = (decimal)(record.CheckOutTime.Value - record.CheckInTime.Value).TotalHours;
            record.WorkHours = Math.Round(hours, 2);
            record.OvertimeHours = Math.Max(0, Math.Round(hours - 8m, 2));

            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Check-out thành công", workHours = record.WorkHours, checkOutTime = record.CheckOutTime });
        });

        // GET /api/hr/attendance/today
        group.MapGet("/today", async (ClaimsPrincipal user, HRDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên" });

            var today = DateTime.UtcNow.Date;
            var record = await db.AttendanceRecords
                .FirstOrDefaultAsync(a => a.EmployeeId == employee.Id && a.Date == today);

            return Results.Ok(record ?? (object)new { message = "Chưa có dữ liệu hôm nay" });
        });

        // GET /api/hr/attendance/report?month=2026-05 (manager)
        group.MapGet("/report", async (string? month, HRDbContext db) =>
        {
            var (from, to) = ParseMonthRange(month);
            var records = await db.AttendanceRecords
                .Where(a => a.Date >= from && a.Date < to)
                .OrderBy(a => a.EmployeeId).ThenBy(a => a.Date)
                .ToListAsync();
            return Results.Ok(records);
        }).RequireAuthorization(policy => policy.RequireRole("Admin", "Manager"));

        // GET /api/hr/attendance/my-report?month=2026-05
        group.MapGet("/my-report", async (string? month, ClaimsPrincipal user, HRDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên" });

            var (from, to) = ParseMonthRange(month);
            var records = await db.AttendanceRecords
                .Where(a => a.EmployeeId == employee.Id && a.Date >= from && a.Date < to)
                .OrderBy(a => a.Date)
                .ToListAsync();
            return Results.Ok(records);
        });
    }

    private static (DateTime From, DateTime To) ParseMonthRange(string? month)
    {
        if (!string.IsNullOrEmpty(month) && DateTime.TryParseExact(month, "yyyy-MM",
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None, out var parsed))
        {
            return (parsed, parsed.AddMonths(1));
        }
        var now = DateTime.UtcNow;
        return (new DateTime(now.Year, now.Month, 1), new DateTime(now.Year, now.Month, 1).AddMonths(1));
    }
}
