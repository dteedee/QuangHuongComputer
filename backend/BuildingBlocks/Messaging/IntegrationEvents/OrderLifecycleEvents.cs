namespace BuildingBlocks.Messaging.IntegrationEvents;

// phase-14 (W1-5) step 3: contracts for the order lifecycle wave-2 modules need. Defined here so
// every consumer is built against one fixed shape before 40+ later tracks start (Overview: "one
// broker config, a working outbox, one queued sender" - this file is the "sender" side's payload
// contract). NONE of these five are published yet - Sales only raises PaymentSucceededEvent /
// OrderFulfilledEvent today (see PaymentEvents.cs). Wiring the actual Publish() calls on the real
// Order status transitions is wave-2 domain work (this track's Risk Assessment: "leave business
// logic to wave 2" - Order does not yet have BuyerInvoiceInfo/UnitName/VatRate to fill these with
// real data; that migration is W2-3/phase-21).

/// <summary>D07: buyer legal/invoice snapshot. Travels WITH the event - a consumer must never
/// query back across modules for it (Requirements: "the consumer must never query back across
/// modules for invoice data").</summary>
public record BuyerInvoiceInfo(
    string BuyerType, // "Individual" | "Company" | "PublicUnit"
    string? BuyerLegalName,
    string BuyerFullName,
    string? BuyerTaxCode,
    string? BuyerBudgetUnitCode,
    string? BuyerAddress,
    string? BuyerEmail,
    string? BuyerPhone);

/// <summary>D01: one invoice-facing order line - VAT-inclusive, post discount-allocation.</summary>
public record InvoiceLineDto(
    string Sku,
    string Name,
    int Qty,
    decimal PayableGross,
    string UnitName,
    decimal VatStatutoryRate,
    bool VatReductionEligible,
    decimal DiscountAmount,
    bool IsGift,
    IReadOnlyList<string> Serials);

/// <summary>D01: the shipping fee as its own invoice line (it carries VAT too).</summary>
public record ShippingLineDto(decimal PayableGross, decimal VatStatutoryRate);

public record OrderConfirmedEvent(Guid OrderId, Guid CustomerId, string OrderNumber, decimal TotalAmount, DateTime OccurredOn);

public record OrderPaidEvent(
    Guid OrderId,
    Guid CustomerId,
    string OrderNumber,
    IReadOnlyList<InvoiceLineDto> Items,
    ShippingLineDto Shipping,
    BuyerInvoiceInfo Buyer,
    DateOnly OrderBusinessDate,
    DateTime OccurredOn);

public record OrderShippedEvent(
    Guid OrderId,
    Guid CustomerId,
    string OrderNumber,
    BuyerInvoiceInfo Buyer,
    string? TrackingNumber,
    DateTime OccurredOn);

public record OrderDeliveredEvent(
    Guid OrderId,
    Guid CustomerId,
    string OrderNumber,
    IReadOnlyList<InvoiceLineDto> Items,
    ShippingLineDto Shipping,
    BuyerInvoiceInfo Buyer,
    DateOnly OrderBusinessDate,
    DateTime OccurredOn);

public record OrderCompletedEvent(Guid OrderId, Guid CustomerId, string OrderNumber, DateTime OccurredOn);

public record OrderCancelledEvent(Guid OrderId, Guid CustomerId, string OrderNumber, string Reason, DateTime OccurredOn);
