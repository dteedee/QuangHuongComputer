using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

public class Order : Entity<Guid>
{
    public string OrderNumber { get; private set; } = string.Empty;
    public Guid CustomerId { get; private set; }
    public OrderStatus Status { get; private set; }
    public PaymentStatus PaymentStatus { get; private set; }
    public FulfillmentStatus FulfillmentStatus { get; private set; }
    
    public List<OrderItem> Items { get; private set; } = new();
    
    // Price Snapshot (BUSINESS REQUIREMENT: Frozen at order time)
    public decimal SubtotalAmount { get; private set; }
    public decimal DiscountAmount { get; private set; }
    public decimal TaxAmount { get; private set; }
    public decimal ShippingAmount { get; private set; }
    public decimal TotalAmount { get; private set; }
    public decimal TaxRate { get; private set; } // Snapshot of tax rate at order time
    
    // Coupon Snapshot (BUSINESS REQUIREMENT: Audit trail)
    public string? CouponCode { get; private set; }
    public string? CouponSnapshot { get; private set; } // JSON snapshot of coupon details
    
    public string ShippingAddress { get; private set; } = string.Empty;
    public string? Notes { get; private set; }
    
    // Timestamps
    public DateTime OrderDate { get; private set; }
    public DateTime? ConfirmedAt { get; private set; }
    public DateTime? PaidAt { get; private set; }
    public DateTime? FulfilledAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public DateTime? CancelledAt { get; private set; }
    public string? CancellationReason { get; private set; }

    public Order(
        Guid customerId, 
        string shippingAddress, 
        List<OrderItem> items,
        decimal taxRate = 0.1m,
        string? notes = null)
    {
        if (items == null || !items.Any())
            throw new ArgumentException("Order must have at least one item");

        Id = Guid.NewGuid();
        OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Id.ToString().Substring(0, 8).ToUpper()}";
        CustomerId = customerId;
        Status = OrderStatus.Draft;
        PaymentStatus = PaymentStatus.Pending;
        FulfillmentStatus = FulfillmentStatus.Pending;
        Items = items;
        ShippingAddress = shippingAddress;
        Notes = notes;
        OrderDate = DateTime.UtcNow;
        TaxRate = taxRate; // Snapshot tax rate
        
        CalculateAmounts();
    }

    protected Order() { }

    private void CalculateAmounts()
    {
        // BUSINESS REQUIREMENT: Consistent calculation order
        // Final Price = Subtotal - Discount + Tax + Shipping
        SubtotalAmount = Items.Sum(i => i.UnitPrice * i.Quantity);
        TaxAmount = (SubtotalAmount - DiscountAmount) * TaxRate;
        TotalAmount = SubtotalAmount - DiscountAmount + TaxAmount + ShippingAmount;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ApplyCoupon(string couponCode, decimal discountAmount, string couponSnapshot)
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("Cannot apply coupon to non-draft order");

        CouponCode = couponCode;
        DiscountAmount = discountAmount;
        CouponSnapshot = couponSnapshot; // Store coupon details for audit
        CalculateAmounts();
    }

    public void SetShippingAmount(decimal amount)
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("Cannot change shipping on non-draft order");

        ShippingAmount = amount;
        CalculateAmounts();
    }

    public void AddItem(Guid productId, string productName, decimal unitPrice, int quantity)
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("Cannot add items to non-draft order");

        var item = new OrderItem(productId, productName, unitPrice, quantity);
        Items.Add(item);
        CalculateAmounts();
    }

    public void RemoveItem(Guid itemId)
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("Cannot remove items from non-draft order");

        var item = Items.FirstOrDefault(i => i.Id == itemId);
        if (item != null)
        {
            Items.Remove(item);
            CalculateAmounts();
        }
    }

    // BUSINESS REQUIREMENT: Proper state transitions
    public void Confirm()
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException($"Cannot confirm order in status {Status}");

        Status = OrderStatus.Confirmed;
        ConfirmedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
        
        // Raise domain event for stock reservation
        RaiseDomainEvent(new OrderConfirmedDomainEvent(Id, Items.Select(i => new OrderItemDto(i.ProductId, i.Quantity)).ToList()));
    }

    public void MarkAsPaid(string paymentReference)
    {
        if (Status == OrderStatus.Cancelled)
            throw new InvalidOperationException("Cannot mark cancelled order as paid");

        PaymentStatus = PaymentStatus.Paid;
        
        // If confirmed, move to Paid status
        if (Status == OrderStatus.Confirmed)
        {
            Status = OrderStatus.Paid;
            PaidAt = DateTime.UtcNow;
        }
        
        UpdatedAt = DateTime.UtcNow;
        
        // Check if we can complete the order
        TryComplete();
    }

    public void MarkAsFulfilled()
    {
        if (Status == OrderStatus.Cancelled)
            throw new InvalidOperationException("Cannot fulfill cancelled order");

        FulfillmentStatus = FulfillmentStatus.Fulfilled;
        
        if (Status == OrderStatus.Paid)
        {
            Status = OrderStatus.Fulfilled;
            FulfilledAt = DateTime.UtcNow;
        }
        
        UpdatedAt = DateTime.UtcNow;
        
        // Check if we can complete the order
        TryComplete();
    }

    // BUSINESS REQUIREMENT: Order only Completed when Paid + Fulfilled
    private void TryComplete()
    {
        if (PaymentStatus == PaymentStatus.Paid && FulfillmentStatus == FulfillmentStatus.Fulfilled)
        {
            Status = OrderStatus.Completed;
            CompletedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
            
            RaiseDomainEvent(new OrderCompletedDomainEvent(Id));
        }
    }

    public void Cancel(string reason)
    {
        if (Status == OrderStatus.Completed)
            throw new InvalidOperationException("Cannot cancel completed order");

        Status = OrderStatus.Cancelled;
        CancelledAt = DateTime.UtcNow;
        CancellationReason = reason;
        UpdatedAt = DateTime.UtcNow;
        
        // Raise domain event to release stock reservation
        RaiseDomainEvent(new OrderCancelledDomainEvent(Id, reason));
    }

    // Legacy method for backward compatibility
    public void SetStatus(OrderStatus status)
    {
        Status = status;
        if (status == OrderStatus.Confirmed) ConfirmedAt = DateTime.UtcNow;
        if (status == OrderStatus.Shipped) FulfilledAt = DateTime.UtcNow;
        if (status == OrderStatus.Delivered) CompletedAt = DateTime.UtcNow;
        if (status == OrderStatus.Cancelled) CancelledAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
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
