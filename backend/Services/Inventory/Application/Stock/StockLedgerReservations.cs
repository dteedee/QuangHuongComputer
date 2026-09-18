using BuildingBlocks.Endpoints;
using InventoryModule.Domain;

namespace InventoryModule.Application.Stock;

/// <summary>
/// Giữ chỗ / chốt / nhả — vế "tiền xuất kho" của sổ cái (W2-5 bước 1, hợp đồng cho W2-3 checkout &amp; POS).
///
/// <para>
/// Giữ chỗ KHÔNG đổi <c>QuantityOnHand</c>, chỉ đổi <c>ReservedQuantity</c>. Bút toán
/// <c>Reserved</c>/<c>Released</c> vẫn được ghi để truy vết "ai giữ hàng của đơn nào", nhưng không
/// vào sự kiện chiếu tồn: tồn vật lý chưa đổi.
/// </para>
/// </summary>
public sealed partial class StockLedgerService
{
    public Task<StockLedgerEntry> ReserveAsync(
        StockLocation location,
        int quantity,
        StockLedgerContext context,
        CancellationToken ct = default)
    {
        if (quantity <= 0) throw new DomainException("Số lượng giữ chỗ phải lớn hơn 0.");

        return RunAsync(async token =>
        {
            // D09: không truyền kho thì giữ ở kho mặc định.
            var item = await ResolveRowAsync(location, createIfMissing: false, token);
            if (item.AvailableQuantity < quantity)
                throw new DomainException(
                    $"Chỉ còn {item.AvailableQuantity} sản phẩm khả dụng, không thể giữ {quantity}.");

            item.ReserveStock(quantity);
            return await PostAsync(item, MovementType.Reserved, quantity,
                StockMovementReason.Reservation, item.AverageCost, context, token);
        }, ct);
    }

    public Task<StockLedgerEntry> CommitAsync(
        StockLocation location,
        int quantity,
        StockLedgerContext context,
        CancellationToken ct = default)
    {
        if (quantity <= 0) throw new DomainException("Số lượng chốt phải lớn hơn 0.");

        return RunAsync(async token =>
        {
            var item = await ResolveRowAsync(location, createIfMissing: false, token);
            // ConfirmReservedStock ném khi chốt nhiều hơn phần đã giữ hoặc hơn tồn thực.
            item.ConfirmReservedStock(quantity);
            return await PostAsync(item, MovementType.Out, -quantity,
                StockMovementReason.ReservationCommit, item.AverageCost, context, token);
        }, ct);
    }

    public Task<StockLedgerEntry> ReleaseAsync(
        StockLocation location,
        int quantity,
        StockLedgerContext context,
        CancellationToken ct = default)
    {
        if (quantity <= 0) throw new DomainException("Số lượng nhả giữ chỗ phải lớn hơn 0.");

        return RunAsync(async token =>
        {
            var item = await ResolveRowAsync(location, createIfMissing: false, token);

            // ReleaseReservedStock CẮT NGỌN khi nhả nhiều hơn phần đang giữ (dữ liệu lệch được xử
            // lý mềm). Bút toán phải ghi số THẬT SỰ đã nhả, không phải số được yêu cầu — nếu không
            // thì sổ giữ chỗ cộng dồn ra một con số không bao giờ khớp với ReservedQuantity.
            var before = item.ReservedQuantity;
            item.ReleaseReservedStock(quantity);
            var released = before - item.ReservedQuantity;

            return await PostAsync(item, MovementType.Released, -released,
                StockMovementReason.ReservationRelease, item.AverageCost, context, token);
        }, ct);
    }
}
