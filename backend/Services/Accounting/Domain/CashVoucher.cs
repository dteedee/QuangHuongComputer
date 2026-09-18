using BuildingBlocks.SharedKernel;

namespace Accounting.Domain;

/// <summary>
/// Phiếu thu / phiếu chi của SỔ QUỸ TIỀN MẶT.
///
/// Số dư luỹ kế KHÔNG lưu trên từng phiếu: nó được tính khi đọc sổ theo thứ tự
/// (<see cref="VoucherDate"/>, <see cref="CreatedAt"/>). Lưu số dư trên từng dòng nghĩa là
/// mọi lần chèn lùi ngày đều phải ghi lại cả sổ — và chỉ cần một lần ghi hỏng là sổ vênh vĩnh viễn.
/// </summary>
public class CashVoucher : AggregateRoot<Guid>
{
    public string VoucherNumber { get; private set; } = string.Empty;
    public CashVoucherKind Kind { get; private set; }

    /// <summary>Mã quỹ (mỗi cửa hàng một quỹ). Số dư luỹ kế được tính RIÊNG cho từng quỹ.</summary>
    public string FundCode { get; private set; } = string.Empty;

    public decimal Amount { get; private set; }
    public DateTime VoucherDate { get; private set; }
    public DateOnly BusinessDate { get; private set; }

    public string Description { get; private set; } = string.Empty;

    /// <summary>Người nộp/nhận tiền (ghi trên phiếu).</summary>
    public string? CounterpartyName { get; private set; }

    public CashVoucherSource Source { get; private set; }

    public Guid? ShiftSessionId { get; private set; }
    public Guid? ExpenseId { get; private set; }
    public Guid? InvoiceId { get; private set; }
    public Guid? OrderId { get; private set; }

    /// <summary>Khoá chống trùng cho phiếu sinh tự động ("shift-close:&lt;id&gt;", "expense:&lt;id&gt;"...).</summary>
    public string? SourceKey { get; private set; }

    public Guid? CreatedByUserId { get; private set; }

    protected CashVoucher() { }

    public static CashVoucher Create(
        string voucherNumber,
        CashVoucherKind kind,
        string fundCode,
        decimal amount,
        DateTime voucherDate,
        DateOnly businessDate,
        string description,
        CashVoucherSource source,
        string? counterpartyName = null,
        Guid? shiftSessionId = null,
        Guid? expenseId = null,
        Guid? invoiceId = null,
        Guid? orderId = null,
        string? sourceKey = null,
        Guid? createdByUserId = null)
    {
        if (amount <= 0)
            throw new ArgumentException("Số tiền trên phiếu phải lớn hơn 0.", nameof(amount));
        if (string.IsNullOrWhiteSpace(fundCode))
            throw new ArgumentException("Thiếu mã quỹ.", nameof(fundCode));
        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Nội dung phiếu không được để trống.", nameof(description));

        return new CashVoucher
        {
            Id = Guid.NewGuid(),
            VoucherNumber = voucherNumber,
            Kind = kind,
            FundCode = fundCode.Trim().ToUpperInvariant(),
            Amount = amount,
            VoucherDate = voucherDate,
            BusinessDate = businessDate,
            Description = description,
            Source = source,
            CounterpartyName = counterpartyName,
            ShiftSessionId = shiftSessionId,
            ExpenseId = expenseId,
            InvoiceId = invoiceId,
            OrderId = orderId,
            SourceKey = sourceKey,
            CreatedByUserId = createdByUserId
        };
    }

    /// <summary>Dấu của phiếu trong sổ quỹ: thu = +1, chi = −1.</summary>
    public int Sign => Kind == CashVoucherKind.Receipt ? 1 : -1;

    /// <summary>Số tiền có dấu, dùng để cộng dồn số dư.</summary>
    public decimal SignedAmount => Sign * Amount;
}

public enum CashVoucherKind
{
    /// <summary>Phiếu thu.</summary>
    Receipt,

    /// <summary>Phiếu chi.</summary>
    Payment
}

public enum CashVoucherSource
{
    Manual,
    ShiftClose,
    Expense,
    SupplierPayment,
    CustomerDeposit,
    InvoiceSettlement
}
