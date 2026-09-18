using BuildingBlocks.Endpoints;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InventoryModule.Application.Stock;

/// <summary>
/// Hiện thực <see cref="IStockLedger"/> — người ghi DUY NHẤT của số lượng tồn kho (W2-5 bước 1).
///
/// <para>
/// Trước W2-5 mỗi luồng tự sửa <c>QuantityOnHand</c> theo cách riêng: phiếu xuất gọi
/// <c>AdjustStock(-n)</c> không ghi bút toán, kiểm kê so sánh <c>ProductId</c> với
/// <c>InventoryItemId</c>, nhập PO không bao giờ đặt giá vốn. Gom hết về một chỗ thì bất biến
/// "mọi thay đổi số lượng đều có một dòng <c>StockMovements</c> kèm người thực hiện" mới đúng
/// được, và giá vốn bình quân mới có thể tin.
/// </para>
/// </summary>
public sealed partial class StockLedgerService : IStockLedger
{
    private const int MaxConcurrencyAttempts = 3;
    private const int BackoffMilliseconds = 40;

    private readonly InventoryDbContext _db;
    private readonly IPublishEndpoint _bus;
    private readonly ILogger<StockLedgerService> _logger;

    /// <summary>Sự kiện chờ publish — chỉ bắn SAU khi transaction ngoài cùng commit.</summary>
    private readonly List<(Guid ProductId, Guid? WarehouseId, int Delta)> _pending = new();

    public StockLedgerService(InventoryDbContext db, IPublishEndpoint bus, ILogger<StockLedgerService> logger)
    {
        _db = db;
        _bus = bus;
        _logger = logger;
    }

    /// <summary>
    /// Nghiệp vụ nhiều bút toán (duyệt kiểm kê, duyệt phiếu điều chỉnh, chuyển kho một bước).
    ///
    /// <para>
    /// KHÔNG retry ở đây — cố ý. Retry gọi <c>ChangeTracker.Clear()</c>, mà caller của
    /// <c>InTransactionAsync</c> luôn giữ một aggregate ĐÃ đổi trạng thái trước khi gọi sổ cái
    /// (<c>adjustment.Approve()</c>, <c>transfer.Ship()</c>, <c>session.Status = Approved</c>).
    /// Sau <c>Clear()</c> aggregate đó bị detach: lần thử thứ hai vẫn ghi được bút toán nhưng
    /// <c>SaveChanges</c> KHÔNG còn lưu trạng thái của nó — phiếu chuyển kho đã xuất hàng mà vẫn
    /// ở trạng thái "chờ xuất", tức là xuất được lần thứ hai. Đụng độ ở đây trả 409 để client
    /// làm lại toàn bộ request với dữ liệu mới, thay vì âm thầm ghi lệch.
    /// </para>
    /// </summary>
    public Task<T> InTransactionAsync<T>(Func<CancellationToken, Task<T>> work, CancellationToken ct = default)
        => RunAsync(work, ct, allowRetry: false);

    public Task<StockLedgerEntry> ReceiveAsync(
        StockLocation location,
        int quantity,
        decimal unitCost,
        StockLedgerContext context,
        StockMovementReason reason = StockMovementReason.GoodsReceipt,
        CancellationToken ct = default)
    {
        if (quantity <= 0) throw new DomainException("Số lượng nhập phải lớn hơn 0.");
        if (unitCost < 0) throw new DomainException("Giá vốn không được âm.");

        return RunAsync(async token =>
        {
            var item = await ResolveRowAsync(location, createIfMissing: true, token);
            item.ApplyPurchase(quantity, unitCost);   // bình quân gia quyền + cộng tồn
            return await PostAsync(item, MovementType.In, quantity, reason, unitCost, context, token);
        }, ct);
    }

