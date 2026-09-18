using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

public partial class InventoryItem : Entity<Guid>
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
    
    /// <summary>
    /// W2-5: xuất kho KHÔNG qua giữ chỗ. Không bao giờ để tồn âm và không được ăn vào phần
    /// đang giữ chỗ cho đơn khác — đó là lý do so với <see cref="AvailableQuantity"/> chứ không
    /// phải <see cref="QuantityOnHand"/>.
    /// </summary>
    public void IssueStock(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Số lượng xuất phải dương", nameof(quantity));
        if (AvailableQuantity < quantity)
            throw new InvalidOperationException(
                $"Tồn khả dụng chỉ còn {AvailableQuantity}, không thể xuất {quantity}.");

        QuantityOnHand -= quantity;
        LastStockUpdate = DateTime.UtcNow;
    }

    /// <summary>
    /// W2-5: điều chỉnh có dấu (kiểm kê, phiếu điều chỉnh). Chặn tồn âm và chặn tụt xuống dưới
    /// phần đang giữ chỗ — CSDL có CHECK <c>ReservedQuantity &lt;= QuantityOnHand</c>, để nó nổ ở
    /// tầng DB thì thành 500 chứ không phải thông báo nghiệp vụ.
    /// </summary>
    public void ApplyAdjustment(int delta)
    {
        if (delta == 0)
            throw new ArgumentException("Chênh lệch điều chỉnh phải khác 0", nameof(delta));

        var newQuantity = QuantityOnHand + delta;
        if (newQuantity < 0)
            throw new InvalidOperationException(
                $"Điều chỉnh {delta} làm tồn kho âm (hiện có {QuantityOnHand}).");
        if (newQuantity < ReservedQuantity)
            throw new InvalidOperationException(
                $"Điều chỉnh {delta} làm tồn ({newQuantity}) thấp hơn phần đang giữ chỗ ({ReservedQuantity}).");

        QuantityOnHand = newQuantity;
        LastStockUpdate = DateTime.UtcNow;
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

    public void UpdateLocation(string location)
    {
        Location = location;
    }
    
    public void SetLowStockThreshold(int threshold)
    {
        LowStockThreshold = threshold;
    }
}
