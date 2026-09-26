using BuildingBlocks.Endpoints;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Phần ghi sổ của một phiếu chuyển kho (W2-5). <c>/ship</c>, <c>/receive</c> và <c>/complete</c> (D09)
/// dùng chung đúng hai hàm này — không có đường ghi sổ thứ hai.
///
/// Serial: lúc xuất, máy chuyển sang <see cref="SerialStatus.InTransit"/> (không kho nào bán được);
/// lúc nhận, máy nhận được về InStock ở kho đích, máy thiếu giữ InTransit kèm ghi chú để truy.
/// Bản cũ đổi kho của serial ngay lúc XUẤT: máy đang trên xe đã hiện "còn hàng" ở kho đích.
/// </summary>
internal static class TransferPosting
{
    internal static async Task<StockTransfer> LoadAsync(InventoryDbContext db, Guid id, CancellationToken ct)
    {
        var transfer = await db.StockTransfers.Include(t => t.Items).FirstOrDefaultAsync(t => t.Id == id, ct);
        return transfer ?? throw NotFoundException.For("phiếu chuyển kho", id);
    }

    /// <summary>Xuất kho nguồn + đưa serial vào trạng thái đang chuyển. Trả về serial đã xuất.</summary>
    internal static async Task<List<string>> ShipLinesAsync(
        InventoryDbContext db, IStockLedger ledger, StockTransfer transfer, string actor, CancellationToken ct)
    {
        var shipped = new List<string>();
        foreach (var line in transfer.Items)
        {
            // Nạp dòng tồn NGUỒN để lấy đúng ProductId/VariantId — lỗi cũ so ProductId với InventoryItemId.
            var source = await StockEndpoints.LocationOfAsync(db, line.InventoryItemId, ct);
            if (source.WarehouseId != transfer.FromWarehouseId)
                throw new DomainException("Mặt hàng trong phiếu không thuộc kho xuất.");

            await ledger.IssueAsync(source, line.Quantity, Context(transfer, actor), StockMovementReason.TransferOut, ct);

            var serials = await PickSerialsAsync(db, line, source.ProductId, transfer.FromWarehouseId, ct);
            foreach (var serial in serials) serial.StartTransit(transfer.TransferNumber);
            line.RecordShippedSerials(serials.Select(s => s.Serial));
            shipped.AddRange(line.SerialNumbers);
        }
        return shipped;
    }

    /// <summary>
    /// Nhập kho đích đúng SỐ ĐÃ NHẬN của từng dòng (đã ghi bởi <see cref="StockTransfer.Receive"/>),
    /// với giá vốn của chính bút toán xuất — không phải giá vốn hiện tại của kho nguồn, vốn có thể
    /// đã đổi giữa lúc xuất và lúc nhận.
    /// </summary>
    internal static async Task ReceiveLinesAsync(
        InventoryDbContext db, IStockLedger ledger, StockTransfer transfer, string actor,
        IReadOnlyDictionary<Guid, IReadOnlyCollection<string>>? receivedSerials, CancellationToken ct)
    {
        var reference = transfer.Id.ToString();
        foreach (var line in transfer.Items)
        {
            var source = await db.InventoryItems
                .Where(i => i.Id == line.InventoryItemId)
                .Select(i => new { i.ProductId, i.VariantId, i.AverageCost })
                .FirstOrDefaultAsync(ct)
                ?? throw NotFoundException.For("dòng tồn kho", line.InventoryItemId);

            var received = line.ReceivedQuantity ?? line.Quantity;
            if (received > 0)
            {
                var unitCost = await db.StockMovements
                    .Where(m => m.ReferenceId == reference && m.InventoryItemId == line.InventoryItemId
                                && m.ReasonCode == StockMovementReason.TransferOut)
                    .Select(m => (decimal?)m.UnitCost)
                    .FirstOrDefaultAsync(ct) ?? source.AverageCost;

                await ledger.ReceiveAsync(
                    new StockLocation(source.ProductId, source.VariantId, transfer.ToWarehouseId),
                    received, unitCost, Context(transfer, actor), StockMovementReason.TransferIn, ct);
            }

            await SettleSerialsAsync(db, transfer, line, received, receivedSerials, ct);
        }
    }

    private static async Task SettleSerialsAsync(
        InventoryDbContext db, StockTransfer transfer, StockTransferItem line, int received,
        IReadOnlyDictionary<Guid, IReadOnlyCollection<string>>? receivedSerials, CancellationToken ct)
    {
        if (line.SerialNumbers.Count == 0) return;

        var arrived = receivedSerials is not null && receivedSerials.TryGetValue(line.Id, out var chosen)
            ? chosen.ToHashSet(StringComparer.OrdinalIgnoreCase)
            : line.SerialNumbers.Take(received).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var unknown = arrived.Where(s => !line.SerialNumbers.Contains(s, StringComparer.OrdinalIgnoreCase)).ToList();
        if (unknown.Count > 0)
            throw new DomainException($"Serial không thuộc phiếu này: {string.Join(", ", unknown)}.");
        if (arrived.Count != received)
            throw new DomainException($"'{line.ProductName}': số serial nhận ({arrived.Count}) phải bằng số lượng nhận ({received}).");

        var serials = await db.SerialNumbers
            .Where(s => line.SerialNumbers.Contains(s.Serial) && s.Status == SerialStatus.InTransit)
            .ToListAsync(ct);
        foreach (var serial in serials)
        {
            if (arrived.Contains(serial.Serial)) serial.CompleteTransit(transfer.ToWarehouseId);
            else serial.FlagMissingInTransit(transfer.TransferNumber);
        }
    }

    /// <summary>
    /// Serial sẽ đi theo dòng: đúng danh sách đã chọn lúc lập phiếu (phải còn InStock ở kho xuất),
    /// hoặc — với phiếu lập trước khi có chọn serial — FIFO như bản cũ.
    /// </summary>
    private static async Task<List<SerialNumber>> PickSerialsAsync(
        InventoryDbContext db, StockTransferItem line, Guid productId, Guid fromWarehouseId, CancellationToken ct)
    {
        var inStock = db.SerialNumbers.Where(s => s.ProductId == productId
                                                  && s.WarehouseId == fromWarehouseId
                                                  && s.Status == SerialStatus.InStock);
        if (line.SerialNumbers.Count == 0)
            return await inStock.OrderBy(s => s.ReceivedAt).Take(line.Quantity).ToListAsync(ct);

        var chosen = await inStock.Where(s => line.SerialNumbers.Contains(s.Serial)).ToListAsync(ct);
        if (chosen.Count != line.SerialNumbers.Count)
        {
            var gone = line.SerialNumbers.Except(chosen.Select(s => s.Serial)).ToList();
            throw new ConflictException(
                $"Serial không còn trong kho xuất (đã bán/chuyển?): {string.Join(", ", gone)}. Huỷ phiếu này và lập phiếu mới.");
        }
        return chosen;
    }

    private static StockLedgerContext Context(StockTransfer transfer, string actor) =>
        new(actor, transfer.Id.ToString(), "StockTransfer", transfer.TransferNumber);
}
