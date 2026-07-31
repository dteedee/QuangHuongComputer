using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;
using HR.Application.Attendance;
using System.Security.Claims;

namespace HR;

public static class AttendanceEndpoints
{
    public static void MapAttendanceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/attendance").RequireAuthorization();

        // POST /api/hr/attendance/check-in — nhiều phương thức QR/GPS/WiFi/Web
        group.MapPost("/check-in", async (
            CheckInRequestDto dto,
            HttpContext httpContext,
            HRDbContext db,
            AttendanceCheckInService svc) =>
        {
            var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên." });

            var ip = httpContext.Connection.RemoteIpAddress?.ToString();
            var payload = new CheckInPayload(
                EmployeeId: employee.Id,
                Method: dto.Method,
                QrCode: dto.QrCode,
                Latitude: dto.Latitude,
                Longitude: dto.Longitude,
                DeviceId: dto.DeviceId,
                IpAddress: ip,
                StoreId: dto.StoreId);

            var result = await svc.CheckInAsync(payload);
            return result.Success
                ? Results.Ok(new { message = result.Message, id = result.AttendanceRecordId, lateMinutes = result.LateMinutes })
                : Results.BadRequest(new { error = result.Message });
        });

        // POST /api/hr/attendance/check-out
        group.MapPost("/check-out", async (
            HttpContext httpContext,
            HRDbContext db,
            AttendanceCheckInService svc) =>
        {
            var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên." });

            var result = await svc.CheckOutAsync(employee.Id);
            return result.Success
                ? Results.Ok(new { message = result.Message, id = result.AttendanceRecordId })
                : Results.BadRequest(new { error = result.Message });
        });

        // GET /api/hr/attendance/qr-code?storeId= — sinh mã TOTP 30s
        group.MapGet("/qr-code", (Guid storeId) =>
        {
            var code = AttendanceValidator.GenerateQr(storeId);
            var expiresIn = 30 - (int)(DateTimeOffset.UtcNow.ToUnixTimeSeconds() % 30);
            return Results.Ok(new { storeId, code, expiresInSeconds = expiresIn });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Manager"));

        // POST /api/hr/attendance/manual — quản lý chấm hộ
        group.MapPost("/manual", async (
            ManualAttendanceDto dto,
            HttpContext httpContext,
            AttendanceCheckInService svc) =>
        {
            var mgrIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(mgrIdStr) || !Guid.TryParse(mgrIdStr, out var mgrId))
                return Results.Unauthorized();

            var result = await svc.ManualCheckInAsync(
                employeeId: dto.EmployeeId,
                managerId: mgrId,
                date: dto.Date,
                reason: dto.Reason,
                checkInTime: dto.CheckInTime,
                checkOutTime: dto.CheckOutTime);

            return result.Success
                ? Results.Ok(new { message = result.Message, id = result.AttendanceRecordId })
                : Results.BadRequest(new { error = result.Message });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Manager"));

        // GET /api/hr/attendance/today
        group.MapGet("/today", async (ClaimsPrincipal user, HRDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên." });

            var today = DateTime.UtcNow.Date;
            var record = await db.AttendanceRecords
                .FirstOrDefaultAsync(a => a.EmployeeId == employee.Id && a.Date == today);

            return Results.Ok(record ?? (object)new { message = "Chưa có dữ liệu hôm nay." });
        });

        // GET /api/hr/attendance/report?month=2026-05
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
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên." });

            var (from, to) = ParseMonthRange(month);
            var records = await db.AttendanceRecords
                .Where(a => a.EmployeeId == employee.Id && a.Date >= from && a.Date < to)
                .OrderBy(a => a.Date)
                .ToListAsync();
            return Results.Ok(records);
        });

        // ==================== ATTENDANCE RULES ====================
        group.MapGet("/rules", async (HRDbContext db) =>
            Results.Ok(await db.AttendanceRules.OrderBy(r => r.StoreId).ToListAsync())
        ).RequireAuthorization(p => p.RequireRole("Admin", "Manager"));

        group.MapPost("/rules", async (CreateAttendanceRuleDto dto, HRDbContext db) =>
        {
            var rule = new AttendanceRule(
                dto.Name,
                dto.StoreId,
                dto.LateToleranceMinutes,
                dto.LateFineMoneyPerMinute,
                dto.HalfDayThresholdMinutes,
                dto.EarlyLeaveToleranceMinutes,
                dto.OvertimeWeekdayRate,
                dto.OvertimeSundayRate,
                dto.OvertimeHolidayRate,
                dto.OvertimeNightBonus,
                dto.GpsRadiusMeters,
                dto.StandardWorkHoursPerDay);
            db.AttendanceRules.Add(rule);
            await db.SaveChangesAsync();
            return Results.Created($"/api/hr/attendance/rules/{rule.Id}", rule);
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // ==================== MONTHLY TIMESHEET ====================
        var timesheetGroup = app.MapGroup("/api/hr/timesheet-monthly").RequireAuthorization();

        timesheetGroup.MapGet("/{employeeId:guid}", async (Guid employeeId, int year, int month, HRDbContext db) =>
        {
            var ts = await db.MonthlyTimesheets
                .FirstOrDefaultAsync(t => t.EmployeeId == employeeId && t.Year == year && t.Month == month);
            return ts != null ? Results.Ok(ts) : Results.NotFound(new { error = "Chưa có bảng công tháng này." });
        });

        timesheetGroup.MapPost("/{employeeId:guid}/aggregate",
            async (Guid employeeId, int year, int month, AttendanceAggregationService svc) =>
            {
                try
                {
                    var ts = await svc.AggregateAsync(employeeId, year, month);
                    return Results.Ok(ts);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            }).RequireAuthorization(p => p.RequireRole("Admin", "Manager", "Accountant"));

        timesheetGroup.MapPost("/{id:guid}/lock",
            async (Guid id, HRDbContext db, ClaimsPrincipal user) =>
            {
                var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(uid) || !Guid.TryParse(uid, out var userId))
                    return Results.Unauthorized();
                var ts = await db.MonthlyTimesheets.FindAsync(id);
                if (ts == null) return Results.NotFound();
                try
                {
                    ts.Lock(userId);
                    await db.SaveChangesAsync();
                    return Results.Ok(new { message = "Bảng công đã chốt.", ts.LockedAt });
                }
                catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
            }).RequireAuthorization(p => p.RequireRole("Admin", "Manager", "Accountant"));
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

// ==================== DTOs ====================
public record CheckInRequestDto(
    CheckInMethod Method,
    string? QrCode,
    decimal? Latitude,
    decimal? Longitude,
    string? DeviceId,
    Guid? StoreId);

public record ManualAttendanceDto(
    Guid EmployeeId,
    DateTime Date,
    string Reason,
    DateTime? CheckInTime,
    DateTime? CheckOutTime);

public record CreateAttendanceRuleDto(
    string Name,
    Guid? StoreId,
    int LateToleranceMinutes = 5,
    decimal LateFineMoneyPerMinute = 0,
    int HalfDayThresholdMinutes = 240,
    int EarlyLeaveToleranceMinutes = 5,
    decimal OvertimeWeekdayRate = 1.5m,
    decimal OvertimeSundayRate = 2.0m,
    decimal OvertimeHolidayRate = 3.0m,
    decimal OvertimeNightBonus = 0.3m,
    int GpsRadiusMeters = 100,
    decimal StandardWorkHoursPerDay = 8m);
