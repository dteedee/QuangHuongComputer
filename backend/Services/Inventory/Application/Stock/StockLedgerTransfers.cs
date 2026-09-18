using BuildingBlocks.Endpoints;
using InventoryModule.Domain;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Application.Stock;

/// <summary>
/// Chuyển kho ở tầng sổ cái (W2-5 bước 5).
///
/// <para>
/// Lỗi cũ: endpoint nhận hàng tìm dòng tồn đích bằng
/// <c>i.ProductId == item.InventoryItemId</c> — so <c>ProductId</c> với <c>InventoryItemId</c>,
/// nên không bao giờ khớp và mỗi lần nhận lại tạo một <c>InventoryItem</c> mới với
/// <c>ProductId</c> = id của dòng tồn nguồn. Ở đây dòng nguồn được nạp trước để lấy đúng
/// <c>ProductId</c>/<c>VariantId</c>, và giá vốn được mang sang kho đích.
/// </para>
/// </summary>
public sealed partial class StockLedgerService
{
    public Task<IReadOnlyList<StockLedgerEntry>> TransferAsync(
        StockLocation source,
        Guid toWarehouseId,
        int quantity,
        StockLedgerContext context,
        CancellationToken ct = default)
    {
        if (quantity <= 0) throw new DomainException("Số lượng chuyển phải lớn hơn 0.");

        return RunAsync(async token =>
        {
            var from = await ResolveRowAsync(source, createIfMissing: false, token);
            if (from.WarehouseId == toWarehouseId)
                throw new DomainException("Kho nguồn và kho đích phải khác nhau.");

            var destinationExists = await _db.Warehouses.AnyAsync(w => w.Id == toWarehouseId && w.IsActive, token);
            if (!destinationExists) throw NotFoundException.For("kho đích", toWarehouseId);

            var unitCost = from.AverageCost;

            from.IssueStock(quantity);
            var outEntry = await PostAsync(from, MovementType.Transfer, -quantity,
                StockMovementReason.TransferOut, unitCost, context, token);

            var to = await ResolveRowAsync(
                new StockLocation(from.ProductId, from.VariantId, toWarehouseId),
                createIfMissing: true, token);
            to.ApplyPurchase(quantity, unitCost);   // mang giá vốn sang, không đặt lại về 0
            var inEntry = await PostAsync(to, MovementType.Transfer, quantity,
                StockMovementReason.TransferIn, unitCost, context, token);

            return (IReadOnlyList<StockLedgerEntry>)new[] { outEntry, inEntry };
        }, ct);
    }

    /// <summary>
    /// Chuyển tối đa <paramref name="quantity"/> serial đang <c>InStock</c> của dòng tồn nguồn sang
    /// kho đích. Serial là hàng cá thể: nếu không đi cùng thì máy nằm ở kho A nhưng hệ thống tra ra kho B.
    /// </summary>
    /// <returns>Danh sách serial đã chuyển (có thể ít hơn số lượng nếu sản phẩm không theo dõi serial).</returns>
    public async Task<IReadOnlyList<string>> MoveSerialsAsync(
        Guid productId,
        Guid fromWarehouseId,
        Guid toWarehouseId,
        int quantity,
        CancellationToken ct = default)
    {
        var serials = await _db.SerialNumbers
            .Where(s => s.ProductId == productId
                        && s.WarehouseId == fromWarehouseId
                        && s.Status == SerialStatus.InStock)
            .OrderBy(s => s.ReceivedAt)
            .Take(quantity)
            .ToListAsync(ct);

        foreach (var serial in serials) serial.TransferWarehouse(toWarehouseId);
        if (serials.Count > 0) await _db.SaveChangesAsync(ct);

        return serials.Select(s => s.Serial).ToList();
    }
}
