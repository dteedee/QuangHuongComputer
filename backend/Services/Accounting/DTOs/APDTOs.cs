using Accounting.Domain;

namespace Accounting.DTOs;

/// <summary>
/// DTOs for Accounts Payable (AP) operations
/// </summary>

public record APInvoiceListDto(
    Guid Id,
    string InvoiceNumber,
    Guid SupplierId,
    DateTime IssueDate,
    DateTime DueDate,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal OutstandingAmount,
    InvoiceStatus Status,
    AgingBucket AgingBucket,
    Currency Currency,
    Guid? PurchaseOrderId = null,
    Guid? GoodsReceiptId = null);

public record APInvoiceDetailDto(
    Guid Id,
    string InvoiceNumber,
    Guid SupplierId,
    DateTime IssueDate,
    DateTime DueDate,
    decimal SubTotal,
    decimal VatRate,
    decimal VatAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal OutstandingAmount,
    InvoiceStatus Status,
    AgingBucket AgingBucket,
    Currency Currency,
    string? Notes,
    Guid? PurchaseOrderId,
    Guid? GoodsReceiptId,
    List<InvoiceLineDto> Lines,
    List<PaymentApplicationDto> PaymentApplications);

public record CreateAPInvoiceRequest(
    Guid SupplierId,
    DateTime DueDate,
    decimal VatRate,
    Currency Currency,
    Guid? PurchaseOrderId = null,
    Guid? GoodsReceiptId = null,
    string? Notes = null,
    List<CreateInvoiceLineRequest> Lines = null!);

public record CreateInvoiceLineRequest(
    string Description,
    decimal Quantity,
    decimal UnitPrice,
    decimal VatRate = 0);

public record APAgingSummaryDto(
    decimal Current,
    decimal Days1To30,
    decimal Days31To60,
    decimal Days61To90,
    decimal Over90Days,
    decimal TotalPayable);

public record APSupplierSummaryDto(
    Guid SupplierId,
    string SupplierName,
    int InvoiceCount,
    decimal TotalPayable,
    decimal OverdueAmount,
    APAgingSummaryDto Aging);
