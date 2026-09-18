using BuildingBlocks.SharedKernel;

namespace Accounting.Domain;

/// <summary>
/// Giấy báo có / báo nợ (điều chỉnh giảm hoặc tăng một hoá đơn đã phát hành).
///
/// W2-14: trước đây đây chỉ là một cái vỏ rỗng (5 thuộc tính public set, không có DbSet,
/// không ai tạo ra nó) nên huỷ đơn sau khi đã thu tiền, hoàn tiền và trả hàng đều KHÔNG
/// để lại chứng từ kế toán nào. Nay là một aggregate thật, có số chứng từ, có trạng thái,
/// và có <see cref="SourceKey"/> để sự kiện phát lại không đẻ ra hai giấy báo có.
/// </summary>
public class CreditNote : AggregateRoot<Guid>
{
    public string CreditNoteNumber { get; private set; } = string.Empty;

    public Guid? OriginalInvoiceId { get; private set; }

    /// <summary>Số hoá đơn gốc (ảnh chụp, để in ra vẫn đọc được khi hoá đơn gốc bị đổi số).</summary>
    public string? OriginalInvoiceNumber { get; private set; }

    public Guid? OrderId { get; private set; }
    public Guid? CustomerId { get; private set; }

    public CreditNoteType Type { get; private set; }
    public CreditNoteReason ReasonCode { get; private set; }
    public CreditNoteStatus Status { get; private set; } = CreditNoteStatus.Draft;

    /// <summary>Tổng tiền điều chỉnh, ĐÃ gồm VAT.</summary>
    public decimal Amount { get; private set; }

    /// <summary>Phần tiền hàng chưa gồm VAT.</summary>
    public decimal NetAmount { get; private set; }

    public decimal VatAmount { get; private set; }

    /// <summary>Thuế suất theo PHẦN TRĂM.</summary>
    public decimal VatRate { get; private set; }

    public string Reason { get; private set; } = string.Empty;
    public DateTime IssueDate { get; private set; }
    public DateOnly? BusinessDate { get; private set; }

    /// <summary>
    /// Khoá chống trùng: "<c>&lt;nguồn&gt;:&lt;id&gt;</c>", ví dụ <c>return:8f1c...</c>.
    /// Có unique index — consumer phát lại sẽ đụng khoá và bỏ qua.
    /// </summary>
    public string SourceKey { get; private set; } = string.Empty;

    public string? EInvoiceId { get; private set; }

    protected CreditNote() { }

    public static CreditNote Create(
        string creditNoteNumber,
        string sourceKey,
        CreditNoteType type,
        CreditNoteReason reasonCode,
        string reason,
        decimal grossAmount,
        decimal netAmount,
        decimal vatAmount,
        decimal vatRatePercent,
        DateTime issueDate,
        DateOnly businessDate,
        Guid? originalInvoiceId = null,
        string? originalInvoiceNumber = null,
        Guid? orderId = null,
        Guid? customerId = null)
    {
        if (grossAmount <= 0)
            throw new ArgumentException("Số tiền điều chỉnh phải lớn hơn 0.", nameof(grossAmount));
        if (string.IsNullOrWhiteSpace(sourceKey))
            throw new ArgumentException("Thiếu khoá nguồn chống trùng.", nameof(sourceKey));

        return new CreditNote
        {
            Id = Guid.NewGuid(),
            CreditNoteNumber = creditNoteNumber,
            SourceKey = sourceKey,
            Type = type,
            ReasonCode = reasonCode,
            Reason = reason,
            Amount = grossAmount,
            NetAmount = netAmount,
            VatAmount = vatAmount,
            VatRate = vatRatePercent,
            IssueDate = issueDate,
            BusinessDate = businessDate,
            OriginalInvoiceId = originalInvoiceId,
            OriginalInvoiceNumber = originalInvoiceNumber,
            OrderId = orderId,
            CustomerId = customerId,
            Status = CreditNoteStatus.Draft
        };
    }

    public void Issue(DateTime issuedAt)
    {
        if (Status != CreditNoteStatus.Draft)
            throw new InvalidOperationException("Chỉ giấy báo có ở trạng thái nháp mới phát hành được.");
        Status = CreditNoteStatus.Issued;
        IssueDate = issuedAt;
    }

    public void Cancel(string reason)
    {
        if (Status == CreditNoteStatus.Cancelled)
            throw new InvalidOperationException("Giấy báo có đã bị huỷ.");
        Status = CreditNoteStatus.Cancelled;
        Reason = $"{Reason}\nHuỷ: {reason}";
    }
}

public enum CreditNoteType
{
    /// <summary>Báo CÓ — điều chỉnh GIẢM số phải thu của khách.</summary>
    Credit,

    /// <summary>Báo NỢ — điều chỉnh TĂNG số phải thu của khách.</summary>
    Debit
}

public enum CreditNoteStatus { Draft, Issued, Cancelled }

/// <summary>Lý do lập giấy báo có — quyết định cách lên tờ khai và cách hiển thị cho kế toán.</summary>
public enum CreditNoteReason
{
    OrderCancelled,
    Refund,
    Return,
    PriceAdjustment,
    Other
}
