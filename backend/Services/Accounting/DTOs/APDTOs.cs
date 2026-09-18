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

/// <summary>
/// Lập hoá đơn mua vào bằng tay. Không còn trường <c>Currency</c> (luôn VND theo D01) và không
/// còn <c>VatRate</c> cấp hoá đơn — thuế suất thuộc về TỪNG DÒNG, vì một lần nhập hàng có thể
/// gồm nhiều nhóm thuế suất khác nhau.
/// </summary>
public record CreateAPInvoiceRequest(
    Guid SupplierId,
    DateTime DueDate,
    List<CreateInvoiceLineRequest> Lines,
    Guid? PurchaseOrderId = null,
    Guid? GoodsReceiptId = null,
    string? Notes = null);

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

/// <param name="PaymentMethod">Tên phương thức thanh toán (Cash, BankTransfer, ...).</param>
public record ApplyAPPaymentRequest(decimal Amount, string PaymentMethod, string? Reference = null);
