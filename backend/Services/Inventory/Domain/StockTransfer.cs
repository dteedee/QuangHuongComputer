using BuildingBlocks.Endpoints;
using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Phiếu chuyển kho: Chờ duyệt → Đã duyệt → Đang vận chuyển → Đã nhận; huỷ được khi CHƯA xuất.
///
/// Đồng thời: bảng mang token <c>xmin</c> (InventoryDbContext). Hai người bấm "Xuất kho" cùng lúc
/// thì người sau nhận 409 thay vì trừ tồn lần thứ hai.
/// </summary>
public class StockTransfer : Entity<Guid>
{
    public string TransferNumber { get; private set; }
    public Guid FromWarehouseId { get; private set; }
    public Guid ToWarehouseId { get; private set; }
    public TransferStatus Status { get; private set; }
    public DateTime? RequestedAt { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? ShippedAt { get; private set; }
    public DateTime? ReceivedAt { get; private set; }
    public DateTime? CancelledAt { get; private set; }
    public string? Notes { get; private set; }
    public string? RequestedBy { get; private set; }
    public string? ApprovedBy { get; private set; }
    public string? ShippedBy { get; private set; }
    public string? ReceivedBy { get; private set; }
    public string? CancelledBy { get; private set; }

    /// <summary>Ghi chú lúc nhận hàng — bắt buộc khi số nhận lệch số xuất.</summary>
    public string? ReceiveNote { get; private set; }

    public List<StockTransferItem> Items { get; private set; } = new();

    /// <summary>Có dòng nào nhận thiếu so với số đã xuất.</summary>
    public bool HasDiscrepancy => Items.Any(i => i.Shortage > 0);

    public StockTransfer(
        string transferNumber,
        Guid fromWarehouseId,
        Guid toWarehouseId,
        List<StockTransferItem> items,
        string? requestedBy = null,
        string? notes = null)
    {
        Id = Guid.NewGuid();
        TransferNumber = transferNumber;
        FromWarehouseId = fromWarehouseId;
        ToWarehouseId = toWarehouseId;
        Items = items;
        RequestedBy = requestedBy;
        Notes = notes;
        Status = TransferStatus.Pending;
        RequestedAt = DateTime.UtcNow;
    }

    protected StockTransfer() { TransferNumber = string.Empty; }

    public void Approve(string approvedBy)
    {
        EnsureStatus(TransferStatus.Pending, "duyệt");
        Status = TransferStatus.Approved;
        ApprovedAt = DateTime.UtcNow;
        ApprovedBy = approvedBy;
    }

    public void Ship(string shippedBy)
    {
        EnsureStatus(TransferStatus.Approved, "xuất kho");
        Status = TransferStatus.Shipped;
        ShippedAt = DateTime.UtcNow;
        ShippedBy = shippedBy;
    }

    /// <summary>
    /// Nhận hàng. <paramref name="receivedQuantities"/> theo <c>StockTransferItem.Id</c>; dòng không
    /// có trong từ điển = nhận đủ. Nhận thiếu thì bắt buộc ghi chú (ai cũng phải biết vì sao lệch).
    /// </summary>
    public void Receive(string receivedBy, IReadOnlyDictionary<Guid, int>? receivedQuantities = null, string? note = null)
    {
        EnsureStatus(TransferStatus.Shipped, "nhận hàng");
        if (receivedQuantities is not null && receivedQuantities.Keys.Any(k => Items.All(i => i.Id != k)))
            throw new DomainException("Có dòng nhận hàng không thuộc phiếu chuyển kho này.");

        foreach (var item in Items)
        {
            var received = receivedQuantities is not null && receivedQuantities.TryGetValue(item.Id, out var q)
                ? q
                : item.Quantity;
            item.MarkReceived(received);
        }

        if (HasDiscrepancy && string.IsNullOrWhiteSpace(note))
            throw new DomainException("Nhận thiếu hàng thì phải ghi chú lý do chênh lệch.");

        Status = TransferStatus.Received;
        ReceivedAt = DateTime.UtcNow;
        ReceivedBy = receivedBy;
        ReceiveNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
    }

    /// <summary>
    /// Chỉ huỷ được khi hàng CHƯA rời kho. Bản cũ cho huỷ cả phiếu đang vận chuyển: tồn kho nguồn
    /// đã bị trừ, serial đã chuyển đi, mà không có gì hoàn lại — hàng biến mất khỏi sổ sách.
    /// </summary>
    public void Cancel(string cancelledBy)
    {
        if (Status is not (TransferStatus.Pending or TransferStatus.Approved))
            throw new ConflictException(
                $"Chỉ huỷ được phiếu chưa xuất kho (trạng thái hiện tại: {StockTransferLabels.Of(Status)}).");

        Status = TransferStatus.Cancelled;
        CancelledAt = DateTime.UtcNow;
        CancelledBy = cancelledBy;
    }

    private void EnsureStatus(TransferStatus expected, string action)
    {
        if (Status != expected)
            throw new ConflictException(
                $"Không thể {action}: phiếu đang ở trạng thái '{StockTransferLabels.Of(Status)}', "
                + $"cần '{StockTransferLabels.Of(expected)}'.");
    }
}

public enum TransferStatus
{
    Pending,
    Approved,
    Shipped,
    Received,
    Cancelled
}

/// <summary>Nhãn tiếng Việt cho thông báo lỗi.</summary>
public static class StockTransferLabels
{
    public static string Of(TransferStatus status) => status switch
    {
        TransferStatus.Pending => "Chờ duyệt",
        TransferStatus.Approved => "Đã duyệt",
        TransferStatus.Shipped => "Đang vận chuyển",
        TransferStatus.Received => "Đã nhận",
        TransferStatus.Cancelled => "Đã huỷ",
        _ => status.ToString(),
    };
}
