using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

/// <summary>
/// Một DÒNG THU TIỀN của đơn hàng (tender line). Một đơn có thể có nhiều dòng: POS thu tiền mặt
/// 2 triệu + quẹt thẻ phần còn lại; đơn online đặt cọc rồi trả nốt khi nhận hàng.
///
/// Vì sao là bảng riêng chứ không phải cột trên <c>Orders</c>: một cột <c>PaymentMethod</c> duy nhất
/// không diễn đạt được thanh toán tách (split tender), không lưu được tiền thối, và không cho phép
/// đối soát từng lần thu với sao kê ngân hàng.
///
/// Bảng do W2-3 tạo; W2-10 (POS) và W2-23 (vòng đời đơn) là bên ghi.
/// </summary>
public class OrderPayment : Entity<Guid>
{
    public Guid OrderId { get; private set; }

    /// <summary>Hình thức thu: Cash, Card, Transfer, SePay, VNPay, MoMo, ZaloPay, Credit, LoyaltyPoints.</summary>
    public PaymentTenderMethod Method { get; private set; }

    /// <summary>Số tiền GHI NHẬN vào đơn (không tính phần tiền thối).</summary>
    public decimal Amount { get; private set; }

    /// <summary>Số tiền khách đưa — chỉ có ý nghĩa với tiền mặt.</summary>
    public decimal TenderedAmount { get; private set; }

    /// <summary>Tiền thối = <see cref="TenderedAmount"/> − <see cref="Amount"/>, không bao giờ âm.</summary>
    public decimal ChangeAmount { get; private set; }

    /// <summary>Mã đối soát: mã giao dịch cổng, số sao kê, số hợp đồng trả góp, mã ca POS.</summary>
    public string? Reference { get; private set; }

    /// <summary>Ca bán hàng (POS) để cuối ca đối soát két.</summary>
    public Guid? ShiftId { get; private set; }

    /// <summary>Người thu tiền.</summary>
    public string? ReceivedBy { get; private set; }

    public DateTime ReceivedAt { get; private set; }

    /// <summary>Dòng thu bị huỷ/hoàn — giữ lại để soi vết, không xoá.</summary>
    public bool IsReversed { get; private set; }
    public Guid? ReversalOf { get; private set; }
    public string? Notes { get; private set; }

    public OrderPayment(
        Guid orderId,
        PaymentTenderMethod method,
        decimal amount,
        decimal tenderedAmount = 0m,
        string? reference = null,
        Guid? shiftId = null,
        string? receivedBy = null,
        DateTime? receivedAt = null,
        string? notes = null)
    {
        if (amount <= 0m)
            throw new ArgumentException("Số tiền thu phải lớn hơn 0", nameof(amount));

        Id = Guid.NewGuid();
        OrderId = orderId;
        Method = method;
        Amount = amount;
        TenderedAmount = tenderedAmount < amount ? amount : tenderedAmount;
        ChangeAmount = TenderedAmount - amount;
        Reference = reference;
        ShiftId = shiftId;
        ReceivedBy = receivedBy;
        ReceivedAt = receivedAt ?? DateTime.UtcNow;
        Notes = notes;
    }

    protected OrderPayment() { }

    /// <summary>Đánh dấu dòng thu đã bị hoàn/huỷ và trỏ về dòng thu gốc.</summary>
    public void MarkReversed(Guid originalPaymentId, string? reason = null)
    {
        IsReversed = true;
        ReversalOf = originalPaymentId;
        Notes = reason ?? Notes;
        UpdatedAt = DateTime.UtcNow;
    }
}

/// <summary>Hình thức thu tiền của một dòng tender.</summary>
public enum PaymentTenderMethod
{
    Cash = 0,
    Card = 1,
    Transfer = 2,
    SePay = 3,
    VNPay = 4,
    MoMo = 5,
    ZaloPay = 6,
    /// <summary>D10 — bán công nợ: ghi nợ khách, thu sau theo <c>Orders.PaymentDueDate</c>.</summary>
    Credit = 7,
    Installment = 8,
    LoyaltyPoints = 9,
}
