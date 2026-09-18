using System.Security.Claims;
using InventoryModule.Domain;

namespace InventoryModule.Application.Stock;

/// <summary>
/// Địa chỉ của MỘT dòng tồn kho: (sản phẩm, biến thể, kho). Đây là khoá nghiệp vụ mà
/// <c>IX_Inventory_Product_Variant_Warehouse_Unique</c> bảo vệ ở tầng CSDL.
/// </summary>
/// <param name="ProductId">Sản phẩm.</param>
/// <param name="VariantId">Biến thể; <c>null</c> = sản phẩm không có biến thể.</param>
/// <param name="WarehouseId">Kho; <c>null</c> = để sổ cái tự chọn kho mặc định (D09).</param>
public readonly record struct StockLocation(Guid ProductId, Guid? VariantId = null, Guid? WarehouseId = null);

/// <summary>
/// Ai làm và theo chứng từ nào. <see cref="PerformedBy"/> LUÔN lấy từ <c>ClaimsPrincipal</c>,
/// không bao giờ từ body request — nếu không thì mọi bút toán kho đều có thể mạo danh.
/// </summary>
public sealed record StockLedgerContext(
    string PerformedBy,
    string? ReferenceId = null,
    string? ReferenceType = null,
    string? DocumentReference = null,
    string? Notes = null)
{
    /// <summary>Người thực hiện = userId trong JWT, fallback email rồi tên đăng nhập.</summary>
    public static StockLedgerContext From(
        ClaimsPrincipal user,
        string? referenceId = null,
        string? referenceType = null,
        string? documentReference = null,
        string? notes = null)
        => new(ResolveActor(user), referenceId, referenceType, documentReference, notes);

    public static string ResolveActor(ClaimsPrincipal? user)
        => user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
           ?? user?.FindFirst("sub")?.Value
           ?? user?.FindFirst(ClaimTypes.Email)?.Value
           ?? user?.Identity?.Name
           ?? "system";
}

/// <summary>Kết quả của một bút toán: đủ để caller trả về cho FE mà không phải query lại.</summary>
public sealed record StockLedgerEntry(
    Guid MovementId,
    Guid InventoryItemId,
    Guid ProductId,
    Guid? VariantId,
    Guid? WarehouseId,
    MovementType Type,
    StockMovementReason Reason,
    int Delta,
    int QuantityOnHand,
    int ReservedQuantity,
    decimal UnitCost,
    decimal AverageCost);

/// <summary>
/// SỔ CÁI TỒN KHO — người ghi DUY NHẤT của <c>InventoryItems.QuantityOnHand</c>,
/// <c>ReservedQuantity</c>, <c>AverageCost</c> và <c>StockMovements</c>.
///
/// <para>
/// Mọi thao tác chạy trong một transaction (kèm execution strategy + retry khi đụng độ xmin),
/// ghi đúng một <c>StockMovement</c> cho mỗi dòng tồn bị tác động, và publish
/// <c>StockChangedEvent</c> để Catalog chiếu lại <c>Products.StockQuantity</c>.
/// </para>
///
/// <para><b>Hợp đồng in-process cho module khác</b> (W2-12 GRN, W2-13 linh kiện sửa chữa,
/// W2-3/W2-10 checkout &amp; POS): chỉ dùng interface này, không bao giờ tự
/// <c>db.InventoryItems.Update(...)</c>.</para>
/// </summary>
public interface IStockLedger
{
    /// <summary>
    /// Nhập kho. Áp bình quân gia quyền <c>ApplyPurchase(quantity, unitCost)</c>.
    /// <para>
    /// D10: <paramref name="reason"/> mặc định <see cref="StockMovementReason.GoodsReceipt"/>;
    /// <see cref="StockMovementReason.OpeningBalance"/> là ngoại lệ DUY NHẤT được nhập không qua GRN.
    /// </para>
    /// </summary>
    Task<StockLedgerEntry> ReceiveAsync(
        StockLocation location,
        int quantity,
        decimal unitCost,
        StockLedgerContext context,
        StockMovementReason reason = StockMovementReason.GoodsReceipt,
        CancellationToken ct = default);

    /// <summary>Xuất kho không qua giữ chỗ. Không bao giờ để tồn âm, không ăn vào phần đang giữ chỗ.</summary>
    Task<StockLedgerEntry> IssueAsync(
        StockLocation location,
        int quantity,
        StockLedgerContext context,
        StockMovementReason reason = StockMovementReason.Sale,
        CancellationToken ct = default);

    /// <summary>Điều chỉnh có dấu (kiểm kê, phiếu điều chỉnh đã duyệt). Không cho tồn âm.</summary>
    Task<StockLedgerEntry> AdjustAsync(
        StockLocation location,
        int delta,
        StockLedgerContext context,
        StockMovementReason reason = StockMovementReason.ManualAdjustment,
        CancellationToken ct = default);

    /// <summary>
    /// Chuyển kho: trừ kho nguồn, cộng kho đích, mang theo <c>AverageCost</c> của nguồn.
    /// Trả về đúng 2 bút toán [Out, In].
    /// </summary>
    Task<IReadOnlyList<StockLedgerEntry>> TransferAsync(
        StockLocation source,
        Guid toWarehouseId,
        int quantity,
        StockLedgerContext context,
        CancellationToken ct = default);

    /// <summary>Giữ chỗ. D09: <c>WarehouseId = null</c> thì lấy kho mặc định.</summary>
    Task<StockLedgerEntry> ReserveAsync(
        StockLocation location,
        int quantity,
        StockLedgerContext context,
        CancellationToken ct = default);

    /// <summary>Chốt phần đã giữ chỗ thành xuất kho thật.</summary>
    Task<StockLedgerEntry> CommitAsync(
        StockLocation location,
        int quantity,
        StockLedgerContext context,
        CancellationToken ct = default);

    /// <summary>Nhả giữ chỗ (đơn huỷ / hết hạn). Không đổi tồn thực.</summary>
    Task<StockLedgerEntry> ReleaseAsync(
        StockLocation location,
        int quantity,
        StockLedgerContext context,
        CancellationToken ct = default);

    /// <summary>
    /// Chuyển tối đa <paramref name="quantity"/> serial đang <c>InStock</c> từ kho nguồn sang kho đích.
    /// Gọi trong cùng transaction với <see cref="TransferAsync"/> để serial không lạc kho.
    /// </summary>
    Task<IReadOnlyList<string>> MoveSerialsAsync(
        Guid productId,
        Guid fromWarehouseId,
        Guid toWarehouseId,
        int quantity,
        CancellationToken ct = default);

    /// <summary>
    /// Chạy <paramref name="work"/> trong CÙNG một transaction sổ cái, để một nghiệp vụ nhiều
    /// bút toán (chuyển kho một bước, duyệt kiểm kê, duyệt phiếu điều chỉnh) hoặc thành công
    /// trọn vẹn hoặc không có bút toán nào.
    /// </summary>
    Task<T> InTransactionAsync<T>(Func<CancellationToken, Task<T>> work, CancellationToken ct = default);
}
