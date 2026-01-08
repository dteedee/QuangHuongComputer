using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Stock Movement - Single Source of Truth for Inventory Changes
/// Every stock change MUST go through a movement record
/// </summary>
public class StockMovement : Entity<Guid>
{
    public Guid InventoryItemId { get; private set; }
    public Guid ProductId { get; private set; }
    public MovementType Type { get; private set; }
    public int Quantity { get; private set; } // Positive for IN, Negative for OUT
    public string Reason { get; private set; } = string.Empty;
    public string? ReferenceId { get; private set; } // OrderId, POId, WorkOrderId, etc.
    public string? ReferenceType { get; private set; } // "Order", "PurchaseOrder", "WorkOrder", "Adjustment"
    public DateTime MovementDate { get; private set; }
    public string? PerformedBy { get; private set; }
    public string? Notes { get; private set; }

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
