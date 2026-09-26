using System.Security.Claims;
using BuildingBlocks.Contracts;
using BuildingBlocks.Documents;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Catalog.Infrastructure;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace InventoryModule.Endpoints;

/// <summary>
/// Chuyển kho (W2-5 bước 5 + D09). Định tuyến + quyền; kiểm tra khi lập phiếu ở
/// <see cref="TransferCreation"/>, ghi sổ ở <see cref="TransferPosting"/>, đọc ở <see cref="TransferQueries"/>.
///
/// Mọi bước đổi trạng thái chạy trong transaction của sổ cái; bảng phiếu có token xmin nên hai người
/// bấm cùng một bước cùng lúc thì người sau nhận 409 (không trừ tồn / không đổi serial lần hai).
/// D09 <c>POST /{id}/complete</c>: duyệt + xuất + nhận đủ trong MỘT transaction cho hai kho cùng toà nhà.
/// </summary>
public sealed class TransferEndpoints : IInventorySubmodule
{
    public int Order => 30;

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/transfers")
            .RequireModulePermissions(PermissionModules.Inventory);

        group.MapGet("", async (
            [AsParameters] PagedRequest request, string? status, Guid? warehouseId,
            InventoryDbContext db, CancellationToken ct) =>
            Results.Ok(await TransferQueries.ListAsync(db, request, status, warehouseId, ct)))
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db, IUserDirectory users, CancellationToken ct) =>
            Results.Ok(await TransferQueries.DetailAsync(db, users, id, ct)))
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        group.MapPost("", async (
            CreateTransferDto dto, InventoryDbContext db, CatalogDbContext catalog, InventoryDocumentNumbers numbers,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var items = await TransferCreation.BuildItemsAsync(db, catalog, dto, ct);
            var number = await numbers.NextAsync(DocumentNumberTypes.StockTransfer, ct);

            // Người đề nghị lấy từ JWT, KHÔNG từ body: nếu tin body thì ai cũng ký tên người khác.
            var transfer = new StockTransfer(number, dto.FromWarehouseId, dto.ToWarehouseId, items,
                StockLedgerContext.ResolveActor(user), dto.Notes);

            db.StockTransfers.Add(transfer);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/api/inventory/transfers/{transfer.Id}",
                new { transfer.Id, transfer.TransferNumber, Status = transfer.Status.ToString() });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock)
        .WithValidation<CreateTransferDto>();

        group.MapPut("{id:guid}/approve", async (Guid id, InventoryDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var transfer = await TransferPosting.LoadAsync(db, id, ct);
            transfer.Approve(StockLedgerContext.ResolveActor(user));
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { message = "Đã duyệt phiếu chuyển kho", status = transfer.Status.ToString() });
        })
        .RequireAuthorization(Permissions.Inventory.Approve);

        group.MapPut("{id:guid}/ship", async (
            Guid id, InventoryDbContext db, IStockLedger ledger, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var transfer = await TransferPosting.LoadAsync(db, id, ct);
            var actor = StockLedgerContext.ResolveActor(user);

            var serials = await ledger.InTransactionAsync(async token =>
            {
                transfer.Ship(actor);
                var shipped = await TransferPosting.ShipLinesAsync(db, ledger, transfer, actor, token);
                await db.SaveChangesAsync(token);
                return shipped;
            }, ct);

            return Results.Ok(new { message = "Đã xuất kho", status = transfer.Status.ToString(), shippedSerials = serials });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);

        group.MapPut("{id:guid}/receive", async (
            Guid id, ReceiveTransferDto? dto, InventoryDbContext db, IStockLedger ledger, ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var transfer = await TransferPosting.LoadAsync(db, id, ct);
            var actor = StockLedgerContext.ResolveActor(user);
            var lines = dto?.Lines ?? new List<ReceiveTransferLineDto>();
            var quantities = lines.ToDictionary(l => l.ItemId, l => l.ReceivedQuantity);
            var serials = lines.Where(l => l.ReceivedSerials is not null)
                .ToDictionary(l => l.ItemId, l => (IReadOnlyCollection<string>)l.ReceivedSerials!);

            await ledger.InTransactionAsync(async token =>
            {
                transfer.Receive(actor, quantities, dto?.Note);
                await TransferPosting.ReceiveLinesAsync(db, ledger, transfer, actor, serials, token);
                await db.SaveChangesAsync(token);
                return true;
            }, ct);

            return Results.Ok(new
            {
                message = transfer.HasDiscrepancy ? "Đã nhận hàng (có chênh lệch)" : "Đã nhận đủ hàng",
                status = transfer.Status.ToString(),
                hasDiscrepancy = transfer.HasDiscrepancy,
            });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock)
        .WithValidation<ReceiveTransferDto>();

        group.MapPost("{id:guid}/complete", async (
            Guid id, InventoryDbContext db, IStockLedger ledger, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var transfer = await TransferPosting.LoadAsync(db, id, ct);
            var actor = StockLedgerContext.ResolveActor(user);

            var moved = await ledger.InTransactionAsync(async token =>
            {
                if (transfer.Status == TransferStatus.Pending) transfer.Approve(actor);
                transfer.Ship(actor);
                var shipped = await TransferPosting.ShipLinesAsync(db, ledger, transfer, actor, token);
                transfer.Receive(actor);
                await TransferPosting.ReceiveLinesAsync(db, ledger, transfer, actor, null, token);
                await db.SaveChangesAsync(token);
                return shipped;
            }, ct);

            return Results.Ok(new { message = "Đã chuyển kho xong", status = transfer.Status.ToString(), movedSerials = moved });
        })
        .RequireAuthorization(Permissions.Inventory.Approve);

        group.MapPut("{id:guid}/cancel", async (Guid id, InventoryDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var transfer = await TransferPosting.LoadAsync(db, id, ct);
            transfer.Cancel(StockLedgerContext.ResolveActor(user));
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { message = "Đã huỷ phiếu chuyển kho", status = transfer.Status.ToString() });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);
    }
}
