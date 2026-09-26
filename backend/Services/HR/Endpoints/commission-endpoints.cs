using System.Security.Claims;
using BuildingBlocks.Endpoints;
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
/// Sổ hoa hồng kỹ thuật cho HR/kế toán. Quyền theo nhóm Payroll: GET -> HR.ViewPayroll,
/// POST -> HR.ManagePayroll (hoa hồng là một khoản của bảng lương).
/// </summary>
public static class CommissionEndpoints
{
    public static void MapCommissionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/commissions").RequireModulePermissions(PermissionModules.Payroll);

        // GET /api/hr/commissions?period=2026-09&employeeId=&status=
        group.MapGet("/", async (string period, Guid? employeeId, CommissionStatus? status, HRDbContext db) =>
        {
            if (!CommissionPeriod.IsValid(period))
                return Results.BadRequest(new { error = "Kỳ phải có dạng yyyy-MM." });

            var query = db.CommissionEntries.AsNoTracking().Where(e => e.Period == period);
            if (employeeId.HasValue) query = query.Where(e => e.EmployeeId == employeeId.Value);
            var entries = await query.OrderByDescending(e => e.EarnedAt).ToListAsync();

            var employeeIds = entries.Select(e => e.EmployeeId).Distinct().ToList();
            var names = await db.Employees.AsNoTracking().Where(e => employeeIds.Contains(e.Id))
                .ToDictionaryAsync(e => e.Id, e => e.FullName);

            var byEmployee = entries.GroupBy(e => e.EmployeeId).Select(g => new
            {
                EmployeeId = g.Key,
                EmployeeName = names.GetValueOrDefault(g.Key, "?"),
                Pending = SumOf(g, CommissionStatus.Pending),
                Approved = SumOf(g, CommissionStatus.Approved),
                Paid = SumOf(g, CommissionStatus.Paid),
                Reversed = SumOf(g, CommissionStatus.Reversed),
                Count = g.Count(),
            }).OrderBy(x => x.EmployeeName).ToList();

            var visible = status.HasValue ? entries.Where(e => e.Status == status.Value).ToList() : entries;
            return Results.Ok(new
            {
                Period = period,
                Totals = new
                {
                    Pending = SumOf(entries, CommissionStatus.Pending),
                    Approved = SumOf(entries, CommissionStatus.Approved),
                    Paid = SumOf(entries, CommissionStatus.Paid),
                    Reversed = SumOf(entries, CommissionStatus.Reversed),
                    Count = entries.Count,
                },
                ByEmployee = byEmployee,
                Items = visible.Select(e => ToDto(e, names.GetValueOrDefault(e.EmployeeId, "?"))),
            });
        });

        // POST /api/hr/commissions/sync — đối soát lại cả kỳ với Repair (lưới an toàn khi sự kiện mất).
        group.MapPost("/sync", async (SyncCommissionDto dto, CommissionAccrualService accrual, CancellationToken ct) =>
        {
            if (!CommissionPeriod.IsValid(dto.Period))
                return Results.BadRequest(new { error = "Kỳ phải có dạng yyyy-MM." });
            return Results.Ok(await accrual.SyncPeriodAsync(dto.Period, ct));
        });

        // POST /api/hr/commissions/approve — duyệt hàng loạt các khoản đang chờ.
        group.MapPost("/approve", async (ApproveCommissionsDto dto, HRDbContext db, ClaimsPrincipal user) =>
        {
            if (dto.Ids is not { Count: > 0 }) return Results.BadRequest(new { error = "Chưa chọn khoản nào." });
            var entries = await db.CommissionEntries.Where(e => dto.Ids.Contains(e.Id)).ToListAsync();
            var now = DateTime.UtcNow;
            var approver = user.FindFirstValue(ClaimTypes.Name) ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
            var approved = 0;
            foreach (var entry in entries.Where(e => e.Status == CommissionStatus.Pending))
            {
                entry.Approve(approver, now);
                approved++;
            }
            await db.SaveChangesAsync();
            return Results.Ok(new { approved, skipped = dto.Ids.Count - approved });
        });

        // POST /api/hr/commissions/{id}/reverse — huỷ tay một khoản chưa khoá trong bảng lương.
        group.MapPost("/{id:guid}/reverse", async (Guid id, ReverseCommissionDto dto, HRDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Reason)) return Results.BadRequest(new { error = "Lý do huỷ là bắt buộc." });
            var entry = await db.CommissionEntries.FirstOrDefaultAsync(e => e.Id == id);
            if (entry is null) return Results.NotFound();
            if (await CommissionPayrollLinker.IsLockedInPayrollAsync(db, entry))
                return Results.BadRequest(new { error = "Khoản này đã nằm trong bảng lương đã duyệt/đã trả, không huỷ được." });
            try
            {
                entry.Reverse(dto.Reason, DateTime.UtcNow);
                await db.SaveChangesAsync();
                // Còn gắn bảng lương nháp -> nhắc tính lại (duyệt kỳ lương sẽ bị chặn tới khi tính lại).
                return Results.Ok(new { status = entry.Status.ToString(), payrollNeedsRecalculation = entry.PayrollId.HasValue });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        });
    }

    internal static decimal SumOf(IEnumerable<CommissionEntry> entries, CommissionStatus status)
        => entries.Where(e => e.Status == status).Sum(e => e.Amount);

    internal static object ToDto(CommissionEntry e, string employeeName) => new
    {
        e.Id, e.EmployeeId, EmployeeName = employeeName, e.SourceType, e.SourceId, e.SourceReference,
        e.BaseAmount, e.RatePercent, e.FixedAmount, e.Amount, e.Period, e.EarnedAt,
        Status = e.Status.ToString(), e.ApprovedAt, e.ApprovedBy, e.ReversedAt, e.ReversalReason,
        e.PayrollId, e.PaidAt,
    };
}

public record SyncCommissionDto(string Period);
public record ApproveCommissionsDto(List<Guid> Ids);
public record ReverseCommissionDto(string Reason);
