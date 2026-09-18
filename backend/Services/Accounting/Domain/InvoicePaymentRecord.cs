using BuildingBlocks.SharedKernel;

namespace Accounting.Domain;

/// <summary>
/// Một lần thu/chi tiền gắn trực tiếp vào hoá đơn (owned type, bảng <c>Payment</c>).
/// Khác <see cref="PaymentApplication"/>: bản ghi này không tham chiếu tới PaymentIntent
/// của module Payments, dùng cho tiền mặt / chuyển khoản ghi tay.
/// </summary>
public class Payment
{
    public Guid Id { get; private set; }
    public Guid InvoiceId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime PaymentDate { get; private set; }
    public string PaymentReference { get; private set; } = string.Empty;
    public PaymentMethod Method { get; private set; }

    public Payment(Guid invoiceId, decimal amount, string paymentReference, PaymentMethod method, DateTime paidAt)
    {
        Id = Guid.NewGuid();
        InvoiceId = invoiceId;
        Amount = amount;
        PaymentReference = paymentReference;
        Method = method;
        PaymentDate = paidAt;
    }

    protected Payment() { }
}

// ===== Domain events =====

public record InvoiceIssuedEvent(Guid InvoiceId, string InvoiceNumber, decimal TotalAmount, DateTime DueDate) : DomainEvent;

/// <summary>
/// Hoá đơn đã thu đủ. Mang theo <paramref name="OrderId"/> để W2-23 đóng đơn bán công nợ
/// (D10: khoản phải thu của đơn công nợ được ghi nhận lúc GIAO HÀNG, tất toán mới đóng đơn).
/// </summary>
public record InvoicePaidEvent(Guid InvoiceId, string InvoiceNumber, Guid? OrderId, InvoiceType Type) : DomainEvent;

public record InvoiceOverdueEvent(Guid InvoiceId, string InvoiceNumber, DateTime DueDate, decimal RemainingAmount) : DomainEvent;
