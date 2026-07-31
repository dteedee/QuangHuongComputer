using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Phiếu trả hàng NCC — thường sinh tự động khi GRN kiểm hàng thấy lỗi.
/// Có thể được tạo tay khi phát hiện lỗi sau khi đã nhập kho.
/// Vòng đời: Draft → Sent → Accepted → Refunded | Cancelled.
/// </summary>
public class PurchaseReturn : Entity<Guid>
{
    public string Number { get; private set; } = string.Empty;
    public Guid? GRNId { get; private set; }
    public Guid? PurchaseOrderId { get; private set; }
    public Guid SupplierId { get; private set; }
    public DateTime ReturnDate { get; private set; } = DateTime.UtcNow;
    public PurchaseReturnStatus Status { get; private set; } = PurchaseReturnStatus.Draft;
    public decimal TotalValue { get; private set; }
    public decimal RefundAmount { get; private set; }
    public string? Notes { get; private set; }
    public List<PurchaseReturnItem> Items { get; private set; } = new();

    protected PurchaseReturn() { }

    public PurchaseReturn(
        Guid supplierId,
        List<PurchaseReturnItem> items,
        Guid? grnId = null,
        Guid? purchaseOrderId = null,
        string? notes = null)
    {
        if (items == null || items.Count == 0)
            throw new ArgumentException("Phiếu trả phải có ít nhất 1 dòng.", nameof(items));

        Id = Guid.NewGuid();
        Number = $"PR-RET-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";
        SupplierId = supplierId;
        Items = items;
        GRNId = grnId;
        PurchaseOrderId = purchaseOrderId;
        Notes = notes;
        TotalValue = items.Sum(i => i.Quantity * i.UnitCost);
    }

    public void Confirm()
    {
        if (Status != PurchaseReturnStatus.Draft)
            throw new InvalidOperationException("Chỉ phiếu nháp mới có thể xác nhận gửi.");
        Status = PurchaseReturnStatus.Sent;
    }

    public void Accept()
    {
        if (Status != PurchaseReturnStatus.Sent)
            throw new InvalidOperationException("Chỉ phiếu đã gửi mới có thể được NCC chấp nhận.");
        Status = PurchaseReturnStatus.Accepted;
    }

    public void MarkRefunded(decimal refundAmount)
    {
        if (Status != PurchaseReturnStatus.Accepted)
            throw new InvalidOperationException("Phiếu phải được NCC chấp nhận trước khi ghi hoàn tiền.");
        if (refundAmount < 0) throw new ArgumentException("Số tiền hoàn không được âm.", nameof(refundAmount));
        Status = PurchaseReturnStatus.Refunded;
        RefundAmount = refundAmount;
    }

    public void Cancel()
    {
        if (Status == PurchaseReturnStatus.Refunded)
            throw new InvalidOperationException("Đã hoàn tiền, không thể huỷ.");
        Status = PurchaseReturnStatus.Cancelled;
    }
}

public class PurchaseReturnItem : Entity<Guid>
{
    public Guid PurchaseReturnId { get; set; }
    public Guid ProductId { get; private set; }
    public string ProductName { get; private set; } = string.Empty;
    public int Quantity { get; private set; }
    public decimal UnitCost { get; private set; }
    public string? Reason { get; private set; }
    public string? SerialNumbers { get; private set; }

    protected PurchaseReturnItem() { }

    public PurchaseReturnItem(Guid productId, string productName, int quantity, decimal unitCost, string? reason = null, string? serialNumbers = null)
    {
        if (quantity <= 0) throw new ArgumentException("Số lượng phải > 0.", nameof(quantity));
        if (unitCost < 0) throw new ArgumentException("Giá vốn không được âm.", nameof(unitCost));
        Id = Guid.NewGuid();
        ProductId = productId;
        ProductName = productName;
        Quantity = quantity;
        UnitCost = unitCost;
        Reason = reason;
        SerialNumbers = serialNumbers;
    }
}

public enum PurchaseReturnStatus
{
    Draft = 0,
    Sent = 1,
    Accepted = 2,
    Refunded = 3,
    Cancelled = 4
}
