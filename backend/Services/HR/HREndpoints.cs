
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;
using HR.Endpoints;
using HR.Endpoints.Statutory;
using System.Security.Claims;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace HR;

public static class HREndpoints
{
    public static void MapHREndpoints(this IEndpointRouteBuilder app)
    {
        // W2-7: Employee CRUD + link-user + terminate tách ra Endpoints/EmployeeEndpoints.cs
        // (file này đã 657 dòng, vượt giới hạn 200 dòng). Gọi từ đây thay vì thêm dòng vào
        // Program.cs — Program.cs frozen (BE/ApiGateway/** đóng băng cả wave 2).
        app.MapEmployeeEndpoints();

        // W2-25 / D06: tham số lương-thuế-bảo hiểm hiệu lực theo ngày, ngày nghỉ lễ, bảng kê OT.
        // Gọi từ đây vì Program.cs (BE/ApiGateway/**) đóng băng cả wave 2.
        app.MapStatutoryParameterEndpoints();
        app.MapPublicHolidayEndpoints();
        app.MapOvertimeScheduleEndpoints();

        var group = app.MapGroup("/api/hr").RequireModulePermissions(PermissionModules.HR);

        // ==================== PUBLIC RECRUITMENT ====================
        app.MapGet("/api/recruitment", async (HRDbContext db) =>
        {
            return await db.JobListings
                .Where(j => j.Status == JobStatus.Active && j.ExpiryDate > DateTime.UtcNow)
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();
            // W1-10: tin tuyển dụng đang mở — trang tuyển dụng công khai (IR W1: allow-list).
        }).AllowAnonymous();

        app.MapGet("/api/recruitment/{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var job = await db.JobListings.FindAsync(id);
            return job != null ? Results.Ok(job) : Results.NotFound();
            // W1-10: chi tiết tin tuyển dụng công khai (IR W1: allow-list).
        }).AllowAnonymous();

        // ==================== EMPLOYEE MANAGEMENT ====================
        // Moved to Endpoints/EmployeeEndpoints.cs (mapped above) — kept file under 200 LOC.

        // ==================== LEGACY TIMESHEET (DEMOLISHED — W2-7 khoản 5) ====================
        // Timesheet (CRUD tự do, không so giờ VN) là 1 trong 3 mô hình chấm công trùng lặp mà
        // spec yêu cầu gộp về AttendanceRecord + MonthlyTimesheet. Giữ route trả 410 thay vì im
        // lặng biến mất (Risk Assessment: "keep the old route returning 410 with a clear
        // message, not a 500") — FE cũ gọi vào đây sẽ thấy lỗi rõ ràng thay vì 500.
        var timesheetGone = Results.Json(new
        {
            error = "Đã gỡ bỏ chấm công kiểu Timesheet tự do. Dùng /api/hr/attendance/check-in|check-out " +
                     "và /api/hr/timesheet cho bảng công theo tháng."
        }, statusCode: StatusCodes.Status410Gone);
        group.MapPost("/timesheets", () => timesheetGone);
        group.MapGet("/timesheets", () => timesheetGone);
        group.MapGet("/timesheets/{id:guid}", (Guid id) => timesheetGone);
        group.MapPut("/timesheets/{id:guid}", (Guid id) => timesheetGone);
        group.MapPost("/timesheets/{id:guid}/approve", (Guid id) => timesheetGone);
        group.MapPost("/timesheets/{id:guid}/reject", (Guid id) => timesheetGone);
        group.MapGet("/employees/{id:guid}/timesheets", (Guid id) => timesheetGone);

        // ==================== LEGACY PAYROLL (DEMOLISHED — W2-7 khoản 3) ====================
        // Đường lương cũ gọi thẳng Payroll.Calculate()/Approve()/Process() KHÔNG qua
        // PayrollCalculationService => bỏ qua toàn bộ VietnameseTaxEngine (không PIT, không BH,
        // Bonuses/Deductions phải set tay). Đường DUY NHẤT bây giờ là PayrollRun qua
        // /api/hr/payroll/runs/* (PayrollEndpoints.cs) — Draft → Calculated → Approved → Paid.
        var payrollGone = Results.Json(new
        {
            error = "Đường tính lương cũ đã gỡ bỏ. Dùng POST /api/hr/payroll/runs để tạo kỳ lương, " +
                     "rồi /runs/{id}/calculate → /approve → /mark-paid."
        }, statusCode: StatusCodes.Status410Gone);
        group.MapGet("/payroll", () => payrollGone);
        group.MapPost("/payroll/generate", () => payrollGone);
        group.MapPut("/payroll/{id:guid}/pay", (Guid id) => payrollGone);
        group.MapPost("/payroll/{id:guid}/calculate", (Guid id) => payrollGone);
        group.MapPost("/payroll/{id:guid}/approve", (Guid id) => payrollGone);
        group.MapPost("/payroll/{id:guid}/process", (Guid id) => payrollGone);
        group.MapPost("/payroll/{id:guid}/bonus", (Guid id) => payrollGone);
        group.MapPost("/payroll/{id:guid}/deduction", (Guid id) => payrollGone);
        group.MapPut("/payroll/{id:guid}/notes", (Guid id) => payrollGone);

        // ==================== RECRUITMENT MANAGEMENT (ADMIN) ====================
        group.MapGet("/recruitment", async (HRDbContext db) =>
        {
            return await db.JobListings.OrderByDescending(j => j.CreatedAt).ToListAsync();
        });

        group.MapPost("/recruitment", async (CreateJobListingDto dto, HRDbContext db) =>
        {
            var job = new JobListing(
                dto.Title,
                dto.Description,
                dto.Requirements,
                dto.Benefits,
                dto.Department,
                dto.Location,
                dto.JobType,
                dto.ExpiryDate,
                dto.SalaryRangeMin,
                dto.SalaryRangeMax
            );

            db.JobListings.Add(job);
            await db.SaveChangesAsync();
            return Results.Created($"/api/recruitment/{job.Id}", job);
        });

        group.MapPut("/recruitment/{id:guid}", async (Guid id, UpdateJobListingDto dto, HRDbContext db) =>
        {
            var job = await db.JobListings.FindAsync(id);
            if (job == null) return Results.NotFound();

            job.Update(
                dto.Title,
                dto.Description,
                dto.Requirements,
                dto.Benefits,
                dto.Department,
                dto.Location,
                dto.JobType,
                dto.ExpiryDate,
                dto.SalaryRangeMin,
                dto.SalaryRangeMax,
                dto.Status
            );

            await db.SaveChangesAsync();
            return Results.Ok(job);
        });

        group.MapDelete("/recruitment/{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var job = await db.JobListings.FindAsync(id);
            if (job == null) return Results.NotFound();

            db.JobListings.Remove(job);
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Job listing deleted" });
        });
    }
}

// ==================== DTOs ====================
// W2-7: DTO của Employee/Timesheet/Payroll cũ đã xoá cùng các route dùng chúng (xem 410 stubs
// ở trên) — Employee DTOs nay ở Endpoints/EmployeeEndpoints.cs.

public record CreateJobListingDto(
    string Title,
    string Description,
    string Requirements,
    string Benefits,
    string Department,
    string Location,
    string JobType,
    DateTime ExpiryDate,
    decimal? SalaryRangeMin,
    decimal? SalaryRangeMax
);

public record UpdateJobListingDto(
    string Title,
    string Description,
    string Requirements,
    string Benefits,
    string Department,
    string Location,
    string JobType,
    DateTime ExpiryDate,
    decimal? SalaryRangeMin,
    decimal? SalaryRangeMax,
    JobStatus Status
);
