using System.Security.Claims;
using BuildingBlocks.Documents;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Chuyển kho (W2-5 bước 5 + D09).
///
/// <para>
/// Hai lỗi của bản cũ đã hết: (1) khi nhận hàng, dòng tồn đích được tìm bằng
/// <c>i.ProductId == item.InventoryItemId</c> nên không bao giờ khớp và mỗi lần nhận lại đẻ ra một
/// dòng tồn rác; (2) xuất/nhập không ghi <c>StockMovement</c> và không mang giá vốn theo, nên hàng
/// chuyển kho mất sạch giá vốn. Cả hai vế giờ đi qua <see cref="IStockLedger"/>.
/// </para>
///
/// <para>
/// D09 thêm <c>POST /{id}/complete</c>: duyệt + xuất + nhận trong MỘT transaction. Chuyển hàng
/// giữa hai kho trong cùng toà nhà mà bắt bấm 4 bước thì nhân viên sẽ bỏ qua cả quy trình.
/// </para>
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
        {
            var query = db.StockTransfers.Include(t => t.Items).AsQueryable();
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<TransferStatus>(status, true, out var ts))
                query = query.Where(t => t.Status == ts);
            if (warehouseId.HasValue)
                query = query.Where(t => t.FromWarehouseId == warehouseId.Value || t.ToWarehouseId == warehouseId.Value);

            var page = await query
                .ApplySort(request,
                    new Dictionary<string, System.Linq.Expressions.Expression<Func<StockTransfer, object?>>>
                    {
                        ["transferNumber"] = t => t.TransferNumber,
                        ["requestedAt"] = t => t.RequestedAt
                    },
                    t => t.RequestedAt)
                .ToPagedResultAsync(request, ct);

            var warehouseNames = await db.Warehouses.Select(w => new { w.Id, w.Name })
                .ToDictionaryAsync(w => w.Id, w => w.Name, ct);

            return Results.Ok(new BuildingBlocks.Repository.PagedResult<object>(
                page.Items.Select(t => (object)new
                {
                    t.Id,
                    t.TransferNumber,
                    t.FromWarehouseId,
                    FromWarehouse = warehouseNames.GetValueOrDefault(t.FromWarehouseId),
                    t.ToWarehouseId,
                    ToWarehouse = warehouseNames.GetValueOrDefault(t.ToWarehouseId),
                    Status = t.Status.ToString(),
                    t.RequestedAt,
                    t.ApprovedAt,
                    t.ShippedAt,
                    t.ReceivedAt,
                    t.Notes,
                    t.RequestedBy,
                    ItemCount = t.Items.Count,
                    TotalQuantity = t.Items.Sum(i => i.Quantity)
                }).ToList(),
                page.Total, page.Page, page.PageSize));
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var transfer = await db.StockTransfers.Include(t => t.Items).FirstOrDefaultAsync(t => t.Id == id, ct);
            if (transfer == null) throw NotFoundException.For("phiếu chuyển kho", id);
            return Results.Ok(transfer);
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        group.MapPost("", async (
            CreateTransferDto dto, InventoryDbContext db, InventoryDocumentNumbers numbers,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            await TransferPosting.EnsureTransferableAsync(db, dto, ct);

            var number = await numbers.NextAsync(DocumentNumberTypes.StockTransfer, ct);
            var items = dto.Items
                .Select(i => new StockTransferItem(i.InventoryItemId, i.Quantity, i.ProductName, i.ProductSku))
                .ToList();

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

            await ledger.InTransactionAsync(async token =>
            {
                transfer.Ship(actor);
                await TransferPosting.ShipLinesAsync(db, ledger, transfer, actor, token);
                await db.SaveChangesAsync(token);
                return true;
            }, ct);

            return Results.Ok(new { message = "Đã xuất kho", status = transfer.Status.ToString() });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);

        group.MapPut("{id:guid}/receive", async (
            Guid id, InventoryDbContext db, IStockLedger ledger, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var transfer = await TransferPosting.LoadAsync(db, id, ct);
            var actor = StockLedgerContext.ResolveActor(user);

            await ledger.InTransactionAsync(async token =>
            {
                transfer.Receive(actor);
                await TransferPosting.ReceiveLinesAsync(db, ledger, transfer, actor, token);
                await db.SaveChangesAsync(token);
                return true;
            }, ct);

            return Results.Ok(new { message = "Đã nhận hàng", status = transfer.Status.ToString() });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);

        // D09 — duyệt + xuất + nhận trong MỘT transaction, hai bút toán, serial đi theo.
        group.MapPost("{id:guid}/complete", async (
            Guid id, InventoryDbContext db, IStockLedger ledger, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var transfer = await TransferPosting.LoadAsync(db, id, ct);
            var actor = StockLedgerContext.ResolveActor(user);

            var moved = await ledger.InTransactionAsync(async token =>
            {
                if (transfer.Status == TransferStatus.Pending) transfer.Approve(actor);
                transfer.Ship(actor);
                var serials = await TransferPosting.ShipLinesAsync(db, ledger, transfer, actor, token);
                transfer.Receive(actor);
                await TransferPosting.ReceiveLinesAsync(db, ledger, transfer, actor, token);
                await db.SaveChangesAsync(token);
                return serials;
            }, ct);

            return Results.Ok(new
            {
                message = "Đã chuyển kho xong",
                status = transfer.Status.ToString(),
                movedSerials = moved
            });
        })
        .RequireAuthorization(Permissions.Inventory.Approve);

        group.MapPut("{id:guid}/cancel", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var transfer = await TransferPosting.LoadAsync(db, id, ct);
            transfer.Cancel();
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { message = "Đã hủy phiếu chuyển kho" });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);
    }
}
