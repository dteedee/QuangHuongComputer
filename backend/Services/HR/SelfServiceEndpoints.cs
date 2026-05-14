using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;
using System.Security.Claims;

namespace HR;

public static class SelfServiceEndpoints
{
    public static void MapSelfServiceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/self-service").RequireAuthorization();

        // GET /api/hr/self-service/profile
        group.MapGet("/profile", async (ClaimsPrincipal user, HRDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên" });

            return Results.Ok(new
            {
                employee.Id, employee.FullName, employee.Email, employee.Phone,
                employee.Department, employee.Position, employee.HireDate,
                employee.Address, employee.EmergencyContact, employee.EmergencyPhone,
                employee.AvatarUrl, employee.DateOfBirth, employee.Gender,
                employee.EmployeeCode, Status = employee.Status.ToString()
            });
        });

        // PUT /api/hr/self-service/profile
        group.MapPut("/profile", async (SelfServiceProfileUpdateDto dto, ClaimsPrincipal user, HRDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên" });

            // Only allow self-editable fields: phone, address, emergency contact
            if (!string.IsNullOrWhiteSpace(dto.Phone) || !string.IsNullOrWhiteSpace(dto.Address))
            {
                employee.UpdateDetails(
                    employee.FullName, employee.Email,
                    dto.Phone ?? employee.Phone,
                    employee.Department, employee.Position,
                    employee.IdCardNumber,
                    dto.Address ?? employee.Address
                );
            }

            if (!string.IsNullOrWhiteSpace(dto.EmergencyContact) || !string.IsNullOrWhiteSpace(dto.EmergencyPhone))
            {
                employee.UpdateEmergencyContact(
                    dto.EmergencyContact ?? employee.EmergencyContact ?? string.Empty,
                    dto.EmergencyPhone ?? employee.EmergencyPhone ?? string.Empty
                );
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Cập nhật thông tin thành công" });
        });

        // GET /api/hr/self-service/leave-balance
        group.MapGet("/leave-balance", async (ClaimsPrincipal user, HRDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên" });

            var year = DateTime.UtcNow.Year;
            var approved = await db.LeaveRequests
                .Where(l => l.EmployeeId == employee.Id && l.Status == RequestStatus.Approved && l.StartDate.Year == year)
                .ToListAsync();

            return Results.Ok(new
            {
                Year = year,
                AnnualLeaveUsed = approved.Where(l => l.Type == LeaveType.Annual).Sum(l => l.Days),
                SickLeaveUsed = approved.Where(l => l.Type == LeaveType.Sick).Sum(l => l.Days),
                AnnualLeaveTotal = 12m,
                SickLeaveTotal = 30m,
                PendingRequests = await db.LeaveRequests.CountAsync(l => l.EmployeeId == employee.Id && l.Status == RequestStatus.Pending)
            });
        });

        // GET /api/hr/self-service/payslips
        group.MapGet("/payslips", async (ClaimsPrincipal user, HRDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên" });

            var payslips = await db.Payrolls
                .Where(p => p.EmployeeId == employee.Id)
                .OrderByDescending(p => p.Year).ThenByDescending(p => p.Month)
                .Select(p => new
                {
                    p.Id, p.Month, p.Year, p.BaseSalary,
                    p.Bonuses, p.Deductions, p.NetPay,
                    Status = p.Status.ToString(), p.PaidAt
                })
                .ToListAsync();

            return Results.Ok(payslips);
        });

        // GET /api/hr/self-service/holidays?year=2026
        group.MapGet("/holidays", (int? year) =>
        {
            var y = year ?? DateTime.UtcNow.Year;
            var holidays = VNHolidayCalendar.GetHolidaysForYear(y)
                .Select(h => new { date = h.Date, name = h.Name });
            return Results.Ok(holidays);
        });
    }
}

public record SelfServiceProfileUpdateDto(
    string? Phone,
    string? Address,
    string? EmergencyContact,
    string? EmergencyPhone
);
