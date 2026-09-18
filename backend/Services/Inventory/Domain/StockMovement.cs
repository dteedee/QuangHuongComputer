using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Stock Movement - Single Source of Truth for Inventory Changes
/// Every stock change MUST go through a movement record.
///
/// <para>
/// W2-5: <c>StockLedgerService</c> là NGƯỜI GHI DUY NHẤT của bảng này. Mỗi bút toán mang thêm
/// kho, biến thể, giá vốn đơn vị và tồn SAU bút toán, nên báo cáo không phải dựng lại số dư
/// bằng cách cộng dồn toàn bộ lịch sử.
/// </para>
/// </summary>
public class StockMovement : Entity<Guid>
{
    public Guid InventoryItemId { get; private set; }
    public Guid ProductId { get; private set; }

    /// <summary>W2-5: biến thể của dòng tồn bị tác động (null = sản phẩm không có biến thể).</summary>
    public Guid? VariantId { get; private set; }

    /// <summary>W2-5: kho của dòng tồn bị tác động. Null chỉ với dữ liệu cũ trước W2-5.</summary>
    public Guid? WarehouseId { get; private set; }

    public MovementType Type { get; private set; }
    public int Quantity { get; private set; } // Positive for IN, Negative for OUT
    public string Reason { get; private set; } = string.Empty;

    /// <summary>W2-5: mã lý do chuẩn hoá. <see cref="Reason"/> là nhãn hiển thị của nó.</summary>
    public StockMovementReason ReasonCode { get; private set; }

    /// <summary>W2-5: giá vốn đơn vị của bút toán nhập (0 với bút toán xuất/giữ chỗ).</summary>
    public decimal UnitCost { get; private set; }

    /// <summary>W2-5: <c>QuantityOnHand</c> của dòng tồn NGAY SAU bút toán này.</summary>
    public int BalanceAfter { get; private set; }

    public string? ReferenceId { get; private set; } // OrderId, POId, WorkOrderId, etc.
    public string? ReferenceType { get; private set; } // "Order", "PurchaseOrder", "WorkOrder", "Adjustment"
    public DateTime MovementDate { get; private set; }
    public string? PerformedBy { get; private set; }
    public string? Notes { get; private set; }
    public string? DocumentReference { get; private set; } // GRN number, DN number, etc.

    protected StockMovement() { }

    public StockMovement(
        Guid inventoryItemId,
        Guid productId,
        MovementType type,
        int quantity,
        string reason,
        string? referenceId = null,
        string? referenceType = null,
        string? performedBy = null,
        string? notes = null)
    {
        Id = Guid.NewGuid();
        InventoryItemId = inventoryItemId;
        ProductId = productId;
        Type = type;
        Quantity = quantity;
        Reason = reason;
        ReferenceId = referenceId;
        ReferenceType = referenceType;
        MovementDate = DateTime.UtcNow;
        PerformedBy = performedBy;
        Notes = notes;
        CreatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Bút toán đầy đủ do <c>StockLedgerService</c> ghi. Constructor cũ ở trên được giữ nguyên
    /// cho các call site chưa chuyển sang sổ cái (W2-12 GRN, Sales restock) để build không gãy.
    /// </summary>
    public static StockMovement Post(
        InventoryItem item,
        MovementType type,
        int quantity,
        StockMovementReason reasonCode,
        decimal unitCost,
        string performedBy,
        string? referenceId = null,
        string? referenceType = null,
        string? documentReference = null,
        string? notes = null)
    {
        var movement = new StockMovement(
            item.Id, item.ProductId, type, quantity,
            StockMovementReasons.Label(reasonCode),
            referenceId, referenceType, performedBy, notes)
        {
            VariantId = item.VariantId,
            WarehouseId = item.WarehouseId,
            ReasonCode = reasonCode,
            UnitCost = unitCost,
            BalanceAfter = item.QuantityOnHand,
            DocumentReference = documentReference
        };
        return movement;
    }
}

public enum MovementType
{
    In,         // Stock received (Purchase, Return from customer)
    Out,        // Stock issued (Sale, Parts used in repair)
    Transfer,   // Between warehouses
    Adjustment, // Manual correction (requires approval)
    Reserved,   // Reserved for order (not yet shipped)
    Released    // Release reservation (order cancelled)
}
