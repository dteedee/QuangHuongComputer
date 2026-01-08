namespace Sales.Domain;

/// <summary>
/// Order Status Flow (Business Requirement):
/// Draft → Confirmed → Paid → Fulfilled → Completed
/// Any status can go to → Cancelled
/// </summary>
public enum OrderStatus
{
    Draft = 0,          // Cart/initial creation
    Confirmed = 1,      // Customer confirmed, stock reserved
    Paid = 2,           // Payment received/verified
    Fulfilled = 3,      // Shipped/delivered
    Completed = 4,      // Fully completed (paid + fulfilled)
    Cancelled = 99,     // Cancelled at any stage
    
    // Legacy statuses for backward compatibility
    Pending = 0,        // Same as Draft
    Processing = 1,     // Same as Confirmed
    Shipped = 3,        // Same as Fulfilled
    Delivered = 4       // Same as Completed
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
