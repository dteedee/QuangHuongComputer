namespace Sales.Application.Quotations;

/// <summary>DTO cho các endpoint báo giá (W2-19). Tách khỏi service để mỗi file dưới 200 dòng.</summary>
public sealed record CreateQuotationLineRequest(
    Guid ProductId,
    Guid? VariantId,
    int Quantity,
    /// <summary>Đơn giá ghi đè, ĐÃ GỒM VAT. Null = lấy giá niêm yết hiện hành từ Catalog.</summary>
    decimal? UnitPriceOverride,
    /// <summary>Giảm giá dưới giá niêm yết của riêng dòng — gate ở hạn mức duyệt.</summary>
    decimal LineDiscount = 0m,
    string? Notes = null);

public sealed record UpsertQuotationRequest(
    Guid? CustomerId,
    string? CustomerName,
    string? CustomerPhone,
    string? CustomerEmail,
    /// <summary>"Individual" | "Organization" | "BudgetUnit" — khớp D07 <c>BuyerType</c>.</summary>
    string BuyerType,
    string? BuyerLegalName,
    string? BuyerTaxCode,
    string? BuyerBudgetUnitCode,
    string? BuyerAddress,
    /// <summary>Null = mặc định 7 ngày kể từ hôm nay (config <c>Sales:Quotations:DefaultValidityDays</c>).</summary>
    DateTime? ValidUntil,
    int PaymentTermDays,
    string? TermsText,
    string? Notes,
    IReadOnlyList<CreateQuotationLineRequest> Lines);

public sealed record QuotationLineDto(
    Guid Id,
    int Sequence,
    Guid ProductId,
    Guid? VariantId,
    string ProductName,
    string? ProductSku,
    string? UnitName,
    int Quantity,
    decimal UnitPrice,
    decimal LineDiscount,
    decimal VatRate,
    decimal NetAmount,
    decimal VatAmount,
    decimal LineTotal,
    string? Notes);

public sealed record QuotationDto(
    Guid Id,
    string QuotationNumber,
    string Status,
    Guid? CustomerId,
    string? CustomerName,
    string? CustomerPhone,
    string? CustomerEmail,
    string BuyerType,
    string? BuyerLegalName,
    string? BuyerTaxCode,
    string? BuyerBudgetUnitCode,
    string? BuyerAddress,
    decimal SubtotalAmount,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    int PaymentTermDays,
    DateTime? ValidUntil,
    DateTime? AcceptedAt,
    DateTime? ConvertedAt,
    Guid? ConvertedOrderId,
    string? TermsText,
    string? Notes,
    string? CreatedBy,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyList<QuotationLineDto> Lines);

public sealed record QuotationListItemDto(
    Guid Id,
    string QuotationNumber,
    string Status,
    string? CustomerName,
    DateTime? ValidUntil,
    decimal TotalAmount,
    string? CreatedBy,
    DateTime CreatedAt);

public sealed record QuotationListResult(
    IReadOnlyList<QuotationListItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

/// <summary>Yêu cầu chuyển báo giá thành đơn — chỉ những gì Checkout không tự suy ra được.</summary>
public sealed record ConvertQuotationRequest(
    string RecipientName,
    string Phone,
    string? StreetAddress,
    string? Ward,
    string? District,
    string? Province,
    bool IsPickup = false,
    string? PickupStoreId = null,
    string? PickupStoreName = null,
    string? Notes = null);

public sealed record ConvertQuotationResult(
    bool Success,
    string? ErrorMessage,
    Guid? OrderId,
    string? OrderNumber,
    decimal? TotalAmount,
    string? PaymentMethod,
    DateTime? PaymentDueDate);
