using Accounting.Domain;
using Accounting.Infrastructure;
using BuildingBlocks.Documents;
using BuildingBlocks.TaxEngine;
using BuildingBlocks.Time;
using VietnameseTaxEngine = BuildingBlocks.TaxEngine.VietnameseTaxEngine;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Accounting.Application.Invoicing;

/// <summary>
/// Lập giấy báo có (điều chỉnh giảm) khi đơn bị huỷ sau thanh toán, được hoàn tiền, hoặc trả hàng.
///
/// Số chứng từ: dãy <c>inv</c> với tiền tố <c>CN/</c> (<c>CN/INV-202609-00042</c>).
/// <see cref="DocumentNumberTypes"/> đã bị W1-3 đóng băng và chưa có loại "giấy báo có";
/// xin thêm loại <c>cn</c> đã được ghi vào integration-requests-w2 (W2-14 #2). Không tự đẻ
/// dãy số mới trong module vì như thế là quay lại đúng cái bug W1-3 vừa dẹp.
/// </summary>
public class CreditNoteService
{
    private readonly AccountingDbContext _db;
    private readonly IDocumentNumberService _documentNumbers;
    private readonly IBusinessClock _clock;
    private readonly ILogger<CreditNoteService> _logger;

    public CreditNoteService(
        AccountingDbContext db,
        IDocumentNumberService documentNumbers,
        IBusinessClock clock,
        ILogger<CreditNoteService> logger)
    {
        _db = db;
        _documentNumbers = documentNumbers;
        _clock = clock;
        _logger = logger;
    }

