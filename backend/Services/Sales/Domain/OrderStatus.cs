namespace Sales.Domain;

/// <summary>
/// Order Status Flow (Business Requirement):
/// Draft → Confirmed → Paid → Fulfilled → Completed
/// Any status can go to → Cancelled
/// </summary>
public enum OrderStatus
{
    Pending = 0,        // Submitted but waiting for confirmation
    Confirmed = 1,      // Customer confirmed, stock reserved
    Paid = 2,           // Payment received/verified
    Fulfilled = 3,      // Fulfillment process started
    Completed = 4,      // Fully completed
    
    Shipped = 5,        // Handed to carrier
    Delivered = 6,      // Customer received it
    Draft = 7,          // Cart/initial creation
    
    Cancelled = 99,     // Cancelled at any stage
    
    // Legacy statuses for mapping
    Processing = Confirmed
}

/// <summary>
/// Payment Status - separate from Order Status
/// </summary>
public enum PaymentStatus
{
    Pending,
    PartiallyPaid,
    Paid,
    Refunded,
    Failed
}

/// <summary>
/// Fulfillment Status - separate from Order Status
/// </summary>
public enum FulfillmentStatus
{
    Pending,
    PartiallyFulfilled,
    Fulfilled,
    Returned
}
