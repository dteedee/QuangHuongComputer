using BuildingBlocks.SharedKernel;

namespace Repair.Domain;

public class WorkOrderPart : Entity<Guid>
{
    public Guid WorkOrderId { get; private set; }
    public Guid InventoryItemId { get; private set; }
    public string PartName { get; private set; } = string.Empty;
    public string? PartNumber { get; private set; }
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal TotalPrice => Quantity * UnitPrice;

    // Reference to work order
    public WorkOrder? WorkOrder { get; private set; }

    protected WorkOrderPart() { }

    public WorkOrderPart(
        Guid workOrderId,
        Guid inventoryItemId,
        string partName,
        int quantity,
        decimal unitPrice,
        string? partNumber = null)
    {
        if (quantity <= 0)
            throw new ArgumentException("Quantity must be greater than zero", nameof(quantity));

        if (unitPrice < 0)
            throw new ArgumentException("Unit price cannot be negative", nameof(unitPrice));

        Id = Guid.NewGuid();
        WorkOrderId = workOrderId;
        InventoryItemId = inventoryItemId;
        PartName = partName;
        PartNumber = partNumber;
        Quantity = quantity;
        UnitPrice = unitPrice;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateQuantity(int newQuantity)
    {
        if (newQuantity <= 0)
            throw new ArgumentException("Quantity must be greater than zero", nameof(newQuantity));

        Quantity = newQuantity;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdatePrice(decimal newUnitPrice)
    {
        if (newUnitPrice < 0)
            throw new ArgumentException("Unit price cannot be negative", nameof(newUnitPrice));

        UnitPrice = newUnitPrice;
        UpdatedAt = DateTime.UtcNow;
    }
}
