using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Application.Commission;
using HR.Infrastructure;
using HR.Domain;
using HR.Application.Payroll;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;
using System.Security.Claims;
using BuildingBlocks.Endpoints;

namespace HR;

public static class PayrollEndpoints
{
    public static void MapPayrollEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/payroll").RequireModulePermissions(PermissionModules.Payroll);

        // ==================== PAYROLL RUNS ====================

        // POST /api/hr/payroll/runs — tạo kỳ lương mới
        group.MapPost("/runs", async (CreatePayrollRunDto dto, PayrollRunService svc, HRDbContext db, ClaimsPrincipal user) =>
        {
            try
            {
                var run = await svc.CreateRunAsync(dto.Year, dto.Month);
                // W2-7: ghi người tạo ngay sau khi PayrollRunService (W2-25's file, không sửa được
                // ở đây) trả về — để Approve() chặn được tự duyệt (segregation of duties).
                var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!string.IsNullOrEmpty(uid) && Guid.TryParse(uid, out var creatorId))
                {
                    run.SetCreatedBy(creatorId);
                    await db.SaveChangesAsync();
                }
                return Results.Created($"/api/hr/payroll/runs/{run.Id}", new { run.Id, run.Year, run.Month, run.Name, status = run.Status.ToString() });
            }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ClientSafeError.Message(ex) }); }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        });

        // POST /api/hr/payroll/runs/{id}/calculate — tính hàng loạt
        group.MapPost("/runs/{id:guid}/calculate", async (Guid id, PayrollRunService svc) =>
        {
            try
            {
                var summary = await svc.CalculateAllAsync(id);
                return Results.Ok(summary);
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
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
            // W0-8: Payrolls giờ đã map đúng (không còn Ignore) — Include tải sẵn danh sách con,
            // run.Approve() tự duyệt hết payroll con đang Calculated, không cần load tay riêng.
            var run = await db.PayrollRuns.Include(r => r.Payrolls).FirstOrDefaultAsync(r => r.Id == id);
            if (run == null) return Results.NotFound();
            // Hoa hồng đã bị huỷ sau khi tính lương -> số trên phiếu lương sai, bắt tính lại trước.
            var staleCommissions = await CommissionPayrollLinker.CountStaleLinksAsync(
                db, run.Payrolls.Select(p => p.Id).ToList());
            if (staleCommissions > 0)
                return Results.BadRequest(new { error = $"Có {staleCommissions} khoản hoa hồng đã bị huỷ sau khi tính lương. Tính lại kỳ lương trước khi duyệt." });
            try
            {
                run.Approve(approverId);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã duyệt kỳ lương.", status = run.Status.ToString() });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
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
                // Cùng transaction: hoa hồng đã gắn vào các bảng lương vừa trả -> Paid.
                await CommissionPayrollLinker.MarkPaidAsync(db,
                    payrolls.Where(p => p.Status == PayrollStatus.Paid).Select(p => p.Id).ToList(), DateTime.UtcNow);
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
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        });

        // POST /api/hr/payroll/runs/{id}/cancel — huỷ kỳ lương (chỉ khi Draft/Calculated)
        group.MapPost("/runs/{id:guid}/cancel", async (Guid id, CancelPayrollRunDto dto, HRDbContext db) =>
        {
            var run = await db.PayrollRuns.FirstOrDefaultAsync(r => r.Id == id);
            if (run == null) return Results.NotFound();
            try
            {
                run.Cancel(dto.Reason ?? "Không rõ lý do.");
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã huỷ kỳ lương.", status = run.Status.ToString() });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        });

        // GET /api/hr/payroll/mine?year= — self-service, chỉ bảng lương của chính nhân viên gọi.
        // (W2-7 khoản 7/8: FE api/hr.ts payrollSelfServiceApi.mine() gọi route này, BE trước đây
        // chưa có — chỉ có /self-service/payslips dạng khác.)
        group.MapGet("/mine", async (int? year, HRDbContext db, ClaimsPrincipal user) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid)) return Results.Unauthorized();
            var employee = await db.Employees.FirstOrDefaultAsync(e => e.UserId == uid);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên." });

            var q = db.Payrolls.Where(p => p.EmployeeId == employee.Id);
            if (year.HasValue) q = q.Where(p => p.Year == year.Value);
            var items = await q.OrderByDescending(p => p.Year).ThenByDescending(p => p.Month).ToListAsync();
            return Results.Ok(items);
        }).RequireAuthorization(SecurityPolicies.Staff);

        // ==================== PAYROLL DETAIL ====================

        // POST /api/hr/payroll/{payrollId}/recalculate — tính lại 1 bảng lương (chưa Approved).
        // Dùng lại nguyên vẹn PayrollCalculationService.CalculateAsync (W2-25 sở hữu file này,
        // không sửa logic) — hàm đó "load draft hoặc tạo mới" theo (EmployeeId,Year,Month) nên
        // gọi lại là idempotent, không tạo bản ghi trùng (unique index đã có từ W1-11).
        group.MapPost("/{payrollId:guid}/recalculate", async (Guid payrollId, HRDbContext db, PayrollCalculationService calc) =>
        {
            var payroll = await db.Payrolls.FindAsync(payrollId);
            if (payroll == null) return Results.NotFound();
            if (payroll.Status != PayrollStatus.Draft && payroll.Status != PayrollStatus.Calculated)
                return Results.BadRequest(new { error = $"Không thể tính lại bảng lương ở trạng thái {payroll.Status}." });

            try
            {
                var recalculated = await calc.CalculateAsync(
                    payroll.EmployeeId, payroll.Year, payroll.Month, payroll.PayrollRunId);
                await db.SaveChangesAsync();
                return Results.Ok(new
                {
                    recalculated.Id, recalculated.EmployeeId, recalculated.Month, recalculated.Year,
                    recalculated.BaseSalary, recalculated.GrossPay, recalculated.NetPay,
                    recalculated.TaxDeduction, recalculated.InsuranceDeduction,
                    Status = recalculated.Status.ToString()
                });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        });

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
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ClientSafeError.Message(ex) }); }
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
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        }).RequireAuthorization(Permissions.HR.ViewPayroll);
    }
}

public record CreatePayrollRunDto(int Year, int Month);
public record CancelPayrollRunDto(string? Reason);