    /// <summary>
    /// Tạo và phát hành giấy báo có cho một đơn hàng. Trả về <c>null</c> khi
    /// <paramref name="sourceKey"/> đã tồn tại (sự kiện phát lại) hoặc số tiền bằng 0.
    /// </summary>
    public async Task<CreditNote?> IssueForOrderAsync(
        string sourceKey,
        Guid orderId,
        Guid? customerId,
        decimal grossAmount,
        CreditNoteReason reasonCode,
        string reason,
        CancellationToken ct = default,
        // Hoá đơn LẬP TAY không có OrderId (Invoice.OrderId là Guid?). Trước đây endpoint truyền
        // orderId = Guid.Empty, service tra hoá đơn theo OrderId nên KHÔNG tìm thấy gì, và vì toàn
        // bộ khối chặn trần nằm trong `if (invoice is not null)` nên nó bị bỏ qua hoàn toàn:
        // ghi giảm được N lần × giá trị hoá đơn, VAT đầu ra không bao giờ được ghi giảm
        // (ResolveRate(0,0,0) = 0), và giấy báo có không trỏ về hoá đơn gốc.
        // Truyền invoiceId để tra thẳng theo hoá đơn.
        Guid? invoiceId = null)
    {
        if (grossAmount <= 0)
        {
            _logger.LogInformation("Bỏ qua giấy báo có {SourceKey}: số tiền bằng 0.", sourceKey);
            return null;
        }

        if (await _db.CreditNotes.AsNoTracking().AnyAsync(c => c.SourceKey == sourceKey, ct))
        {
            _logger.LogInformation("Giấy báo có {SourceKey} đã tồn tại — bỏ qua.", sourceKey);
            return null;
        }

        var hasOrder = orderId != Guid.Empty;
        var invoice = await _db.Invoices.AsNoTracking()
            .Where(i => invoiceId.HasValue
                ? i.Id == invoiceId.Value
                : hasOrder && i.OrderId == orderId && i.Type == InvoiceType.Receivable)
            .Select(i => new { i.Id, i.InvoiceNumber, i.VatRate, i.SubTotal, i.VatAmount, i.TotalAmount })
            .FirstOrDefaultAsync(ct);

        // CHẶN GHI GIẢM QUÁ HOÁ ĐƠN. Tổng mọi giấy báo có của một đơn không bao giờ được
        // vượt giá trị hoá đơn gốc: vượt là ghi giảm doanh thu/thuế đầu ra nhiều hơn số đã ghi
        // tăng. Đây là lớp chặn cuối cho mọi đường phát sinh (sự kiện chồng lấn, phát lại với
        // khoá mới, thao tác tay), độc lập với chống trùng theo SourceKey.
        // Không xác định được hoá đơn gốc thì TỪ CHỐI, không phát hành mù: không có hoá đơn thì
        // không có trần để chặn và không có thuế suất để ghi giảm VAT.
        if (invoice is null)
        {
            _logger.LogWarning(
                "Bỏ qua giấy báo có {SourceKey}: không tìm thấy hoá đơn gốc (invoiceId={InvoiceId}, orderId={OrderId}).",
                sourceKey, invoiceId, orderId);
            return null;
        }

        {
            var invId = invoice.Id;
            var alreadyCredited = await _db.CreditNotes.AsNoTracking()
                .Where(c => c.Status != CreditNoteStatus.Cancelled
                            && (c.OriginalInvoiceId == invId || (hasOrder && c.OrderId == orderId)))
                .SumAsync(c => c.Amount, ct);

            var allowance = invoice.TotalAmount - alreadyCredited;
            if (allowance <= 0m)
            {
                _logger.LogWarning(
                    "Bỏ qua giấy báo có {SourceKey}: đơn {OrderId} đã được ghi giảm đủ {Credited}/{Total}.",
                    sourceKey, orderId, alreadyCredited, invoice.TotalAmount);
                return null;
            }

            if (grossAmount > allowance)
            {
                _logger.LogWarning(
                    "Giấy báo có {SourceKey} yêu cầu {Requested} nhưng đơn {OrderId} chỉ còn ghi giảm được {Allowance} — cắt về mức còn lại.",
                    sourceKey, grossAmount, orderId, allowance);
                grossAmount = allowance;
            }
        }

        // Thuế suất dùng để tách VAT của khoản điều chỉnh: lấy thuế suất của hoá đơn gốc;
        // hoá đơn nhiều thuế suất (VatRate = 0) thì suy ra thuế suất BÌNH QUÂN thực tế của nó,
        // vì đó mới là tỷ lệ thuế đã thực sự kê khai trên số tiền này.
        var rate = ResolveRate(invoice.VatRate, invoice.SubTotal, invoice.VatAmount);
        var extracted = VietnameseTaxEngine.ExtractVat(grossAmount, rate);

        var nowUtc = _clock.UtcNow.UtcDateTime;
        var number = "CN/" + await _documentNumbers.NextAsync(DocumentNumberTypes.Invoice, ct);

        var note = CreditNote.Create(
            creditNoteNumber: number,
            sourceKey: sourceKey,
            type: CreditNoteType.Credit,
            reasonCode: reasonCode,
            reason: reason,
            grossAmount: grossAmount,
            netAmount: extracted.PriceBeforeVat,
            vatAmount: extracted.VatAmount,
            vatRatePercent: rate <= 0m ? 0m : Math.Round(rate * 100m, 2),
            issueDate: nowUtc,
            businessDate: _clock.TodayVn,
            originalInvoiceId: invoice.Id,
            originalInvoiceNumber: invoice.InvoiceNumber,
            orderId: hasOrder ? orderId : null,
            customerId: customerId);

        note.Issue(nowUtc);
        _db.CreditNotes.Add(note);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (
            ex.InnerException?.Message.Contains("IX_CreditNotes_SourceKey_Unique", StringComparison.OrdinalIgnoreCase) == true)
        {
            _db.Entry(note).State = EntityState.Detached;
            _logger.LogInformation("Giấy báo có {SourceKey} vừa được một consumer khác tạo — bỏ qua.", sourceKey);
            return null;
        }

        _logger.LogInformation(
            "Giấy báo có {Number} cho đơn {OrderId}: {Amount} VND ({Reason}).",
            note.CreditNoteNumber, orderId, grossAmount, reasonCode);

        return note;
    }

    private static decimal ResolveRate(decimal invoiceVatRatePercent, decimal subTotal, decimal vatAmount)
    {
        if (invoiceVatRatePercent > 0m) return invoiceVatRatePercent / 100m;
        if (subTotal > 0m && vatAmount > 0m) return Math.Round(vatAmount / subTotal, 4);
        return 0m;
    }
}
