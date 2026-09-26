using System.Security.Claims;
using BuildingBlocks.Security;
using HR.Application.Commission;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace HR;

/// <summary>
/// Mức hoa hồng riêng theo nhân viên (lịch sử hiệu lực, chỉ thêm — không sửa dòng cũ) và
/// trang "hoa hồng của tôi" cho nhân viên tự xem.
/// </summary>
public static class CommissionPolicyEndpoints
{
    public static void MapCommissionPolicyEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/employees/{employeeId:guid}/commission-policies")
            .RequireModulePermissions(PermissionModules.Payroll);

        // GET — lịch sử mức riêng + mức mặc định (SystemConfig) + mức đang áp dụng hôm nay.
        group.MapGet("/", async (Guid employeeId, HRDbContext db, CommissionDefaults defaults) =>
        {
            if (!await db.Employees.AnyAsync(e => e.Id == employeeId)) return Results.NotFound();
            var history = await db.CommissionPolicies.AsNoTracking()
                .Where(p => p.EmployeeId == employeeId)
                .OrderByDescending(p => p.EffectiveFrom).ThenByDescending(p => p.CreatedAt)
                .ToListAsync();
            var fallback = defaults.Current();
            var today = CommissionCalculator.VietnamDate(DateTime.UtcNow);
            return Results.Ok(new
            {
                Default = new { fallback.LaborPercent, fallback.FixedAmountPerJob },
                Current = CommissionCalculator.ResolveRate(history, today, fallback),
                History = history.Select(p => new { p.Id, p.LaborPercent, p.FixedAmountPerJob, p.EffectiveFrom, p.Note, p.CreatedAt, p.CreatedBy }),
            });
        });

        // POST — thêm mốc mức mới. Mốc cũ giữ nguyên để phiếu cũ vẫn tính đúng mức cũ.
        group.MapPost("/", async (Guid employeeId, CreateCommissionPolicyDto dto, HRDbContext db) =>
        {
            if (!await db.Employees.AnyAsync(e => e.Id == employeeId)) return Results.NotFound();
            try
            {
                var policy = new CommissionPolicy(employeeId, dto.LaborPercent, dto.FixedAmountPerJob, dto.EffectiveFrom, dto.Note);
                db.CommissionPolicies.Add(policy);
                await db.SaveChangesAsync();
                return Results.Created($"/api/hr/employees/{employeeId}/commission-policies/{policy.Id}",
                    new { policy.Id, policy.LaborPercent, policy.FixedAmountPerJob, policy.EffectiveFrom, policy.Note });
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        // GET /api/hr/commissions/mine?year= — nhân viên xem hoa hồng của CHÍNH mình (lọc theo tài khoản gọi).
        app.MapGet("/api/hr/commissions/mine", async (int? year, HRDbContext db, ClaimsPrincipal user) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid)) return Results.Unauthorized();
            var employee = await db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.UserId == uid);
            if (employee is null) return Results.NotFound(new { error = "Không tìm thấy nhân viên." });

            var prefix = $"{year ?? DateTime.UtcNow.Year:D4}-";
            var entries = await db.CommissionEntries.AsNoTracking()
                .Where(e => e.EmployeeId == employee.Id && e.Period.StartsWith(prefix))
                .OrderByDescending(e => e.EarnedAt)
                .ToListAsync();
            return Results.Ok(new
            {
                Year = year ?? DateTime.UtcNow.Year,
                Totals = new
                {
                    Pending = CommissionEndpoints.SumOf(entries, CommissionStatus.Pending),
                    Approved = CommissionEndpoints.SumOf(entries, CommissionStatus.Approved),
                    Paid = CommissionEndpoints.SumOf(entries, CommissionStatus.Paid),
                },
                Items = entries.Select(e => CommissionEndpoints.ToDto(e, employee.FullName)),
            });
        }).RequireAuthorization(SecurityPolicies.Staff);
    }
}

public record CreateCommissionPolicyDto(decimal LaborPercent, decimal FixedAmountPerJob, DateOnly EffectiveFrom, string? Note);
