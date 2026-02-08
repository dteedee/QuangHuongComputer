
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;
using System.Security.Claims;

namespace HR;

public static class HREndpoints
{
    public static void MapHREndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "Accountant"));

        // ==================== EMPLOYEE MANAGEMENT ====================

        group.MapGet("/employees", async (HRDbContext db) =>
        {
            return await db.Employees.ToListAsync();
        });

        group.MapGet("/employees/{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            return employee != null ? Results.Ok(employee) : Results.NotFound();
        });

        group.MapPost("/employees", async (CreateEmployeeDto dto, HRDbContext db) =>
        {
            var employee = new Employee(
                dto.FullName,
                dto.Email,
                dto.Phone,
                dto.Department,
                dto.Position,
                dto.HireDate ?? DateTime.UtcNow,
                dto.BaseSalary,
                dto.IdCardNumber,
                dto.Address
            );

            db.Employees.Add(employee);
            await db.SaveChangesAsync();
            return Results.Created($"/api/hr/employees/{employee.Id}", employee);
        });

        group.MapPut("/employees/{id:guid}", async (Guid id, UpdateEmployeeDto dto, HRDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            if (employee == null) return Results.NotFound();

            employee.UpdateDetails(
                dto.FullName,
                dto.Email,
                dto.Phone,
                dto.Department,
                dto.Position,
                dto.IdCardNumber,
                dto.Address
            );

            if (dto.BaseSalary.HasValue)
            {
                employee.UpdateSalary(dto.BaseSalary.Value);
            }

            if (dto.IsActive.HasValue)
            {
                if (dto.IsActive.Value) employee.Activate();
                else employee.Deactivate();
            }

            await db.SaveChangesAsync();
            return Results.Ok(employee);
        });

        group.MapDelete("/employees/{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            if (employee == null) return Results.NotFound();

            employee.Deactivate();
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Employee deactivated" });
        });

        // ==================== TIMESHEET MANAGEMENT ====================

        // Create Timesheet
        group.MapPost("/timesheets", async (CreateTimesheetDto dto, HRDbContext db) =>
        {
            var ts = new Timesheet(
                dto.EmployeeId,
                dto.Date,
                dto.CheckIn,
                dto.CheckOut,
                dto.Notes
            );

            db.Timesheets.Add(ts);
            await db.SaveChangesAsync();
            return Results.Ok(ts);
        });

        // Get All Timesheets (with pagination and filters)
        group.MapGet("/timesheets", async (HRDbContext db, int page = 1, int pageSize = 20, Guid? employeeId = null, int? month = null, int? year = null, string? status = null) =>
        {
            var query = db.Timesheets.AsQueryable();

            if (employeeId.HasValue)
                query = query.Where(t => t.EmployeeId == employeeId.Value);

            if (month.HasValue && year.HasValue)
                query = query.Where(t => t.Date.Month == month.Value && t.Date.Year == year.Value);
            else if (year.HasValue)
                query = query.Where(t => t.Date.Year == year.Value);

            var total = await query.CountAsync();
            var timesheets = await query
                .OrderByDescending(t => t.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    t.Id,
                    t.EmployeeId,
                    t.Date,
                    t.CheckIn,
                    t.CheckOut,
                    t.TotalHours,
                    t.Status,
                    t.Notes,
                    t.ApprovedBy,
                    t.ApprovedAt,
                    t.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(new
            {
                Total = total,
                Page = page,
                PageSize = pageSize,
                Timesheets = timesheets
            });
        });

        // Get Timesheet by ID
        group.MapGet("/timesheets/{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var timesheet = await db.Timesheets.FindAsync(id);
            if (timesheet == null)
                return Results.NotFound(new { Error = "Timesheet not found" });

            return Results.Ok(new
            {
                timesheet.Id,
                timesheet.EmployeeId,
                timesheet.Date,
                timesheet.CheckIn,
                timesheet.CheckOut,
                timesheet.TotalHours,
                timesheet.Status,
                timesheet.Notes,
                timesheet.ApprovedBy,
                timesheet.ApprovedAt,
                timesheet.RejectionReason,
                timesheet.CreatedAt,
                timesheet.UpdatedAt
            });
        });

        // Update Timesheet
        group.MapPut("/timesheets/{id:guid}", async (Guid id, UpdateTimesheetDto dto, HRDbContext db) =>
        {
            var timesheet = await db.Timesheets.FindAsync(id);
            if (timesheet == null)
                return Results.NotFound(new { Error = "Timesheet not found" });

            if (dto.CheckIn.HasValue)
                timesheet.UpdateCheckIn(dto.CheckIn.Value);

            if (dto.CheckOut.HasValue)
                timesheet.UpdateCheckOut(dto.CheckOut.Value);

            if (dto.Notes != null)
                timesheet.UpdateNotes(dto.Notes);

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                Message = "Timesheet updated",
                Timesheet = new
                {
                    timesheet.Id,
                    timesheet.Date,
                    timesheet.CheckIn,
                    timesheet.CheckOut,
                    timesheet.TotalHours,
                    timesheet.Status,
                    timesheet.Notes
                }
            });
        });

        // Approve Timesheet
        group.MapPost("/timesheets/{id:guid}/approve", async (Guid id, ApproveTimesheetDto dto, HRDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var timesheet = await db.Timesheets.FindAsync(id);
            if (timesheet == null)
                return Results.NotFound(new { Error = "Timesheet not found" });

            if (timesheet.Status != TimesheetStatus.Pending)
                return Results.BadRequest(new { Error = "Only pending timesheets can be approved" });

            timesheet.Approve(userId);
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                Message = "Timesheet approved",
                Status = timesheet.Status.ToString(),
                ApprovedAt = timesheet.ApprovedAt
            });
        });

        // Reject Timesheet
        group.MapPost("/timesheets/{id:guid}/reject", async (Guid id, RejectTimesheetDto dto, HRDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var timesheet = await db.Timesheets.FindAsync(id);
            if (timesheet == null)
                return Results.NotFound(new { Error = "Timesheet not found" });

            if (timesheet.Status != TimesheetStatus.Pending)
                return Results.BadRequest(new { Error = "Only pending timesheets can be rejected" });

            timesheet.Reject(userId, dto.Reason);
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                Message = "Timesheet rejected",
                Status = timesheet.Status.ToString(),
                RejectionReason = timesheet.RejectionReason
            });
        });

        // Get Employee's Timesheets
        group.MapGet("/employees/{id:guid}/timesheets", async (Guid id, int month, int year, HRDbContext db) =>
        {
            return await db.Timesheets
                .Where(t => t.EmployeeId == id && t.Date.Month == month && t.Date.Year == year)
                .OrderByDescending(t => t.Date)
                .ToListAsync();
        });

        // ==================== PAYROLL MANAGEMENT ====================

        group.MapGet("/payroll", async (int month, int year, HRDbContext db) =>
        {
            return await db.Payrolls.Where(p => p.Month == month && p.Year == year).ToListAsync();
        });

        group.MapPost("/payroll/generate", async (GeneratePayrollDto dto, HRDbContext db) =>
        {
            var employees = await db.Employees.Where(e => e.Status == EmployeeStatus.Active).ToListAsync();
            var existingPayrolls = await db.Payrolls.Where(p => p.Month == dto.Month && p.Year == dto.Year).ToListAsync();

            int count = 0;
            foreach (var emp in employees)
            {
                if (existingPayrolls.Any(p => p.EmployeeId == emp.Id)) continue;

                var payroll = new Payroll(
                    emp.Id,
                    dto.Month,
                    dto.Year,
                    emp.BaseSalary
                );

                db.Payrolls.Add(payroll);
                count++;
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { Message = $"Payroll for {dto.Month}/{dto.Year} generated for {count} employees" });
        });

        group.MapPut("/payroll/{id:guid}/pay", async (Guid id, HRDbContext db) =>
        {
            var payroll = await db.Payrolls.FindAsync(id);
            if (payroll == null) return Results.NotFound();

            // Typically process then mark as paid
            // Assuming simplified flow or already processed
            if (payroll.Status == PayrollStatus.Draft)
            {
                payroll.Calculate();
                payroll.Approve(Guid.NewGuid());
                payroll.Process(Guid.NewGuid());
            }

            payroll.MarkAsPaid();
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Payroll marked as paid" });
        });
    }
}

// ==================== DTOs ====================

public record CreateEmployeeDto(
    string FullName,
    string Email,
    string Phone,
    string Department,
    string Position,
    decimal BaseSalary,
    DateTime? HireDate,
    string? IdCardNumber,
    string? Address
);

public record UpdateEmployeeDto(
    string FullName,
    string Email,
    string Phone,
    string Department,
    string Position,
    decimal? BaseSalary,
    string? IdCardNumber,
    string? Address,
    bool? IsActive
);

public record CreateTimesheetDto(
    Guid EmployeeId,
    DateTime Date,
    TimeSpan CheckIn,
    TimeSpan? CheckOut,
    string? Notes
);

public record UpdateTimesheetDto(
    TimeSpan? CheckIn,
    TimeSpan? CheckOut,
    string? Notes
);

public record ApproveTimesheetDto(
    string? Notes
);

public record RejectTimesheetDto(
    string Reason
);

public record GeneratePayrollDto(
    int Month,
    int Year
);
