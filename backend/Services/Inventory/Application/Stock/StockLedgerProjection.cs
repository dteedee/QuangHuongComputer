using BuildingBlocks.Messaging.IntegrationEvents;
using InventoryModule.Domain;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Application.Stock;

/// <summary>
/// Bắn <see cref="StockChangedEvent"/> cho Catalog chiếu lại <c>Products.StockQuantity</c> (W1-5).
///
/// <para>
/// <b>D09:</b> số lượng công bố CHỈ cộng các kho bán được (<see cref="SellableWarehouseTypes"/>:
/// Main, Branch, Showroom). Hàng nằm ở kho Defective/Returns/Transit không bao giờ được quảng cáo
/// là còn hàng — một máy vừa bị đánh dấu lỗi mà vẫn hiện "còn hàng" thì khách đặt xong mới biết.
/// Vì thế chuyển hàng sang kho lỗi VẪN bắn sự kiện: tổng bán được đã giảm.
/// </para>
///
/// <para>
/// Publish nằm NGOÀI transaction và là fire-and-forget: repo hiện chưa có outbox giao dịch
/// (xem <c>docs/integration-events.md</c> § Outbox). Lỗi publish được log, không bao giờ làm hỏng
/// bút toán đã commit — tồn kho là nguồn sự thật, bản chiếu có thể dựng lại.
/// </para>
/// </summary>
public sealed partial class StockLedgerService
{
    private static readonly WarehouseType[] Sellable = SellableWarehouseTypes.All.ToArray();

    private async Task FlushProjectionAsync(CancellationToken ct)
    {
        if (_pending.Count == 0) return;

        // Gộp theo (sản phẩm, kho) — chuyển kho hai bút toán chỉ cần một sự kiện cho mỗi kho.
        var batch = _pending
            .GroupBy(p => (p.ProductId, p.WarehouseId))
            .Select(g => (g.Key.ProductId, g.Key.WarehouseId, Delta: g.Sum(x => x.Delta)))
            .ToList();
        _pending.Clear();

        foreach (var (productId, warehouseId, delta) in batch)
        {
            try
            {
                var sellableOnHand = await _db.InventoryItems
                    .Where(i => i.ProductId == productId)
                    .Join(_db.Warehouses.Where(w => Sellable.Contains(w.Type)),
                        i => i.WarehouseId, w => w.Id, (i, _) => i.QuantityOnHand)
                    .SumAsync(ct);

                await _bus.Publish(new StockChangedEvent(
                    productId,
                    warehouseId ?? Guid.Empty,
                    sellableOnHand,
                    delta,
                    DateTime.UtcNow), ct);

                await PublishLowStockIfNeededAsync(productId, warehouseId, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Không publish được StockChangedEvent cho sản phẩm {ProductId} kho {WarehouseId}. " +
                    "Bút toán đã commit; bản chiếu Catalog sẽ lệch tới lần đối soát kế tiếp.",
                    productId, warehouseId);
            }
        }
    }

    private async Task PublishLowStockIfNeededAsync(Guid productId, Guid? warehouseId, CancellationToken ct)
    {
        if (warehouseId is null) return;

        var row = await _db.InventoryItems
            .Where(i => i.ProductId == productId && i.WarehouseId == warehouseId)
            .Select(i => new { i.QuantityOnHand, i.LowStockThreshold })
            .FirstOrDefaultAsync(ct);

        if (row is null || row.QuantityOnHand > row.LowStockThreshold) return;

        await _bus.Publish(new LowStockEvent(
            productId, string.Empty, warehouseId.Value,
            row.QuantityOnHand, row.LowStockThreshold, DateTime.UtcNow), ct);
    }
}
