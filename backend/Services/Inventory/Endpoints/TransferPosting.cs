using BuildingBlocks.Endpoints;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Phần ghi sổ của một phiếu chuyển kho (W2-5). Tách khỏi <see cref="TransferEndpoints"/> để file
/// định tuyến ở dưới 200 dòng, và để <c>/complete</c> (D09) dùng lại đúng hai hàm mà
/// <c>/ship</c> và <c>/receive</c> dùng — không có đường ghi sổ thứ hai.
/// </summary>
internal static class TransferPosting
{
    internal static async Task<StockTransfer> LoadAsync(InventoryDbContext db, Guid id, CancellationToken ct)
    {
        var transfer = await db.StockTransfers.Include(t => t.Items).FirstOrDefaultAsync(t => t.Id == id, ct);
        return transfer ?? throw NotFoundException.For("phiếu chuyển kho", id);
    }

    /// <summary>Xuất kho nguồn + chuyển serial. Trả về serial đã chuyển để hiển thị lại cho người dùng.</summary>
    internal static async Task<List<string>> ShipLinesAsync(
        InventoryDbContext db, IStockLedger ledger, StockTransfer transfer, string actor, CancellationToken ct)
    {
        var serials = new List<string>();
        foreach (var line in transfer.Items)
        {
            // Nạp dòng tồn NGUỒN để lấy đúng ProductId/VariantId — lỗi cũ so ProductId với InventoryItemId.
            var source = await StockEndpoints.LocationOfAsync(db, line.InventoryItemId, ct);
            if (source.WarehouseId != transfer.FromWarehouseId)
                throw new DomainException(
                    $"Mặt hàng trong phiếu không thuộc kho xuất {transfer.FromWarehouseId}.");

            var context = new StockLedgerContext(actor, transfer.Id.ToString(), "StockTransfer", transfer.TransferNumber);
            await ledger.IssueAsync(source, line.Quantity, context, StockMovementReason.TransferOut, ct);

            serials.AddRange(await ledger.MoveSerialsAsync(
                source.ProductId, transfer.FromWarehouseId, transfer.ToWarehouseId, line.Quantity, ct));
        }
        return serials;
    }

    internal static async Task ReceiveLinesAsync(
        InventoryDbContext db, IStockLedger ledger, StockTransfer transfer, string actor, CancellationToken ct)
    {
        foreach (var line in transfer.Items)
        {
            var source = await db.InventoryItems
                .Where(i => i.Id == line.InventoryItemId)
                .Select(i => new { i.ProductId, i.VariantId, i.AverageCost })
                .FirstOrDefaultAsync(ct)
                ?? throw NotFoundException.For("dòng tồn kho", line.InventoryItemId);

            var context = new StockLedgerContext(actor, transfer.Id.ToString(), "StockTransfer", transfer.TransferNumber);
            await ledger.ReceiveAsync(
                new StockLocation(source.ProductId, source.VariantId, transfer.ToWarehouseId),
                line.Quantity, source.AverageCost, context, StockMovementReason.TransferIn, ct);
        }
    }

    /// <summary>Kho nguồn/đích tồn tại, và mọi dòng thuộc kho nguồn với tồn khả dụng đủ.</summary>
    internal static async Task EnsureTransferableAsync(InventoryDbContext db, CreateTransferDto dto, CancellationToken ct)
    {
        var warehouses = await db.Warehouses
            .Where(w => w.Id == dto.FromWarehouseId || w.Id == dto.ToWarehouseId)
            .Select(w => w.Id).ToListAsync(ct);
        if (!warehouses.Contains(dto.FromWarehouseId)) throw NotFoundException.For("kho xuất", dto.FromWarehouseId);
        if (!warehouses.Contains(dto.ToWarehouseId)) throw NotFoundException.For("kho nhận", dto.ToWarehouseId);

        var ids = dto.Items.Select(i => i.InventoryItemId).ToList();
        var rows = await db.InventoryItems.Where(i => ids.Contains(i.Id))
            .Select(i => new { i.Id, i.WarehouseId, i.QuantityOnHand, i.ReservedQuantity })
            .ToListAsync(ct);

        foreach (var line in dto.Items)
        {
            var row = rows.FirstOrDefault(r => r.Id == line.InventoryItemId)
                      ?? throw NotFoundException.For("dòng tồn kho", line.InventoryItemId);
            if (row.WarehouseId != dto.FromWarehouseId)
                throw new DomainException("Mặt hàng được chọn không nằm trong kho xuất.");
            if (row.QuantityOnHand - row.ReservedQuantity < line.Quantity)
                throw new DomainException(
                    $"Tồn khả dụng chỉ còn {row.QuantityOnHand - row.ReservedQuantity}, không chuyển được {line.Quantity}.");
        }
    }
}
