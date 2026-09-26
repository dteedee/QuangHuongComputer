using BuildingBlocks.Security;
using BuildingBlocks.Time;
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
        // W1-10: chấm công của chính nhân viên (check-in/out) -> policy Staff: đã đăng nhập VÀ
        // là nhân viên nội bộ. Trước đây RequireAuthorization() trống nên token Customer cũng vào được.
        // Các endpoint quản trị bên dưới khai báo quyền HR.ViewAttendance/ManageAttendance riêng.
        var group = app.MapGroup("/api/hr/attendance").RequireAuthorization(SecurityPolicies.Staff);

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
        group.MapGet("/qr-code", (Guid storeId, AttendanceValidator validator) =>
        {
            var code = validator.GenerateCode(storeId);
            if (code is null)
                return Results.Json(new { error = AttendanceValidator.QrNotConfiguredReason },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            var expiresIn = 30 - (int)(DateTimeOffset.UtcNow.ToUnixTimeSeconds() % 30);
            return Results.Ok(new { storeId, code, expiresInSeconds = expiresIn });
        }).RequireAuthorization(Permissions.HR.ViewAttendance);

        // GET /api/hr/attendance?employeeId=&year=&month=&storeId=&page=&pageSize= — danh sách phân trang
        // (W2-7 khoản 8: FE api/hr.ts gọi route này nhưng BE trước đây chỉ có /report, /today, /my-report.)
        group.MapGet("", async (
            HRDbContext db, Guid? employeeId, int? year, int? month, Guid? storeId,
            int page = 0, int pageSize = 0) =>
        {
            page = page <= 0 ? 1 : page;
            pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 200);

            var query = db.AttendanceRecords.AsQueryable();
            if (employeeId.HasValue) query = query.Where(a => a.EmployeeId == employeeId.Value);
            if (storeId.HasValue) query = query.Where(a => a.StoreId == storeId.Value);
            if (year.HasValue && month.HasValue)
            {
                var from = new DateTime(year.Value, month.Value, 1);
                query = query.Where(a => a.Date >= from && a.Date < from.AddMonths(1));
            }
            else if (year.HasValue)
            {
                query = query.Where(a => a.Date.Year == year.Value);
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(a => a.Date).ThenBy(a => a.EmployeeId)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .ToListAsync();

            return Results.Ok(new { items, total, page, pageSize });
        }).RequireAuthorization(Permissions.HR.ViewAttendance);

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
        }).RequireAuthorization(Permissions.HR.ManageAttendance);

        // GET /api/hr/attendance/today
        group.MapGet("/today", async (ClaimsPrincipal user, HRDbContext db, IBusinessClock clock) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên." });

            var today = clock.TodayVn.ToDateTime(TimeOnly.MinValue);
            var record = await db.AttendanceRecords
                .FirstOrDefaultAsync(a => a.EmployeeId == employee.Id && a.Date == today);

            return Results.Ok(record ?? (object)new { message = "Chưa có dữ liệu hôm nay." });
        });

        // GET /api/hr/attendance/report?month=2026-05
        group.MapGet("/report", async (string? month, HRDbContext db, IBusinessClock clock) =>
        {
            var (from, to) = ParseMonthRange(month, clock);
            var records = await db.AttendanceRecords
                .Where(a => a.Date >= from && a.Date < to)
                .OrderBy(a => a.EmployeeId).ThenBy(a => a.Date)
                .ToListAsync();
            return Results.Ok(records);
        }).RequireAuthorization(Permissions.HR.ViewAttendance);

        // GET /api/hr/attendance/my-report?month=2026-05
        group.MapGet("/my-report", async (string? month, ClaimsPrincipal user, HRDbContext db, IBusinessClock clock) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên." });

            var (from, to) = ParseMonthRange(month, clock);
            var records = await db.AttendanceRecords
                .Where(a => a.EmployeeId == employee.Id && a.Date >= from && a.Date < to)
                .OrderBy(a => a.Date)
                .ToListAsync();
            return Results.Ok(records);
        });

        // ==================== ATTENDANCE RULES ====================
        // W2-7 khoản 8: FE api/hr.ts gọi '/hr/attendance-rules' (route riêng, không lồng trong
        // /attendance) — nhóm cũ '/api/hr/attendance/rules' không khớp nên trang cấu hình quy tắc
        // chấm công của FE luôn 404. Đổi sang nhóm top-level đúng hợp đồng, thêm PUT update
        // (trước đây chỉ có Create, không Update/Delete — FE gọi PUT /hr/attendance-rules/{id}).
        var rulesGroup = app.MapGroup("/api/hr/attendance-rules").RequireAuthorization(SecurityPolicies.Staff);

        rulesGroup.MapGet("", async (HRDbContext db) =>
            Results.Ok(await db.AttendanceRules.OrderBy(r => r.StoreId).ToListAsync())
        ).RequireAuthorization(Permissions.HR.ViewAttendance);

        rulesGroup.MapPost("", async (CreateAttendanceRuleDto dto, HRDbContext db) =>
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
            return Results.Created($"/api/hr/attendance-rules/{rule.Id}", rule);
        }).RequireAuthorization(Permissions.HR.ManageAttendance);

        rulesGroup.MapPut("/{id:guid}", async (Guid id, CreateAttendanceRuleDto dto, HRDbContext db) =>
        {
            var rule = await db.AttendanceRules.FindAsync(id);
            if (rule == null) return Results.NotFound();
            rule.Update(
                dto.Name, dto.LateToleranceMinutes, dto.LateFineMoneyPerMinute,
                dto.HalfDayThresholdMinutes, dto.EarlyLeaveToleranceMinutes,
                dto.OvertimeWeekdayRate, dto.OvertimeSundayRate, dto.OvertimeHolidayRate,
                dto.OvertimeNightBonus, dto.GpsRadiusMeters, dto.StandardWorkHoursPerDay);
            await db.SaveChangesAsync();
            return Results.Ok(rule);
        }).RequireAuthorization(Permissions.HR.ManageAttendance);

        rulesGroup.MapDelete("/{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var rule = await db.AttendanceRules.FindAsync(id);
            if (rule == null) return Results.NotFound();
            db.AttendanceRules.Remove(rule);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã xoá quy tắc chấm công." });
        }).RequireAuthorization(Permissions.HR.ManageAttendance);

        // ==================== MONTHLY TIMESHEET ====================
        // W1-10: bảng công tháng của chính mình -> Staff (endpoint tổng hợp bên dưới có quyền riêng).
        // W2-7 khoản 8: đổi "/timesheet-monthly" -> "/timesheet" khớp hợp đồng FE (api/hr.ts
        // timesheetApi.get/aggregate gọi "/hr/timesheet/{employeeId}") — route cũ không khớp gì
        // nên trang bảng công tháng của FE luôn 404.
        var timesheetGroup = app.MapGroup("/api/hr/timesheet").RequireAuthorization(SecurityPolicies.Staff);

        // IDOR guard: any authenticated user could read ANY employee's monthly timesheet by
        // guessing the GUID — scope to staff roles or the timesheet's own employee.
        timesheetGroup.MapGet("/{employeeId:guid}", async (Guid employeeId, int year, int month, HRDbContext db, ClaimsPrincipal user) =>
        {
            var isStaff = user.IsInRole("Admin") || user.IsInRole("Manager") || user.IsInRole("Accountant") || user.IsInRole("HR");
            if (!isStaff)
            {
                var callerUserId = user.FindFirstValue(ClaimTypes.NameIdentifier);
                var isOwner = await db.Employees.AnyAsync(e => e.Id == employeeId && e.UserId == callerUserId);
                if (!isOwner) return Results.Forbid();
            }

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
            }).RequireAuthorization(Permissions.HR.ManageAttendance);

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
            }).RequireAuthorization(Permissions.HR.ManageAttendance);
    }

    private static (DateTime From, DateTime To) ParseMonthRange(string? month, IBusinessClock clock)
    {
        if (!string.IsNullOrEmpty(month) && DateTime.TryParseExact(month, "yyyy-MM",
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None, out var parsed))
        {
            return (parsed, parsed.AddMonths(1));
        }
        // "Tháng này" theo ngày làm việc VN, không phải ngày UTC (lệch gần ranh giới tháng).
        var now = clock.TodayVn;
        var start = new DateTime(now.Year, now.Month, 1);
        return (start, start.AddMonths(1));
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
