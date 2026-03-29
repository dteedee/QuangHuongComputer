using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

public class PurchaseOrder : Entity<Guid>
{
    public string PONumber { get; private set; }
    public Guid SupplierId { get; private set; }
    public POStatus Status { get; private set; }
    public decimal TotalAmount { get; private set; }
    public List<PurchaseOrderItem> Items { get; private set; } = new();

    public PurchaseOrder(Guid supplierId, List<PurchaseOrderItem> items)
    {
        Id = Guid.NewGuid();
        PONumber = $"PO-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";
        SupplierId = supplierId;
        Status = POStatus.Draft;
        Items = items;
        TotalAmount = items.Sum(i => i.Quantity * i.UnitPrice);
    }

    protected PurchaseOrder() { }

    public void Send()
    {
        if (Status != POStatus.Draft)
            throw new InvalidOperationException("Chỉ đơn nháp mới có thể gửi.");
        Status = POStatus.Sent;
    }

    public void ReceiveAll()
    {
        if (Status != POStatus.Sent && Status != POStatus.PartialReceived)
            throw new InvalidOperationException("Chỉ đơn đã gửi mới có thể nhận hàng.");
        Status = POStatus.Received;
    }

    public void Cancel()
    {
        if (Status == POStatus.Received || Status == POStatus.Cancelled)
            throw new InvalidOperationException("Không thể hủy đơn này.");
        Status = POStatus.Cancelled;
    }
}

public class PurchaseOrderItem
{
    public Guid ProductId { get; private set; }
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public string ProductName { get; private set; } // It might be nice to store ProductName

    public PurchaseOrderItem(Guid productId, int quantity, decimal unitPrice)
    {
        ProductId = productId;
        Quantity = quantity;
        UnitPrice = unitPrice;
    }

    protected PurchaseOrderItem() { }
}
