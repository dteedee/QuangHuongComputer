using BuildingBlocks.Endpoints;
using BuildingBlocks.SharedKernel;

namespace Repair.Domain;

/// <summary>
/// Linh kiện dùng cho phiếu sửa. Hai loại:
/// <list type="bullet">
/// <item>Lấy từ kho: <see cref="InventoryItemId"/> có giá trị ⇒ giữ/xuất/nhả hàng qua IStockLedger.</item>
/// <item>Mua ngoài (bought-in): <see cref="InventoryItemId"/> = null, có mô tả + giá vốn
///   <see cref="UnitCost"/> + giá bán — KHÔNG BAO GIỜ chạm sổ kho.</item>
/// </list>
/// </summary>
public class WorkOrderPart : Entity<Guid>
{
    public const int MaxSerialLength = 100;

    public Guid WorkOrderId { get; private set; }
    public Guid? InventoryItemId { get; private set; }
    public string PartName { get; private set; } = string.Empty;
    public string? PartNumber { get; private set; }
    public string? SerialNumber { get; private set; }
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    /// <summary>Giá vốn/đơn vị của linh kiện mua ngoài (VND nguyên). Null với hàng trong kho (giá vốn nằm ở Inventory).</summary>
    public decimal? UnitCost { get; private set; }
    public decimal TotalPrice => Quantity * UnitPrice;

    /// <summary>Mua ngoài, không qua kho ⇒ không gọi IStockLedger.</summary>
    public bool IsBoughtIn => InventoryItemId is null;

    public WorkOrder? WorkOrder { get; private set; }

    protected WorkOrderPart() { }

    public WorkOrderPart(
        Guid workOrderId,
        Guid? inventoryItemId,
        string partName,
        int quantity,
        decimal unitPrice,
        string? partNumber = null,
        string? serialNumber = null,
        decimal? unitCost = null)
    {
        if (quantity <= 0)
            throw new ArgumentException("Quantity must be greater than zero", nameof(quantity));
        if (unitPrice < 0)
            throw new ArgumentException("Unit price cannot be negative", nameof(unitPrice));
        if (string.IsNullOrWhiteSpace(partName))
            throw new RequestValidationException("partName", "Vui lòng nhập tên/mô tả linh kiện.");
        if (inventoryItemId is null && unitCost is null)
            throw new RequestValidationException("unitCost", "Linh kiện mua ngoài phải có giá vốn.");
        if (unitCost < 0)
            throw new RequestValidationException("unitCost", "Giá vốn không được âm.");
        if (serialNumber?.Trim().Length > MaxSerialLength)
            throw new RequestValidationException("serialNumber", $"Số serial tối đa {MaxSerialLength} ký tự.");

        Id = Guid.NewGuid();
        WorkOrderId = workOrderId;
        InventoryItemId = inventoryItemId;
        PartName = partName.Trim();
        PartNumber = partNumber;
        SerialNumber = string.IsNullOrWhiteSpace(serialNumber) ? null : serialNumber.Trim();
        Quantity = quantity;
        UnitPrice = unitPrice;
        UnitCost = inventoryItemId is null ? unitCost : null;
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
