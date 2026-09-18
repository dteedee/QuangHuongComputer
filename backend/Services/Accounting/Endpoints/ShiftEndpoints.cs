using System.Security.Claims;
using Accounting.Application.CashBook;
using Accounting.Domain;
using Accounting.DTOs;
using Accounting.Infrastructure;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Endpoints;

/// <summary>
/// Ca thu ngân.
///
/// Nhóm này KHÔNG nằm dưới quyền của module Kế toán mà dưới <c>Permissions.Sales.Pos</c>:
/// người mở và chốt ca là thu ngân (vai trò Sale), và vai trò Sale không có một quyền
/// <c>Permissions.Accounting.*</c> nào — nên trước đây mọi endpoint ca đều trả 403 cho đúng
/// người cần dùng nó (ma trận vai trò: RolePermissionMatrixData.cs, role Sale).
/// </summary>
public static class ShiftEndpoints
{
    public static void MapShiftEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/accounting/shifts")
            .RequireAuthorization(Permissions.Sales.Pos);

        group.MapPost("/open", async (
            OpenShiftRequest request,
            AccountingDbContext db,
            ClaimsPrincipal user,
            IBusinessClock clock,
            CancellationToken ct) =>
        {
            var cashierId = user.RequireUserId();

            // Một thu ngân chỉ có MỘT ca mở tại một thời điểm — không giới hạn theo ngày, vì ca
            // đêm bắc qua nửa đêm vẫn phải là ca đang mở.
            var existing = await db.ShiftSessions.AsNoTracking()
                .Where(s => s.CashierId == cashierId && s.Status == ShiftStatus.Open)
                .Select(s => new { s.Id, s.WarehouseId })
                .FirstOrDefaultAsync(ct);

            if (existing is not null)
                throw new ConflictException($"Bạn đang có một ca chưa chốt (mã ca: {existing.Id}).");

            var shift = ShiftSession.Open(cashierId, request.WarehouseId, request.OpeningBalance, clock.UtcNow.UtcDateTime);
            db.ShiftSessions.Add(shift);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message
                .Contains("IX_ShiftSessions_Cashier_Open_Unique", StringComparison.Ordinal) == true)
            {
                // Hai lần "Mở ca" đồng thời: lần thua trả 409 thay vì 500.
                throw new ConflictException("Bạn đang có một ca chưa chốt.");
            }

            return Results.Created($"/api/accounting/shifts/{shift.Id}", ToDto(shift));
        }).WithName("OpenShift").WithValidation<OpenShiftRequest>();

        group.MapGet("/current", async (
            AccountingDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var cashierId = user.RequireUserId();
            var shift = await db.ShiftSessions
                .FirstOrDefaultAsync(s => s.CashierId == cashierId && s.Status == ShiftStatus.Open, ct);

            return shift is null ? Results.NoContent() : Results.Ok(ToDto(shift));
        }).WithName("GetCurrentShift");

        group.MapPost("/{id:guid}/close", async (
            Guid id,
            CloseShiftRequest request,
            AccountingDbContext db,
            ClaimsPrincipal user,
            IBusinessClock clock,
            CashBookService cashBook,
            CancellationToken ct) =>
        {
            var shift = await db.ShiftSessions.FirstOrDefaultAsync(s => s.Id == id, ct)
                ?? throw NotFoundException.For("ca thu ngân", id);

            var cashierId = user.RequireUserId();
            if (shift.CashierId != cashierId)
                throw new ForbiddenException("Chỉ thu ngân của ca mới được chốt ca này.");

            var now = clock.UtcNow.UtcDateTime;
            shift.Close(request.ActualCash, now, request.VarianceReason);

            // Ca chốt xong thì tiền mặt thu ròng trong ca đi thẳng vào sổ quỹ — nếu không,
            // sổ quỹ và két tiền không bao giờ khớp nhau.
            var netCash = shift.CashIn - shift.CashOut;
            if (netCash != 0)
            {
                await cashBook.RecordAsync(
                    kind: netCash > 0 ? CashVoucherKind.Receipt : CashVoucherKind.Payment,
                    fundCode: CashBookService.FundCodeFor(shift.WarehouseId),
                    amount: Math.Abs(netCash),
                    description: $"Kết ca {shift.Id:N} ({shift.OpenedAt:dd/MM/yyyy HH:mm} - {now:HH:mm})",
                    source: CashVoucherSource.ShiftClose,
                    voucherDate: now,
                    shiftSessionId: shift.Id,
                    sourceKey: $"shift-close:{shift.Id}",
                    createdByUserId: cashierId,
                    ct: ct);
            }

            await db.SaveChangesAsync(ct);

            return Results.Ok(ToDto(shift));
        }).WithName("CloseShift").WithValidation<CloseShiftRequest>();

        group.MapPost("/{id:guid}/transactions", async (
            Guid id,
            RecordShiftTransactionRequest request,
            AccountingDbContext db,
            ClaimsPrincipal user,
            IBusinessClock clock,
            CancellationToken ct) =>
        {
            var shift = await db.ShiftSessions.FirstOrDefaultAsync(s => s.Id == id, ct)
                ?? throw NotFoundException.For("ca thu ngân", id);

            if (shift.CashierId != user.RequireUserId())
                throw new ForbiddenException("Chỉ thu ngân của ca mới ghi được giao dịch vào ca này.");

            shift.RecordTransaction(
                request.Description, request.Amount, request.Type,
                clock.UtcNow.UtcDateTime, ShiftTransactionSource.Manual, request.Reference);

            await db.SaveChangesAsync(ct);
            return Results.Ok(ToDto(shift));
        }).WithName("RecordShiftTransaction").WithValidation<RecordShiftTransactionRequest>();
    }

    internal static ShiftSessionDto ToDto(ShiftSession s) => new(
        s.Id, s.CashierId, s.WarehouseId, s.OpenedAt, s.ClosedAt,
        s.OpeningBalance, s.ClosingBalance, s.Status,
        s.CashIn, s.CashOut,
        s.ExpectedCash ?? s.CurrentExpectedCash,
        s.Variance, s.VarianceReason, s.VarianceApprovedBy, s.VarianceApprovedAt,
        s.Duration,
        s.Transactions
            .OrderBy(t => t.Timestamp)
            .Select(t => new ShiftTransactionDto(t.Id, t.Description, t.Amount, t.Type, t.Source, t.Timestamp, t.Reference))
            .ToList());
}
