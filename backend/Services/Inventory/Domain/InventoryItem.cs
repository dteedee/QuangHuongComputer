using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

public class InventoryItem : Entity<Guid>
{
    public Guid ProductId { get; private set; }
    // Biến thể sản phẩm — nullable.
    // null = tồn tổng của sản phẩm không có biến thể.
    // NOT null = tồn của 1 biến thể cụ thể (cùng ProductId có thể có nhiều dòng).
    public Guid? VariantId { get; private set; }
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
        : this(productId, variantId: null, initialQuantity, reorderLevel, warehouseId,
               location, barcode, batchNumber, averageCost)
    {
    }

    // Overload có variantId — cùng ProductId + VariantId + WarehouseId là 1 dòng duy nhất.
    public InventoryItem(
        Guid productId,
        Guid? variantId,
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
        VariantId = variantId;
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

    /// <summary>
    /// Tổng giá trị vốn tồn kho tại thời điểm hiện tại (báo cáo tài chính).
    /// </summary>
    public decimal TotalCostValue => QuantityOnHand * AverageCost;

    /// <summary>
    /// [Deprecated] Cập nhật giá vốn cho 1 đơn vị nhập. Giữ lại để backward-compat.
    /// Ưu tiên dùng ApplyPurchase(int addedQty, decimal totalAddedCost) — phản ánh
    /// đúng bình quân gia quyền cho lô nhập N đơn vị.
    /// </summary>
    public void UpdateAverageCost(decimal newCost)
    {
        if (QuantityOnHand > 0)
        {
            AverageCost = ((AverageCost * QuantityOnHand) + (newCost * 1)) / (QuantityOnHand + 1);
        }
        else
        {
            AverageCost = newCost;
        }
    }

    /// <summary>
    /// Áp dụng nhập kho theo bình quân gia quyền:
    ///   newAvg = (oldQty × oldAvg + addedQty × unitCost) / (oldQty + addedQty)
    /// addedQty và unitCost đã bao gồm phần landed cost đã phân bổ (nếu có).
    /// KHÔNG tự AdjustStock — caller phải gọi AdjustStock trước hoặc sau tuỳ nghiệp vụ,
    /// tách hai trách nhiệm giúp test rõ.
    /// </summary>
    public void ApplyPurchase(int addedQty, decimal unitCost)
    {
        if (addedQty <= 0)
            throw new ArgumentException("Số lượng nhập phải dương", nameof(addedQty));
        if (unitCost < 0)
            throw new ArgumentException("Giá vốn không được âm", nameof(unitCost));

        var oldQty = QuantityOnHand;
        var newQty = oldQty + addedQty;
        AverageCost = newQty > 0
            ? ((oldQty * AverageCost) + (addedQty * unitCost)) / newQty
            : 0m;
        QuantityOnHand = newQty;
        LastStockUpdate = DateTime.UtcNow;
    }

    /// <summary>
    /// Ép đặt giá vốn trung bình sau khi phân bổ landed cost cho lô đã nhập.
    /// Dùng khi cost landed đến MUỘN hơn nhập kho — điều chỉnh cost mà không thay tồn.
    /// </summary>
    public void OverrideAverageCost(decimal newAverageCost)
    {
        if (newAverageCost < 0)
            throw new ArgumentException("Giá vốn không được âm", nameof(newAverageCost));
        AverageCost = newAverageCost;
        LastStockUpdate = DateTime.UtcNow;
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
