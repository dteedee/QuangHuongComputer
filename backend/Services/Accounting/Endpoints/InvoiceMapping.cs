using Accounting.Domain;
using Accounting.DTOs;

namespace Accounting.Endpoints;

/// <summary>Ánh xạ Invoice -> DTO. Tách riêng để bốn nhóm endpoint (hoá đơn, AR, AP, in ấn) dùng chung.</summary>
public static class InvoiceMapping
{
    public static InvoiceDetailDto ToDetail(this Invoice i) => new(
        i.Id,
        i.InvoiceNumber,
        i.Type,
        i.Status,
        i.CustomerId,
        i.OrganizationAccountId,
        i.SupplierId,
        i.OrderId,
        i.OrderNumber,
        i.IssueDate,
        i.DueDate,
        i.BusinessDate,
        i.SubTotal,
        i.VatRate,
        i.VatAmount,
        i.TotalAmount,
        i.PaidAmount,
        i.OutstandingAmount,
        i.AgingBucket,
        i.Currency,
        i.Notes,
        new BuyerInfoRequest(
            i.BuyerType, i.BuyerLegalName, i.BuyerFullName, i.BuyerTaxCode,
            i.BuyerBudgetUnitCode, i.BuyerAddress, i.BuyerEmail, i.BuyerPhone),
        i.Lines.Select(ToLine).ToList(),
        i.PaymentApplications
            .Select(pa => new PaymentApplicationDto(pa.Id, pa.PaymentIntentId, pa.InvoiceId, pa.Amount, pa.AppliedAt, pa.Notes))
            .ToList());

    public static InvoiceLineDetailDto ToLine(InvoiceLine l) => new(
        l.Id, l.Description, l.Sku, l.UnitName, l.Quantity, l.UnitPrice, l.VatRate,
        l.GrossBeforeDiscount, l.LineDiscount, l.GrossAmount, l.NetAmount, l.VatAmount,
        l.IsPromotion, l.Note);

    public static CreditNoteDto ToDto(this CreditNote c) => new(
        c.Id, c.CreditNoteNumber, c.Type, c.Status, c.ReasonCode, c.Reason,
        c.Amount, c.NetAmount, c.VatAmount, c.VatRate, c.IssueDate, c.BusinessDate,
        c.OriginalInvoiceId, c.OriginalInvoiceNumber, c.OrderId, c.CustomerId);

    public static CashVoucherDto ToDto(this CashVoucher v) => new(
        v.Id, v.VoucherNumber, v.Kind, v.FundCode, v.Amount, v.SignedAmount,
        v.VoucherDate, v.BusinessDate, v.Description, v.CounterpartyName, v.Source,
        v.ShiftSessionId, v.ExpenseId, v.InvoiceId, v.OrderId);
}
