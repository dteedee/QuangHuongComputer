using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

public class Order : Entity<Guid>
{
    public string OrderNumber { get; private set; } = string.Empty;
    public Guid CustomerId { get; private set; }
    public OrderStatus Status { get; private set; }
    public List<OrderItem> Items { get; private set; } = new();
    public decimal SubtotalAmount { get; private set; }
    public decimal TaxAmount { get; private set; }
    public decimal TotalAmount { get; private set; }
    public string ShippingAddress { get; private set; } = string.Empty;
    public string? Notes { get; private set; }
    public DateTime OrderDate { get; private set; }
    public DateTime? ConfirmedAt { get; private set; }
    public DateTime? ShippedAt { get; private set; }
    public DateTime? DeliveredAt { get; private set; }
    public DateTime? CancelledAt { get; private set; }

    public Order(Guid customerId, string shippingAddress, List<OrderItem> items, string? notes = null)
    {
        Id = Guid.NewGuid();
        OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Id.ToString().Substring(0, 8).ToUpper()}";
        CustomerId = customerId;
        Status = OrderStatus.Pending;
        Items = items;
        ShippingAddress = shippingAddress;
        Notes = notes;
        OrderDate = DateTime.UtcNow;
        
        CalculateAmounts();
    }

    protected Order() { }

    private void CalculateAmounts()
    {
        SubtotalAmount = Items.Sum(i => i.UnitPrice * i.Quantity);
        TaxAmount = SubtotalAmount * 0.1m; // 10% tax
        TotalAmount = SubtotalAmount + TaxAmount;
    }

    public void AddItem(Guid productId, string productName, decimal unitPrice, int quantity)
    {
        var item = new OrderItem(productId, productName, unitPrice, quantity);
        Items.Add(item);
        CalculateAmounts();
    }

    public void SetStatus(OrderStatus status)
    {
        Status = status;
        if (status == OrderStatus.Confirmed) ConfirmedAt = DateTime.UtcNow;
        if (status == OrderStatus.Shipped) ShippedAt = DateTime.UtcNow;
        if (status == OrderStatus.Delivered) DeliveredAt = DateTime.UtcNow;
        if (status == OrderStatus.Cancelled) CancelledAt = DateTime.UtcNow;
    }
}

public class OrderItem : Entity<Guid>
{
    public Guid OrderId { get; private set; }
    public Guid ProductId { get; private set; }
    public string ProductName { get; private set; } = string.Empty;
    public decimal UnitPrice { get; private set; }
    public int Quantity { get; private set; }

    public OrderItem(Guid productId, string productName, decimal unitPrice, int quantity)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        ProductName = productName;
        UnitPrice = unitPrice;
        Quantity = quantity;
    }

    protected OrderItem() { }
}
