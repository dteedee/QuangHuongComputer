using Repair.Domain;

namespace Repair.Application.Quotes;

/// <summary>Báo giá gửi cho client (backoffice, khách duyệt, bản in) — mọi số do server tính.</summary>
public sealed record RepairQuoteDto(
    Guid Id,
    string QuoteNumber,
    Guid WorkOrderId,
    string Status,
    decimal SubtotalAmount,
    decimal LineDiscountTotal,
    decimal DiscountAmount,
    decimal NetAmount,
    decimal VatAmount,
    decimal VatRate,
    decimal PartsCost,
    decimal LaborCost,
    decimal ServiceFee,
    decimal TotalCost,
    decimal EstimatedHours,
    decimal HourlyRate,
    string? Description,
    string? Notes,
    DateTime ValidUntil,
    DateTime? ApprovedAt,
    DateTime? RejectedAt,
    string? RejectionReason,
    DateTime CreatedAt,
    bool IsExpired,
    IReadOnlyList<RepairQuoteLineDto> Lines);

public sealed record RepairQuoteLineDto(
    Guid? Id,
    int Sequence,
    string Kind,
    string Description,
    Guid? InventoryItemId,
    Guid? ProductId,
    Guid? ServiceTypeId,
    decimal Quantity,
    decimal UnitPrice,
    decimal LineDiscount,
    decimal GrossAmount,
    decimal AllocatedDiscount,
    decimal LineTotal,
    decimal VatRate,
    decimal NetAmount,
    decimal VatAmount);

/// <summary>Kết quả "xem trước" khi đang soạn báo giá — cùng phép tính, không lưu.</summary>
public sealed record RepairQuotePreviewDto(
    decimal SubtotalAmount,
    decimal LineDiscountTotal,
    decimal DiscountAmount,
    decimal DiscountTotal,
    decimal NetAmount,
    decimal VatAmount,
    decimal VatRate,
    decimal PartsCost,
    decimal LaborCost,
    decimal ServiceFee,
    decimal TotalCost,
    IReadOnlyList<RepairQuoteLineDto> Lines);

public static class RepairQuoteDtoMapper
{
    public static RepairQuoteDto ToDto(RepairQuote q) => new(
        q.Id, q.QuoteNumber, q.WorkOrderId, q.Status.ToString(),
        q.SubtotalAmount, q.LineDiscountTotal, q.DiscountAmount, q.NetAmount, q.VatAmount, q.VatRate,
        q.PartsCost, q.LaborCost, q.ServiceFee, q.TotalCost,
        q.EstimatedHours, q.HourlyRate, q.Description, q.Notes,
        q.ValidUntil, q.ApprovedAt, q.RejectedAt, q.RejectionReason, q.CreatedAt, q.IsExpired(),
        q.Lines.OrderBy(l => l.Sequence).Select(l => new RepairQuoteLineDto(
            l.Id, l.Sequence, l.Kind.ToString(), l.Description, l.InventoryItemId, l.ProductId, l.ServiceTypeId,
            l.Quantity, l.UnitPrice, l.LineDiscount, l.GrossAmount, l.AllocatedDiscount, l.LineTotal,
            l.VatRate, l.NetAmount, l.VatAmount)).ToList());

    public static RepairQuotePreviewDto ToPreview(IReadOnlyList<RepairQuoteLineDraft> drafts, RepairQuotePricing p) => new(
        p.SubtotalAmount, p.LineDiscountTotal, p.QuoteDiscount, p.DiscountTotal, p.NetAmount, p.VatAmount, p.VatRate,
        p.PartsTotal, p.LaborTotal, p.ServiceTotal, p.TotalAmount,
        drafts.Select((d, i) => new RepairQuoteLineDto(
            null, i + 1, d.Kind.ToString(), d.Description.Trim(), d.InventoryItemId, d.ProductId, d.ServiceTypeId,
            d.Quantity, d.UnitPrice, d.LineDiscount, p.LineAmounts[i].GrossAmount, p.LineAmounts[i].AllocatedDiscount,
            p.LineAmounts[i].LineTotal, p.LineAmounts[i].VatRate, p.LineAmounts[i].NetAmount, p.LineAmounts[i].VatAmount)).ToList());
}
