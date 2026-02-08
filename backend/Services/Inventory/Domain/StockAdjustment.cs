using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

public class StockAdjustment : Entity<Guid>
{
    public string AdjustmentNumber { get; private set; }
    public Guid WarehouseId { get; private set; }
    public AdjustmentType Type { get; private set; }
    public string? Reason { get; private set; }
    public DateTime? AdjustedAt { get; private set; }
    public string? AdjustedBy { get; private set; }
    public bool IsApproved { get; private set; }
    public string? ApprovedBy { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    
    public List<StockAdjustmentItem> Items { get; private set; } = new();

    public StockAdjustment(
        string adjustmentNumber,
        Guid warehouseId,
        AdjustmentType type,
        List<StockAdjustmentItem> items,
        string? reason = null,
        string? adjustedBy = null)
    {
        Id = Guid.NewGuid();
        AdjustmentNumber = adjustmentNumber;
        WarehouseId = warehouseId;
        Type = type;
        Items = items;
        Reason = reason;
        AdjustedBy = adjustedBy;
        IsApproved = false;
        AdjustedAt = DateTime.UtcNow;
    }

    protected StockAdjustment() { }

    public void Approve(string approvedBy)
    {
        if (IsApproved)
            throw new InvalidOperationException("Adjustment is already approved");

        IsApproved = true;
        ApprovedAt = DateTime.UtcNow;
        ApprovedBy = approvedBy;
    }

    public void Reject()
    {
        if (IsApproved)
            throw new InvalidOperationException("Cannot reject approved adjustment");

        IsActive = false;
    }
}

public class StockAdjustmentItem : Entity<Guid>
{
    public Guid StockAdjustmentId { get; private set; }
    public Guid InventoryItemId { get; private set; }
    public int QuantityBefore { get; private set; }
    public int QuantityAdjusted { get; private set; }
    public int QuantityAfter { get; private set; }
    public string? ProductName { get; private set; }
    public string? ProductSku { get; private set; }

    public StockAdjustmentItem(
        Guid inventoryItemId,
        int quantityBefore,
        int quantityAdjusted,
        string? productName = null,
        string? productSku = null)
    {
        Id = Guid.NewGuid();
        InventoryItemId = inventoryItemId;
        QuantityBefore = quantityBefore;
        QuantityAdjusted = quantityAdjusted;
        QuantityAfter = quantityBefore + quantityAdjusted;
        ProductName = productName;
        ProductSku = productSku;
    }

    protected StockAdjustmentItem() { }
}

public enum AdjustmentType
{
    Damage,
    Loss,
    Found,
    Count,
    Return,
    Expiry
}
