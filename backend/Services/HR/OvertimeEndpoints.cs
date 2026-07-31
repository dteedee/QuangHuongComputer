using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;
using System.Security.Claims;

namespace HR;

public static class OvertimeEndpoints
{
    public static void MapOvertimeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/overtime").RequireAuthorization();

        // POST /api/hr/overtime — nhân viên đăng ký OT trước khi làm
        group.MapPost("/", async (CreateOvertimeRequestDto dto, HttpContext ctx, HRDbContext db) =>
        {
            var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên." });

            try
            {
                var req = new OvertimeRequest(employee.Id, dto.Date, dto.StartTime, dto.EndTime, dto.Reason);
                db.OvertimeRequests.Add(req);
                await db.SaveChangesAsync();
                return Results.Created($"/api/hr/overtime/{req.Id}", req);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        // GET /api/hr/overtime/pending — danh sách chờ duyệt
        group.MapGet("/pending", async (HRDbContext db) =>
            Results.Ok(await db.OvertimeRequests
                .Where(o => o.Status == OvertimeStatus.Pending)
                .OrderBy(o => o.Date)
                .ToListAsync())
        ).RequireAuthorization(p => p.RequireRole("Admin", "Manager"));

        // GET /api/hr/overtime/my — của chính nhân viên
        group.MapGet("/my", async (ClaimsPrincipal user, HRDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound();
            return Results.Ok(await db.OvertimeRequests
                .Where(o => o.EmployeeId == employee.Id)
                .OrderByDescending(o => o.Date)
                .Take(50)
                .ToListAsync());
        });

        group.MapPost("/{id:guid}/approve", async (Guid id, HRDbContext db, ClaimsPrincipal user) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid) || !Guid.TryParse(uid, out var approverId))
                return Results.Unauthorized();
            var req = await db.OvertimeRequests.FindAsync(id);
            if (req == null) return Results.NotFound();
            try
            {
                req.Approve(approverId);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã duyệt OT.", req.Status });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        }).RequireAuthorization(p => p.RequireRole("Admin", "Manager"));

        group.MapPost("/{id:guid}/reject",
            async (Guid id, RejectOvertimeDto dto, HRDbContext db, ClaimsPrincipal user) =>
            {
                var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(uid) || !Guid.TryParse(uid, out var approverId))
                    return Results.Unauthorized();
                var req = await db.OvertimeRequests.FindAsync(id);
                if (req == null) return Results.NotFound();
                try
                {
                    req.Reject(approverId, dto.Reason);
                    await db.SaveChangesAsync();
                    return Results.Ok(new { message = "Đã từ chối OT.", req.Status });
                }
                catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
                    { return Results.BadRequest(new { error = ex.Message }); }
            }).RequireAuthorization(p => p.RequireRole("Admin", "Manager"));

        group.MapPost("/{id:guid}/record-actual",
            async (Guid id, RecordActualHoursDto dto, HRDbContext db) =>
            {
                var req = await db.OvertimeRequests.FindAsync(id);
                if (req == null) return Results.NotFound();
                try
                {
                    req.RecordActualHours(dto.ActualHours);
                    await db.SaveChangesAsync();
                    return Results.Ok(new { message = "Đã ghi giờ thực tế.", req.ActualHours, req.Status });
                }
                catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
                    { return Results.BadRequest(new { error = ex.Message }); }
            });
    }
}

public record CreateOvertimeRequestDto(DateTime Date, TimeOnly StartTime, TimeOnly EndTime, string Reason);
public record RejectOvertimeDto(string Reason);
public record RecordActualHoursDto(decimal ActualHours);
