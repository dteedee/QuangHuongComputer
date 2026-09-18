using Accounting.Domain;
using Accounting.DTOs;
using Accounting.Infrastructure;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Accounting.Endpoints;

/// <summary>
/// GIÁM SÁT ca thu ngân — đọc sổ ca và duyệt chênh lệch quỹ.
///
/// Tách khỏi <see cref="ShiftEndpoints"/> vì quyền khác hẳn: nhóm thao tác của thu ngân chạy
/// dưới <c>Permissions.Sales.Pos</c>, mà vai trò <c>Accountant</c> KHÔNG có quyền đó (ma trận
/// vai trò: chỉ Sale và Manager có). Để chung một nhóm thì kế toán bị 403 trên chính sổ ca thu
/// ngân, và chỉ Manager — vai trò duy nhất có ĐỒNG THỜI <c>Sales.Pos</c> và
/// <c>Accounting.ManageDebt</c> — duyệt được chênh lệch, tức nguyên tắc bốn mắt treo vào đúng
/// một vai trò. (W2-14, phát hiện khi kiểm chứng đối kháng.)
/// </summary>
public static class ShiftOversightEndpoints
{
    public static void MapShiftOversightEndpoints(this IEndpointRouteBuilder app)
    {
        var oversight = app.MapGroup("/api/accounting/shifts")
            .RequireModulePermissions(PermissionModules.Accounting);

        oversight.MapPost("/{id:guid}/approve-variance", async (
            Guid id,
            ApproveShiftVarianceRequest request,
            AccountingDbContext db,
            ClaimsPrincipal user,
            IBusinessClock clock,
            CancellationToken ct) =>
        {
            var shift = await db.ShiftSessions.FirstOrDefaultAsync(s => s.Id == id, ct)
                ?? throw NotFoundException.For("ca thu ngân", id);

            // Nguyên tắc bốn mắt: người duyệt chênh lệch quỹ phải khác thu ngân.
            shift.ApproveVariance(user.RequireUserId(), clock.UtcNow.UtcDateTime);
            await db.SaveChangesAsync(ct);

            return Results.Ok(ShiftEndpoints.ToDto(shift));
        }).WithName("ApproveShiftVariance")
          .RequireAuthorization(Permissions.Accounting.ManageDebt);

        oversight.MapGet("", async (
            [AsParameters] PagedRequest paging,
            AccountingDbContext db,
            ShiftStatus? status,
            Guid? cashierId,
            Guid? warehouseId,
            CancellationToken ct) =>
        {
            var query = db.ShiftSessions.AsQueryable();
            if (status.HasValue) query = query.Where(s => s.Status == status.Value);
            if (cashierId.HasValue) query = query.Where(s => s.CashierId == cashierId.Value);
            if (warehouseId.HasValue) query = query.Where(s => s.WarehouseId == warehouseId.Value);

            var sortable = new Dictionary<string, System.Linq.Expressions.Expression<Func<ShiftSession, object?>>>
            {
                ["openedAt"] = s => s.OpenedAt,
                ["closedAt"] = s => s.ClosedAt,
                ["variance"] = s => s.Variance
            };

            return Results.Ok(await query
                .ApplySort(paging, sortable, s => s.OpenedAt)
                .Select(s => new ShiftSessionListDto(
                    s.Id, s.CashierId, s.WarehouseId, s.OpenedAt, s.ClosedAt,
                    s.OpeningBalance, s.ClosingBalance, s.ExpectedCash, s.Variance, s.Status))
                .ToPagedResultAsync(paging, ct));
        }).WithName("GetShifts");

        oversight.MapGet("/{id:guid}", async (Guid id, AccountingDbContext db, CancellationToken ct) =>
        {
            var shift = await db.ShiftSessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct)
                ?? throw NotFoundException.For("ca thu ngân", id);

            return Results.Ok(ShiftEndpoints.ToDto(shift));
        }).WithName("GetShiftDetail");
    }
}
