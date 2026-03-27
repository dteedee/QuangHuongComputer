using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// SerialNumber – Theo dõi serial/IMEI từng sản phẩm cá thể
/// Essential for electronics retail: warranty tracking, anti-counterfeit, return handling
/// </summary>
public class SerialNumber : Entity<Guid>
{
    public string Serial { get; private set; } = string.Empty;
    public Guid ProductId { get; private set; }
    public Guid? WarehouseId { get; private set; }
    public SerialStatus Status { get; private set; }

    // Traceability
    public Guid? PurchaseOrderId { get; private set; }
    public Guid? OrderId { get; private set; } // Sales order that sold this unit
    public Guid? WorkOrderId { get; private set; } // Repair work order
    public string? CustomerId { get; private set; } // Customer who bought this unit

    // Warranty
    public DateTime? WarrantyStartDate { get; private set; }
    public DateTime? WarrantyEndDate { get; private set; }
    public int WarrantyMonths { get; private set; }

    // Metadata
    public string? ProductName { get; private set; }
    public string? ProductSku { get; private set; }
    public string? Notes { get; private set; }
    public DateTime? SoldAt { get; private set; }
    public DateTime? ReceivedAt { get; private set; }
    public DateTime? ReturnedAt { get; private set; }

    protected SerialNumber() { }

    public SerialNumber(
        string serial,
        Guid productId,
        Guid? warehouseId = null,
        Guid? purchaseOrderId = null,
        string? productName = null,
        string? productSku = null,
        int warrantyMonths = 12)
    {
        Id = Guid.NewGuid();
        Serial = serial;
        ProductId = productId;
        WarehouseId = warehouseId;
        PurchaseOrderId = purchaseOrderId;
        ProductName = productName;
        ProductSku = productSku;
        WarrantyMonths = warrantyMonths;
        Status = SerialStatus.InStock;
        ReceivedAt = DateTime.UtcNow;
    }

    public void Sell(Guid orderId, string? customerId = null)
    {
        if (Status != SerialStatus.InStock && Status != SerialStatus.Reserved)
            throw new InvalidOperationException($"Cannot sell serial {Serial}: current status is {Status}");

        Status = SerialStatus.Sold;
        OrderId = orderId;
        CustomerId = customerId;
        SoldAt = DateTime.UtcNow;
        WarrantyStartDate = DateTime.UtcNow;
        WarrantyEndDate = DateTime.UtcNow.AddMonths(WarrantyMonths);
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reserve(Guid orderId)
    {
        if (Status != SerialStatus.InStock)
            throw new InvalidOperationException($"Cannot reserve serial {Serial}: current status is {Status}");

        Status = SerialStatus.Reserved;
        OrderId = orderId;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ReleaseReservation()
    {
        if (Status != SerialStatus.Reserved)
            throw new InvalidOperationException($"Cannot release serial {Serial}: current status is {Status}");

        Status = SerialStatus.InStock;
        OrderId = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Return(string? notes = null)
    {
        if (Status != SerialStatus.Sold)
            throw new InvalidOperationException($"Cannot return serial {Serial}: current status is {Status}");

        Status = SerialStatus.Returned;
        ReturnedAt = DateTime.UtcNow;
        Notes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkDefective(string? notes = null)
    {
        Status = SerialStatus.Defective;
        Notes = notes ?? Notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SendForRepair(Guid workOrderId)
    {
        Status = SerialStatus.InRepair;
        WorkOrderId = workOrderId;
        UpdatedAt = DateTime.UtcNow;
    }

    public void CompleteRepair()
    {
        if (Status != SerialStatus.InRepair)
            throw new InvalidOperationException($"Serial {Serial} is not in repair");

        Status = SerialStatus.InStock;
        WorkOrderId = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void TransferWarehouse(Guid newWarehouseId)
    {
        WarehouseId = newWarehouseId;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsUnderWarranty()
    {
        return WarrantyEndDate.HasValue && WarrantyEndDate.Value > DateTime.UtcNow;
    }

    public void UpdateNotes(string? notes)
    {
        Notes = notes;
        UpdatedAt = DateTime.UtcNow;
    }
}

public enum SerialStatus
{
    InStock,    // Trong kho
    Reserved,   // Đã đặt trước
    Sold,       // Đã bán
    Returned,   // Hàng trả lại
    Defective,  // Lỗi / hỏng
    InRepair,   // Đang sửa chữa
    Scrapped    // Đã thanh lý
}
