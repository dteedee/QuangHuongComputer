using BuildingBlocks.SharedKernel;

namespace BuildingBlocks.Messaging.IntegrationEvents;

public record PaymentSucceededEvent(Guid PaymentId, Guid OrderId, decimal Amount, DateTime OccurredOn);
public record PaymentFailedEvent(Guid PaymentId, Guid OrderId, string Reason, DateTime OccurredOn);

public record InvoiceRequestedEvent(Guid OrderId, Guid CustomerId, List<InvoiceItemDto> Items, decimal TotalAmount);
public record InvoiceItemDto(Guid ProductId, string ProductName, int Quantity, decimal UnitPrice);

public record OrderFulfilledEvent(Guid OrderId, Guid CustomerId, List<FulfilledItemDto> Items);
public record FulfilledItemDto(Guid ProductId, int Quantity, List<string> SerialNumbers);

// Purchasing/Inventory Events
public record POReceivedEvent(
    Guid POId,
    string PONumber,
    Guid SupplierId,
    Guid? GoodsReceiptId,
    List<POItemDto> Items,
    decimal TotalAmount,
    DateTime ReceivedAt);

public record POItemDto(
    Guid ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal VatRate);

// Payroll Events
public record PayrollPaidIntegrationEvent(
    Guid PayrollId,
    Guid EmployeeId,
    string EmployeeName,
    int Month,
    int Year,
    decimal GrossPay,
    decimal NetPay,
    DateTime PaidAt);
