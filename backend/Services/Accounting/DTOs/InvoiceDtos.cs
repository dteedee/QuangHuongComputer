using Accounting.Domain;

namespace Accounting.DTOs;

/// <summary>
/// Lập hoá đơn bán ra thủ công. Không có trường tiền tệ và không có thuế suất:
/// tiền tệ luôn là VND, thuế suất do máy tính thuế resolve theo NGÀY (D01) và hạn thanh toán
/// lấy từ cấu hình <c>Accounting:InvoiceDueDays</c> — ba con số đó từng bị hardcode
/// USD / 10% / 30 ngày ngay trong endpoint.
/// </summary>
public record CreateManualInvoiceRequest(
    Guid? CustomerId,
    Guid? OrganizationAccountId,
    List<ManualInvoiceLineRequest> Lines,
    string? Notes,
    DateTime? DueDate,
    BuyerInfoRequest? Buyer);

/// <param name="UnitPriceIncludingVat">Đơn giá ĐÃ GỒM VAT — đúng như giá niêm yết cho khách.</param>
/// <param name="VatStatutoryRate">Thuế suất LUẬT ĐỊNH theo phần trăm (10). Bỏ trống = 10%.</param>
/// <param name="VatReductionEligible">Có thuộc diện giảm 2 điểm % hay không.</param>
public record ManualInvoiceLineRequest(
    string Description,
    decimal Quantity,
    decimal UnitPriceIncludingVat,
    decimal? VatStatutoryRate = null,
    bool VatReductionEligible = true,
    decimal Discount = 0,
    string? Sku = null,
    string? UnitName = null);

public record BuyerInfoRequest(
    string? BuyerType,
    string? LegalName,
    string? FullName,
    string? TaxCode,
    string? BudgetUnitCode,
    string? Address,
    string? Email,
    string? Phone);

public record UpdateManualInvoiceRequest(
    List<ManualInvoiceLineRequest> Lines,
    string? Notes,
    DateTime? DueDate,
    BuyerInfoRequest? Buyer);

public record CancelInvoiceRequest(string Reason);

public record InvoiceListItemDto(
    Guid Id,
    string InvoiceNumber,
    InvoiceType Type,
    InvoiceStatus Status,
    Guid? CustomerId,
    Guid? SupplierId,
    Guid? OrderId,
    string? OrderNumber,
    DateTime IssueDate,
    DateTime DueDate,
    decimal SubTotal,
    decimal VatAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal OutstandingAmount,
    AgingBucket AgingBucket,
    Currency Currency);

public record InvoiceLineDetailDto(
    Guid Id,
    string Description,
    string? Sku,
    string? UnitName,
    decimal Quantity,
    decimal UnitPrice,
    decimal VatRate,
    decimal GrossBeforeDiscount,
    decimal LineDiscount,
    decimal GrossAmount,
    decimal NetAmount,
    decimal VatAmount,
    bool IsPromotion,
    string? Note);

public record InvoiceDetailDto(
    Guid Id,
    string InvoiceNumber,
    InvoiceType Type,
    InvoiceStatus Status,
    Guid? CustomerId,
    Guid? OrganizationAccountId,
    Guid? SupplierId,
    Guid? OrderId,
    string? OrderNumber,
    DateTime IssueDate,
    DateTime DueDate,
    DateOnly? BusinessDate,
    decimal SubTotal,
    decimal VatRate,
    decimal VatAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal OutstandingAmount,
    AgingBucket AgingBucket,
    Currency Currency,
    string? Notes,
    BuyerInfoRequest Buyer,
    List<InvoiceLineDetailDto> Lines,
    List<PaymentApplicationDto> PaymentApplications);

/// <summary>Thống kê tách ĐÔI phải thu và phải trả — gộp chung là con số vô nghĩa với kế toán.</summary>
public record AccountingStatsDto(
    decimal TotalReceivables,
    decimal TotalPayables,
    decimal OverdueReceivables,
    decimal OverduePayables,
    decimal RevenueToday,
    int TotalReceivableInvoices,
    int TotalPayableInvoices,
    int ActiveAccounts);
