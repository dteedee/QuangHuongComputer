using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Catalog.Infrastructure;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.DTOs;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Giữ chỗ / chốt / nhả và hai lệnh đổi tồn trực tiếp (sửa nhanh một dòng, nhập tồn đầu kỳ) — W2-5.
/// Tách khỏi <see cref="StockEndpoints"/> để mỗi file ở dưới 200 dòng; tất cả vẫn đi qua
/// <see cref="IStockLedger"/>.
/// </summary>
public sealed class StockMutationEndpoints : IInventorySubmodule
{
    public int Order => 11;

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory").RequireModulePermissions(PermissionModules.Inventory);
        MapReservations(group);
        MapMutations(group);
    }

    private static void MapReservations(RouteGroupBuilder group)
    {
        // POST /api/inventory/stock/{productId}/reserve — D09: không truyền kho thì giữ ở kho mặc định.
        group.MapPost("/stock/{productId:guid}/reserve", async (
            Guid productId, ReserveStockDto dto, IStockLedger ledger,
            InventoryDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var context = StockLedgerContext.From(user, dto.ReferenceId, dto.ReferenceType, notes: dto.Notes);
            var entry = await ledger.ReserveAsync(
                new StockLocation(productId, dto.VariantId, dto.WarehouseId), dto.Quantity, context, ct);

            var reservation = new StockReservation(
                entry.InventoryItemId, productId, dto.Quantity, dto.ReferenceId, dto.ReferenceType,
                dto.ExpirationHours ?? 24, dto.Notes);
            db.StockReservations.Add(reservation);
            await db.SaveChangesAsync(ct);

            return Results.Ok(new { success = true, reservationId = reservation.Id, entry.QuantityOnHand, entry.ReservedQuantity });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);

        group.MapPost("/reservations/{referenceId}/fulfill", async (
            string referenceId, IStockLedger ledger, InventoryDbContext db,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var reservations = await db.StockReservations
                .Where(r => r.ReferenceId == referenceId && r.Status == ReservationStatus.Active)
                .ToListAsync(ct);
            if (reservations.Count == 0) throw NotFoundException.For("phiếu giữ chỗ", referenceId);

            var fulfilled = await ledger.InTransactionAsync(async token =>
            {
                foreach (var reservation in reservations)
                {
                    var location = await StockEndpoints.LocationOfAsync(db, reservation.InventoryItemId, token);
                    await ledger.CommitAsync(location, reservation.Quantity,
                        StockLedgerContext.From(user, referenceId, "Reservation"), token);
                    reservation.Fulfill();
                }
                await db.SaveChangesAsync(token);
                return reservations.Count;
            }, ct);

            return Results.Ok(new { success = true, fulfilledCount = fulfilled });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);

        group.MapPost("/reservations/{referenceId}/release", async (
            string referenceId, ReleaseReservationDto dto, IStockLedger ledger,
            InventoryDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var reservations = await db.StockReservations
                .Where(r => r.ReferenceId == referenceId && r.Status == ReservationStatus.Active)
                .ToListAsync(ct);
            if (reservations.Count == 0) throw NotFoundException.For("phiếu giữ chỗ", referenceId);

            var released = await ledger.InTransactionAsync(async token =>
            {
                foreach (var reservation in reservations)
                {
                    var location = await StockEndpoints.LocationOfAsync(db, reservation.InventoryItemId, token);
                    await ledger.ReleaseAsync(location, reservation.Quantity,
                        StockLedgerContext.From(user, referenceId, "Reservation", notes: dto.Reason), token);
                    reservation.Release(dto.Reason);
                }
                await db.SaveChangesAsync(token);
                return reservations.Count;
            }, ct);

            return Results.Ok(new { success = true, releasedCount = released });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);
    }

    private static void MapMutations(RouteGroupBuilder group)
    {
        // PUT /api/inventory/stock/{id}/adjust — sửa nhanh một dòng tồn. Bắt buộc có lý do
        // (validator), luôn ghi một StockMovement, không bao giờ để tồn âm.
        group.MapPut("/stock/{id:guid}/adjust", async (
            Guid id, AdjustStockDto dto, IStockLedger ledger, InventoryDbContext db,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var location = await StockEndpoints.LocationOfAsync(db, id, ct);
            var entry = await ledger.AdjustAsync(location, dto.Amount,
                StockLedgerContext.From(user, id.ToString(), "InventoryItem", notes: dto.Reason),
                StockMovementReason.ManualAdjustment, ct);

            return Results.Ok(new { entry.InventoryItemId, entry.QuantityOnHand, entry.AverageCost, movementId = entry.MovementId });
        })
        .RequireAuthorization(Permissions.Inventory.AdjustStock)
        .WithValidation<AdjustStockDto>();

        // POST /api/inventory/stock/opening-balance — D10: ngoại lệ DUY NHẤT của "GRN là đường nhập
        // kho duy nhất". Hàng mua trong ngày phải đi qua quick-receive (PO + GRN thật) của W2-12.
        group.MapPost("/stock/opening-balance", async (
            OpeningBalanceDto dto, IStockLedger ledger, CatalogDbContext catalogDb,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            // Sổ cái tạo dòng tồn mới khi chưa có (createIfMissing), nên đây là đường DUY NHẤT mà
            // một productId bịa ra có thể đẻ ra một dòng tồn mồ côi: dòng đó không bao giờ khớp
            // được với Products.StockQuantity và sẽ hiện trong mọi báo cáo tồn kho. Chặn tại đây.
            var productExists = await catalogDb.Products.AnyAsync(p => p.Id == dto.ProductId, ct);
            if (!productExists) throw NotFoundException.For("sản phẩm", dto.ProductId);

            var entry = await ledger.ReceiveAsync(
                new StockLocation(dto.ProductId, dto.VariantId, dto.WarehouseId),
                dto.Quantity, dto.UnitCost,
                StockLedgerContext.From(user, referenceType: "OpeningBalance", notes: dto.Notes),
                StockMovementReason.OpeningBalance, ct);

            return Results.Ok(new
            {
                entry.InventoryItemId,
                entry.QuantityOnHand,
                entry.AverageCost,
                movementId = entry.MovementId
            });
        })
        .RequireAuthorization(Permissions.Inventory.ImportOpening)
        .WithValidation<OpeningBalanceDto>();
    }
}
