using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

public class StockTransfer : Entity<Guid>
{
    public string TransferNumber { get; private set; }
    public Guid FromWarehouseId { get; private set; }
    public Guid ToWarehouseId { get; private set; }
    public TransferStatus Status { get; private set; }
    public DateTime? RequestedAt { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? ShippedAt { get; private set; }
    public DateTime? ReceivedAt { get; private set; }
    public string? Notes { get; private set; }
    public string? RequestedBy { get; private set; }
    public string? ApprovedBy { get; private set; }
    public string? ShippedBy { get; private set; }
    public string? ReceivedBy { get; private set; }
    
    public List<StockTransferItem> Items { get; private set; } = new();

    public StockTransfer(
        string transferNumber,
        Guid fromWarehouseId,
        Guid toWarehouseId,
        List<StockTransferItem> items,
        string? requestedBy = null,
        string? notes = null)
    {
        Id = Guid.NewGuid();
        TransferNumber = transferNumber;
        FromWarehouseId = fromWarehouseId;
        ToWarehouseId = toWarehouseId;
        Items = items;
        RequestedBy = requestedBy;
        Notes = notes;
        Status = TransferStatus.Pending;
        RequestedAt = DateTime.UtcNow;
    }

    protected StockTransfer() { }

    public void Approve(string approvedBy)
    {
        if (Status != TransferStatus.Pending)
            throw new InvalidOperationException($"Can only approve pending transfers. Current status: {Status}");

        Status = TransferStatus.Approved;
        ApprovedAt = DateTime.UtcNow;
        ApprovedBy = approvedBy;
    }

    public void Ship(string shippedBy)
    {
        if (Status != TransferStatus.Approved)
            throw new InvalidOperationException($"Can only ship approved transfers. Current status: {Status}");

        Status = TransferStatus.Shipped;
        ShippedAt = DateTime.UtcNow;
        ShippedBy = shippedBy;
    }

    public void Receive(string receivedBy)
    {
        if (Status != TransferStatus.Shipped)
            throw new InvalidOperationException($"Can only receive shipped transfers. Current status: {Status}");

        Status = TransferStatus.Received;
        ReceivedAt = DateTime.UtcNow;
        ReceivedBy = receivedBy;
    }

    public void Cancel()
    {
        if (Status == TransferStatus.Received)
            throw new InvalidOperationException("Cannot cancel received transfers");

        Status = TransferStatus.Cancelled;
    }
}

public class StockTransferItem : Entity<Guid>
{
    public Guid StockTransferId { get; private set; }
    public Guid InventoryItemId { get; private set; }
    public int Quantity { get; private set; }
    public string? ProductName { get; private set; }
    public string? ProductSku { get; private set; }

    public StockTransferItem(Guid inventoryItemId, int quantity, string? productName = null, string? productSku = null)
    {
        Id = Guid.NewGuid();
        InventoryItemId = inventoryItemId;
        Quantity = quantity;
        ProductName = productName;
        ProductSku = productSku;
    }

    protected StockTransferItem() { }
}

public enum TransferStatus
{
    Pending,
    Approved,
    Shipped,
    Received,
    Cancelled
}
