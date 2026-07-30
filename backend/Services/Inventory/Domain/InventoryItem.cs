using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

public class InventoryItem : Entity<Guid>
{
    public Guid ProductId { get; private set; }
    public Guid? WarehouseId { get; private set; }
    public int QuantityOnHand { get; private set; }
    public int ReorderLevel { get; private set; }
    
    // Phase 1: Enhanced fields
    public string? Location { get; private set; } // Vị trí trong kho (A1-01)
    public string? Barcode { get; private set; }
    public string? BatchNumber { get; private set; }
    public DateTime? ManufacturingDate { get; private set; }
    public DateTime? ExpiryDate { get; private set; }
    public int ReservedQuantity { get; private set; }
    public decimal AverageCost { get; private set; }
    public DateTime? LastStockUpdate { get; private set; }
    public int LowStockThreshold { get; private set; } = 5;
    public string? InternalNotes { get; private set; }
    public int ReorderPoint { get; set; } = 5;
    public int ReorderQuantity { get; set; } = 20;
    
    public int AvailableQuantity => QuantityOnHand - ReservedQuantity;

    public InventoryItem(
        Guid productId, 
        int initialQuantity, 
        int reorderLevel = 5,
        Guid? warehouseId = null,
        string? location = null,
        string? barcode = null,
        string? batchNumber = null,
        decimal averageCost = 0)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        WarehouseId = warehouseId;
        QuantityOnHand = initialQuantity;
        ReorderLevel = reorderLevel;
        LowStockThreshold = reorderLevel;
        Location = location;
        Barcode = barcode;
        BatchNumber = batchNumber;
        AverageCost = averageCost;
        ReservedQuantity = 0;
        LastStockUpdate = DateTime.UtcNow;
    }

    protected InventoryItem() { }

    public void AdjustStock(int quantity, string? notes = null)
    {
        QuantityOnHand += quantity;
        LastStockUpdate = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(notes)) InternalNotes = notes;
    }
    
    public void ReserveStock(int quantity)
    {
        // Chặn số lượng âm — trước đây cho -5 làm ReservedQuantity âm,
        // AvailableQuantity phồng lên -> bán vượt tồn kho thật.
        if (quantity < 0)
            throw new ArgumentException("Số lượng giữ chỗ không được âm", nameof(quantity));

        if (AvailableQuantity < quantity)
            throw new InvalidOperationException($"Not enough available stock. Available: {AvailableQuantity}, Requested: {quantity}");

        ReservedQuantity += quantity;
        LastStockUpdate = DateTime.UtcNow;
    }

    public void ReleaseReservedStock(int quantity)
    {
        if (quantity < 0)
            throw new ArgumentException("Số lượng nhả giữ chỗ không được âm", nameof(quantity));

        if (ReservedQuantity < quantity)
        {
            // Gracefully handle out-of-sync reservations by capping
            quantity = ReservedQuantity;
        }

        ReservedQuantity -= quantity;
        LastStockUpdate = DateTime.UtcNow;
    }

    public void ConfirmReservedStock(int quantity)
    {
        if (quantity < 0)
            throw new ArgumentException("Số lượng xác nhận xuất kho không được âm", nameof(quantity));

        // Không cho xác nhận nhiều hơn phần đã giữ chỗ:
        // đây là dấu hiệu dữ liệu lệch (reservation/OrderItem không khớp) — phải THROW để nghiệp vụ biết.
        if (quantity > ReservedQuantity)
            throw new InvalidOperationException(
                $"Không thể xác nhận {quantity}, chỉ còn {ReservedQuantity} đang giữ chỗ");

        // Tồn kho vật lý không được âm.
        if (quantity > QuantityOnHand)
            throw new InvalidOperationException(
                $"Không thể xác nhận {quantity}, tồn thực chỉ còn {QuantityOnHand}");

        ReservedQuantity -= quantity;
        QuantityOnHand -= quantity;
        LastStockUpdate = DateTime.UtcNow;
    }

    public bool NeedsReorder() => QuantityOnHand <= LowStockThreshold;
    public bool IsLowStock() => QuantityOnHand <= LowStockThreshold;
    
    public void UpdateAverageCost(decimal newCost)
    {
        // Weighted average cost calculation
        if (QuantityOnHand > 0)
        {
            AverageCost = ((AverageCost * QuantityOnHand) + (newCost * 1)) / (QuantityOnHand + 1);
        }
        else
        {
            AverageCost = newCost;
        }
    }
    
    public void UpdateLocation(string location)
    {
        Location = location;
    }
    
    public void SetLowStockThreshold(int threshold)
    {
        LowStockThreshold = threshold;
    }
}
