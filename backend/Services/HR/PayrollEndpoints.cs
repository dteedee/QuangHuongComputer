using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;
using HR.Application.Payroll;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;
using System.Security.Claims;

namespace HR;

public static class PayrollEndpoints
{
    public static void MapPayrollEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/payroll").RequireAuthorization(p => p.RequireRole("Admin", "Manager", "Accountant"));

        // ==================== PAYROLL RUNS ====================

        // POST /api/hr/payroll/runs — tạo kỳ lương mới
        group.MapPost("/runs", async (CreatePayrollRunDto dto, PayrollRunService svc) =>
        {
            try
            {
                var run = await svc.CreateRunAsync(dto.Year, dto.Month);
                return Results.Created($"/api/hr/payroll/runs/{run.Id}", new { run.Id, run.Year, run.Month, run.Name, status = run.Status.ToString() });
            }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        // POST /api/hr/payroll/runs/{id}/calculate — tính hàng loạt
        group.MapPost("/runs/{id:guid}/calculate", async (Guid id, PayrollRunService svc) =>
        {
            try
            {
                var summary = await svc.CalculateAllAsync(id);
                return Results.Ok(summary);
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        // GET /api/hr/payroll/runs/{id}
        group.MapGet("/runs/{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var run = await db.PayrollRuns.FirstOrDefaultAsync(r => r.Id == id);
            if (run == null) return Results.NotFound();
            var payrolls = await db.Payrolls
                .Where(p => p.PayrollRunId == id)
                .Select(p => new
                {
                    p.Id,
                    p.EmployeeId,
                    p.Month,
                    p.Year,
                    p.GrossPay,
                    p.NetPay,
                    p.TaxDeduction,
                    p.InsuranceDeduction,
                    Status = p.Status.ToString()
                })
                .ToListAsync();
            return Results.Ok(new
            {
                run.Id,
                run.Year,
                run.Month,
                run.Name,
                Status = run.Status.ToString(),
                run.EmployeeCount,
                run.TotalGrossPay,
                run.TotalNetPay,
                run.TotalTax,
                run.TotalInsurance,
                run.CalculatedAt,
                run.ApprovedAt,
                run.PaidAt,
                Payrolls = payrolls
            });
        });

        // GET /api/hr/payroll/runs
        group.MapGet("/runs", async (HRDbContext db) =>
            Results.Ok(await db.PayrollRuns
                .OrderByDescending(r => r.Year).ThenByDescending(r => r.Month)
                .Select(r => new { r.Id, r.Year, r.Month, r.Name, status = r.Status.ToString(), r.EmployeeCount, r.TotalNetPay })
                .ToListAsync()));

        // POST /api/hr/payroll/runs/{id}/approve
        group.MapPost("/runs/{id:guid}/approve", async (Guid id, HRDbContext db, ClaimsPrincipal user) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid) || !Guid.TryParse(uid, out var approverId))
                return Results.Unauthorized();
            var run = await db.PayrollRuns.Include(r => r.Payrolls).FirstOrDefaultAsync(r => r.Id == id);
            if (run == null) return Results.NotFound();
            // Load payrolls thủ công vì Ignore ở DbContext
            var payrolls = await db.Payrolls.Where(p => p.PayrollRunId == id).ToListAsync();
            foreach (var p in payrolls)
            {
                if (p.Status == PayrollStatus.Calculated) p.Approve(approverId);
            }
            try
            {
                run.Approve(approverId);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã duyệt kỳ lương.", status = run.Status.ToString() });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        // POST /api/hr/payroll/runs/{id}/mark-paid — chi trả
        group.MapPost("/runs/{id:guid}/mark-paid",
            async (Guid id, HRDbContext db, IPublishEndpoint publish, ClaimsPrincipal user) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid) || !Guid.TryParse(uid, out var payerId))
                return Results.Unauthorized();
            var run = await db.PayrollRuns.FirstOrDefaultAsync(r => r.Id == id);
            if (run == null) return Results.NotFound();
            var payrolls = await db.Payrolls
                .Include(p => p.Employee)
                .Where(p => p.PayrollRunId == id).ToListAsync();
            try
            {
                foreach (var p in payrolls)
                {
                    if (p.Status == PayrollStatus.Approved) p.Process(payerId);
                    if (p.Status == PayrollStatus.Processed) p.MarkAsPaid();
                }
                run.MarkAsPaid(payerId);
                await db.SaveChangesAsync();

                // Publish integration events → Accounting ghi sổ chi phí
                foreach (var p in payrolls)
                {
                    if (p.PaidAt.HasValue)
                    {
                        await publish.Publish(new PayrollPaidIntegrationEvent(
                            p.Id, p.EmployeeId, p.Employee?.FullName ?? "Unknown",
                            p.Month, p.Year, p.GrossPay, p.NetPay, p.PaidAt.Value));
                    }
                }
                return Results.Ok(new { message = "Đã chi trả kỳ lương.", status = run.Status.ToString(), count = payrolls.Count });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        // ==================== PAYROLL DETAIL ====================

        // GET /api/hr/payroll/{payrollId}
        group.MapGet("/{payrollId:guid}", async (Guid payrollId, HRDbContext db) =>
        {
            var p = await db.Payrolls
                .Include(x => x.Employee)
                .Include(x => x.LineItems)
                .FirstOrDefaultAsync(x => x.Id == payrollId);
            if (p == null) return Results.NotFound();
            return Results.Ok(new
            {
                p.Id, p.EmployeeId, EmployeeName = p.Employee?.FullName,
                p.Month, p.Year,
                p.BaseSalary, p.GrossPay, p.NetPay,
                p.TaxDeduction, p.InsuranceDeduction, p.OtherDeductions,
                p.TaxableIncome, p.NumberOfDependents, p.InsurableSalary,
                Status = p.Status.ToString(),
                LineItems = p.LineItems.OrderBy(l => l.DisplayOrder)
                    .Select(l => new { Type = l.Type.ToString(), l.Description, l.Amount, l.IsTaxable })
            });
        });

        // GET /api/hr/payroll/{payrollId}/payslip — phiếu lương JSON
        group.MapGet("/{payrollId:guid}/payslip", async (Guid payrollId, PayslipGenerator gen) =>
        {
            try
            {
                var payslip = await gen.GenerateAsync(payrollId);
                return Results.Ok(payslip);
            }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        // GET /api/hr/payroll/runs/{id}/bank-transfer-file — file CSV chuyển khoản
        // Yêu cầu xác thực lại: gửi kèm password/OTP trong header X-Reauth-Token (Phase 08 hoàn thiện)
        group.MapGet("/runs/{id:guid}/bank-transfer-file",
            async (Guid id, HttpContext ctx, BankTransferFileGenerator gen) =>
        {
            var reauth = ctx.Request.Headers["X-Reauth-Token"].ToString();
            if (string.IsNullOrEmpty(reauth))
                return Results.BadRequest(new { error = "Cần xác thực lại (header X-Reauth-Token)." });

            try
            {
                var csv = await gen.GenerateCsvAsync(id);
                var bytes = System.Text.Encoding.UTF8.GetPreamble()
                    .Concat(System.Text.Encoding.UTF8.GetBytes(csv)).ToArray();
                return Results.File(bytes, "text/csv", $"bank-transfer-{id}.csv");
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        }).RequireAuthorization(p => p.RequireRole("Admin", "Accountant"));
    }
}

public record CreatePayrollRunDto(int Year, int Month);
