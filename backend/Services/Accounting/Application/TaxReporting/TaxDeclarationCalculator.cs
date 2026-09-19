using Accounting.Domain;
using Accounting.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Application.TaxReporting;

/// <summary>
/// W4-5 / H3 — số liệu lên tờ khai 01/GTGT và báo cáo TNDN.
///
/// Hai chỗ sai trước đây, cả hai đều làm khai VỐNG:
///  1. các truy vấn chỉ lọc `Type` + khoảng ngày, KHÔNG lọc `Status` ⇒ hoá đơn **nháp** (chưa
///     phát hành, chưa phải chứng từ) và hoá đơn **đã huỷ** vẫn vào doanh thu và thuế đầu ra;
///  2. **giấy báo có** (hoá đơn điều chỉnh giảm do trả hàng / huỷ đơn / hoàn tiền) không xuất hiện
///     ở bất kỳ đâu ⇒ doanh thu và thuế đầu ra không bao giờ được đảo lại.
///
/// Quy ước kỳ: giấy báo có được kê vào kỳ **phát hành chính nó** (`CreditNote.IssueDate`), theo
/// thông lệ kê khai hoá đơn điều chỉnh, chứ không hồi tố về kỳ của hoá đơn gốc. Đây là câu hỏi
/// mở #3 của bản rà soát W4-5 — nếu kế toán chốt khác thì chỉ đổi đúng bộ lọc trong file này.
/// </summary>
public static class TaxDeclarationCalculator
{
    /// <summary>Hoá đơn ĐƯỢC kê khai: đã là chứng từ (khác Draft) và chưa bị huỷ.</summary>
    public static IQueryable<Invoice> Declarable(
        this IQueryable<Invoice> invoices, InvoiceType type, DateTime start, DateTime end)
        => invoices.Where(i =>
            i.Type == type
            && i.Status != InvoiceStatus.Draft
            && i.Status != InvoiceStatus.Cancelled
            && i.IssueDate >= start
            && i.IssueDate < end);

    /// <summary>Giấy báo có/báo nợ ĐƯỢC kê khai: đã phát hành, chưa huỷ, theo kỳ phát hành của chính nó.</summary>
    public static IQueryable<CreditNote> DeclarableAdjustments(
        this IQueryable<CreditNote> notes, DateTime start, DateTime end)
        => notes.Where(c =>
            c.Status == CreditNoteStatus.Issued
            && c.IssueDate >= start
            && c.IssueDate < end);

    /// <summary>Báo CÓ làm GIẢM doanh thu/thuế đầu ra; báo NỢ làm TĂNG.</summary>
    public static int Sign(CreditNoteType type) => type == CreditNoteType.Credit ? -1 : 1;

    public sealed record VatDeclaration(
        int OutputInvoiceCount,
        decimal OutputRevenue,
        decimal OutputVat,
        int AdjustmentCount,
        decimal AdjustmentRevenue,
        decimal AdjustmentVat,
        int InputInvoiceCount,
        decimal InputVat)
    {
        /// <summary>Doanh thu chưa VAT sau điều chỉnh.</summary>
        public decimal NetRevenue => OutputRevenue + AdjustmentRevenue;

        /// <summary>Thuế đầu ra sau điều chỉnh.</summary>
        public decimal NetOutputVat => OutputVat + AdjustmentVat;

        public decimal VatPayable => NetOutputVat - InputVat;
    }

    public static async Task<VatDeclaration> BuildVatDeclarationAsync(
        AccountingDbContext db, DateTime start, DateTime end, CancellationToken ct = default)
    {
        var outputInvoices = await db.Invoices
            .Declarable(InvoiceType.Receivable, start, end)
            .Select(i => new { i.VatAmount, i.TotalAmount })
            .ToListAsync(ct);

        var adjustments = await db.CreditNotes
            .DeclarableAdjustments(start, end)
            .Select(c => new { c.Type, c.NetAmount, c.VatAmount })
            .ToListAsync(ct);

        var inputInvoices = await db.Invoices
            .Declarable(InvoiceType.Payable, start, end)
            .Select(i => new { i.VatAmount })
            .ToListAsync(ct);

        return new VatDeclaration(
            OutputInvoiceCount: outputInvoices.Count,
            OutputRevenue: outputInvoices.Sum(i => i.TotalAmount - i.VatAmount),
            OutputVat: outputInvoices.Sum(i => i.VatAmount),
            AdjustmentCount: adjustments.Count,
            AdjustmentRevenue: adjustments.Sum(a => Sign(a.Type) * a.NetAmount),
            AdjustmentVat: adjustments.Sum(a => Sign(a.Type) * a.VatAmount),
            InputInvoiceCount: inputInvoices.Count,
            InputVat: inputInvoices.Sum(i => i.VatAmount));
    }

    /// <summary>Doanh thu tính thuế TNDN của một năm: hoá đơn bán ra hợp lệ trừ điều chỉnh giảm.</summary>
    public static async Task<decimal> BuildCitRevenueAsync(
        AccountingDbContext db, DateTime start, DateTime end, CancellationToken ct = default)
    {
        var revenue = await db.Invoices
            .Declarable(InvoiceType.Receivable, start, end)
            .SumAsync(i => i.SubTotal, ct);

        var adjustments = await db.CreditNotes
            .DeclarableAdjustments(start, end)
            .Select(c => new { c.Type, c.NetAmount })
            .ToListAsync(ct);

        return revenue + adjustments.Sum(a => Sign(a.Type) * a.NetAmount);
    }
}