    public Task<StockLedgerEntry> IssueAsync(
        StockLocation location,
        int quantity,
        StockLedgerContext context,
        StockMovementReason reason = StockMovementReason.Sale,
        CancellationToken ct = default)
    {
        if (quantity <= 0) throw new DomainException("Số lượng xuất phải lớn hơn 0.");

        return RunAsync(async token =>
        {
            var item = await ResolveRowAsync(location, createIfMissing: false, token);
            item.IssueStock(quantity);
            return await PostAsync(item, MovementType.Out, -quantity, reason, item.AverageCost, context, token);
        }, ct);
    }

    public Task<StockLedgerEntry> AdjustAsync(
        StockLocation location,
        int delta,
        StockLedgerContext context,
        StockMovementReason reason = StockMovementReason.ManualAdjustment,
        CancellationToken ct = default)
    {
        if (delta == 0) throw new DomainException("Chênh lệch điều chỉnh phải khác 0.");

        return RunAsync(async token =>
        {
            var item = await ResolveRowAsync(location, createIfMissing: delta > 0, token);
            item.ApplyAdjustment(delta);
            return await PostAsync(item, MovementType.Adjustment, delta, reason, item.AverageCost, context, token);
        }, ct);
    }

    // ---------------------------------------------------------------- hạ tầng dùng chung

    /// <summary>
    /// Tìm đúng dòng tồn của (sản phẩm, biến thể, kho). <c>WarehouseId == null</c> → kho mặc định (D09).
    /// So sánh NULL phải viết tường minh: <c>i.VariantId == variantParam</c> với tham số null sinh ra
    /// <c>= NULL</c> trong SQL và không bao giờ khớp.
    /// </summary>
    private async Task<InventoryItem> ResolveRowAsync(StockLocation location, bool createIfMissing, CancellationToken ct)
    {
        var warehouseId = location.WarehouseId ?? await DefaultWarehouseIdAsync(ct);

        var query = _db.InventoryItems.Where(i => i.ProductId == location.ProductId && i.WarehouseId == warehouseId);
        query = location.VariantId.HasValue
            ? query.Where(i => i.VariantId == location.VariantId.Value)
            : query.Where(i => i.VariantId == null);

        var item = await query.FirstOrDefaultAsync(ct);
        if (item is not null) return item;

        if (!createIfMissing)
            throw new DomainException("Sản phẩm chưa có tồn kho tại kho này.");

        item = new InventoryItem(
            productId: location.ProductId,
            variantId: location.VariantId,
            initialQuantity: 0,
            warehouseId: warehouseId);
        _db.InventoryItems.Add(item);
        return item;
    }

    private async Task<Guid> DefaultWarehouseIdAsync(CancellationToken ct)
    {
        var id = await _db.Warehouses
            .Where(w => w.IsDefault && w.IsActive)
            .Select(w => (Guid?)w.Id)
            .FirstOrDefaultAsync(ct);

        return id ?? throw new DomainException(
            "Chưa cấu hình kho mặc định. Vào Kho hàng và đặt một kho làm mặc định trước.");
    }

    /// <summary>Ghi bút toán + lưu + xếp hàng sự kiện chiếu tồn. Mọi thao tác đều đi qua đây.</summary>
    private async Task<StockLedgerEntry> PostAsync(
        InventoryItem item,
        MovementType type,
        int delta,
        StockMovementReason reason,
        decimal unitCost,
        StockLedgerContext context,
        CancellationToken ct)
    {
        var movement = StockMovement.Post(
            item, type, delta, reason, unitCost,
            context.PerformedBy, context.ReferenceId, context.ReferenceType,
            context.DocumentReference, context.Notes);

        _db.StockMovements.Add(movement);
        await _db.SaveChangesAsync(ct);

        if (type is MovementType.In or MovementType.Out or MovementType.Adjustment or MovementType.Transfer)
            _pending.Add((item.ProductId, item.WarehouseId, delta));

        return new StockLedgerEntry(
            movement.Id, item.Id, item.ProductId, item.VariantId, item.WarehouseId,
            type, reason, delta, item.QuantityOnHand, item.ReservedQuantity, unitCost, item.AverageCost);
    }
}
