using Accounting.Domain;

namespace Accounting.DTOs;

/// <summary>
/// DTOs for Accounts Receivable (AR) operations
/// </summary>

public record ARInvoiceListDto(
    Guid Id,
    string InvoiceNumber,
    Guid? CustomerId,
    Guid? OrganizationAccountId,
    DateTime IssueDate,
    DateTime DueDate,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal OutstandingAmount,
    InvoiceStatus Status,
    AgingBucket AgingBucket,
    Currency Currency);

public record ARInvoiceDetailDto(
    Guid Id,
    string InvoiceNumber,
    Guid? CustomerId,
    Guid? OrganizationAccountId,
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
    List<InvoiceLineDto> Lines,
    List<PaymentApplicationDto> PaymentApplications);

public record InvoiceLineDto(
    Guid Id,
    string Description,
    decimal Quantity,
    decimal UnitPrice,
    decimal VatRate,
    decimal LineTotal,
    decimal VatAmount);

public record PaymentApplicationDto(
    Guid Id,
    Guid PaymentIntentId,
    Guid InvoiceId,
    decimal Amount,
    DateTime AppliedAt,
    string? Notes);

public record ApplyPaymentRequest(
    Guid PaymentIntentId,
    decimal Amount,
    string? Notes = null);

public record ARAgingSummaryDto(
    decimal Current,
    decimal Days1To30,
    decimal Days31To60,
    decimal Days61To90,
    decimal Over90Days,
    decimal TotalOutstanding);

public record ARCustomerSummaryDto(
    Guid CustomerId,
    string CustomerName,
    int InvoiceCount,
    decimal TotalOutstanding,
    decimal OverdueAmount,
    ARAgingSummaryDto Aging);
