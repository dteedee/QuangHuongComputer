using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Phiếu nhập kho (GRN — Goods Received Note).
/// Phase 05 luồng A: bổ sung kiểm hàng theo dòng — chia số nhận thành
/// AcceptedQty (nhập kho chính) và RejectedQty (chuyển kho Defective, sinh PurchaseReturn).
/// </summary>
public class GoodsReceivedNote : Entity<Guid>
{
    public GoodsReceivedNote() { Id = Guid.NewGuid(); }

    public string DocumentNumber { get; set; } = "";
    public DateTime DocumentDate { get; set; } = DateTime.UtcNow;
    public Guid? SupplierId { get; set; }
    public Guid? WarehouseId { get; set; }
    public Guid? PurchaseOrderId { get; set; }
    public string ReceivedBy { get; set; } = "";
    public string? Notes { get; set; }
    public GRNStatus Status { get; set; } = GRNStatus.Draft;
    /// <summary>
    /// Phase 07: phân biệt nguồn nhập. Purchase = nhập từ NCC (mặc định).
    /// CustomerReturn = khách trả hàng (không có SupplierId, có ReferenceOrderId của Sales).
    /// </summary>
    public GRNSource Source { get; set; } = GRNSource.Purchase;
    /// <summary>Nếu Source = CustomerReturn: OrderId gốc (Sales) hoặc ReturnRequestId.</summary>
    public Guid? ReferenceOrderId { get; set; }
    public List<GRNItem> Items { get; set; } = new();

    /// <summary>Có ít nhất 1 dòng bị từ chối → cần sinh PurchaseReturn khi Confirm.</summary>
    public bool HasRejectedItems => Items.Any(i => i.RejectedQty > 0);

    /// <summary>Kiểm tra sẵn sàng xác nhận: mọi dòng phải được kiểm (Accepted + Rejected = Quantity).</summary>
    public bool IsFullyInspected => Items.All(i => i.AcceptedQty + i.RejectedQty == i.Quantity);
}

public class GRNItem : Entity<Guid>
{
    public GRNItem() { Id = Guid.NewGuid(); }

    public Guid GoodsReceivedNoteId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public string? SerialNumbers { get; set; }

    // Kiểm hàng
    public int AcceptedQty { get; set; }
    public int RejectedQty { get; set; }
    public string? RejectReason { get; set; }
    public Guid? TargetWarehouseId { get; set; } // Kho nhập cho hàng đạt (nếu khác WarehouseId mặc định của GRN)

    /// <summary>
    /// Ghi kết quả kiểm hàng. Bắt buộc accepted + rejected == quantity đã nhận.
    /// Nếu rejected > 0 thì phải có lý do.
    /// </summary>
    public void Inspect(int acceptedQty, int rejectedQty, string? reason = null, Guid? targetWarehouseId = null)
    {
        if (acceptedQty < 0 || rejectedQty < 0)
            throw new ArgumentException("Số lượng đạt/lỗi không được âm.");
        if (acceptedQty + rejectedQty != Quantity)
            throw new InvalidOperationException(
                $"Tổng kiểm ({acceptedQty}+{rejectedQty}) phải bằng số nhận ({Quantity}).");
        if (rejectedQty > 0 && string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Có hàng lỗi thì phải nhập lý do.", nameof(reason));

        AcceptedQty = acceptedQty;
        RejectedQty = rejectedQty;
        RejectReason = reason;
        TargetWarehouseId = targetWarehouseId;
    }
}

public enum GRNStatus { Draft, Confirmed, Cancelled }

/// <summary>Phase 07: nguồn phiếu nhập.</summary>
public enum GRNSource
{
    Purchase = 1,        // Nhập từ NCC (mặc định)
    CustomerReturn = 2,  // Khách trả hàng (Sales.ReturnRequest)
    Transfer = 3,        // Chuyển kho nội bộ
    Adjustment = 4       // Điều chỉnh
}
