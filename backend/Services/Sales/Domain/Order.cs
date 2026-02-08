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
    
    // Phase 1: Enhanced fields
    public string? CustomerIp { get; private set; }
    public string? CustomerUserAgent { get; private set; }
    public string? InternalNotes { get; private set; } // Ghi chú nội bộ
    public Guid? SourceId { get; private set; } // Website, POS, Mobile
    public Guid? AffiliateId { get; private set; } // Nếu có affiliate
    public string? DiscountReason { get; private set; }
    public string? DeliveryTrackingNumber { get; private set; }
    public string? DeliveryCarrier { get; private set; }
    public int RetryCount { get; private set; }
    public string? FailureReason { get; private set; }
    
    // Timestamps
    public DateTime OrderDate { get; private set; }
    public DateTime? ConfirmedAt { get; private set; }
    public DateTime? ShippedAt { get; private set; }
    public DateTime? DeliveredAt { get; private set; }
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
        string? notes = null,
        string? customerIp = null,
        string? customerUserAgent = null,
        Guid? sourceId = null)
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
        CustomerIp = customerIp;
        CustomerUserAgent = customerUserAgent;
        SourceId = sourceId;
        OrderDate = DateTime.UtcNow;
        TaxRate = taxRate; // Snapshot tax rate
        RetryCount = 0;
        
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

    public void ApplyCoupon(string couponCode, decimal discountAmount, string couponSnapshot, string? discountReason = null)
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("Cannot apply coupon to non-draft order");

        CouponCode = couponCode;
        DiscountAmount = discountAmount;
        CouponSnapshot = couponSnapshot; // Store coupon details for audit
        DiscountReason = discountReason;
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
    
    public void MarkAsShipped(string trackingNumber, string carrier)
    {
        if (Status == OrderStatus.Cancelled)
            throw new InvalidOperationException("Cannot ship cancelled order");

        Status = OrderStatus.Shipped;
        ShippedAt = DateTime.UtcNow;
        DeliveryTrackingNumber = trackingNumber;
        DeliveryCarrier = carrier;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void MarkAsDelivered()
    {
        if (Status != OrderStatus.Shipped)
            throw new InvalidOperationException("Can only mark shipped orders as delivered");

        Status = OrderStatus.Delivered;
        DeliveredAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
        
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
    
    public void AddInternalNote(string note)
    {
        InternalNotes = string.IsNullOrWhiteSpace(InternalNotes) 
            ? note 
            : $"{InternalNotes}\n{DateTime.UtcNow:yyyy-MM-dd HH:mm}: {note}";
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void IncrementRetryCount(string? failureReason = null)
    {
        RetryCount++;
        FailureReason = failureReason;
        UpdatedAt = DateTime.UtcNow;
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
    public string? ProductSku { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal? OriginalPrice { get; private set; }
    public int Quantity { get; private set; }
    public decimal DiscountAmount { get; private set; }
    public decimal LineTotal { get; private set; }

    public OrderItem(Guid productId, string productName, decimal unitPrice, int quantity, string? productSku = null, decimal? originalPrice = null)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        ProductName = productName;
        ProductSku = productSku;
        UnitPrice = unitPrice;
        OriginalPrice = originalPrice;
        Quantity = quantity;
        DiscountAmount = 0;
        LineTotal = unitPrice * quantity;
    }

    protected OrderItem() { }
    
    public void ApplyDiscount(decimal discountAmount)
    {
        DiscountAmount = discountAmount;
        LineTotal = (UnitPrice * Quantity) - discountAmount;
    }
}
