namespace Sales.Application.Pos;

/// <summary>
/// Hợp đồng dữ liệu của bán hàng tại quầy (W2-10).
///
/// NGUYÊN TẮC: màn hình POS KHÔNG BAO GIỜ gửi tiền lên. Không <c>unitPrice</c>, không
/// <c>lineTotal</c>, không <c>total</c>. Thu ngân chỉ gửi "bán cái gì, bao nhiêu cái, thu bằng
/// hình thức nào, khách đưa bao nhiêu". Mọi con số tiền do server tính từ giá trong CSDL
/// (<c>IOrderPriceSource</c>) + khuyến mãi (<c>PricingEngine</c>) + VAT theo dòng (D01).
///
/// Ngoại lệ DUY NHẤT là <see cref="PosSaleRequest.ManualDiscount"/> — giảm giá tay của nhân viên,
/// bị chặn trần ở <see cref="PosManualDiscountPolicy"/> và luôn ghi vào <c>OrderHistories</c>.
/// </summary>
public sealed record PosLineRequest(Guid ProductId, int Quantity, Guid? VariantId = null)
{
    /// <summary>Serial của máy giao cho khách (hàng quản lý theo serial). Rỗng với hàng không serial.</summary>
    public IReadOnlyList<string> Serials { get; init; } = Array.Empty<string>();
}

/// <summary>Một lần thu tiền tại quầy. D04: tiền mặt, chuyển khoản VietQR, máy quẹt thẻ.</summary>
/// <param name="Method">Cash | Transfer | Card | SePay.</param>
/// <param name="Amount">Số tiền GHI NHẬN vào đơn (không gồm tiền thối).</param>
/// <param name="TenderedAmount">Tiền khách đưa — chỉ có nghĩa với tiền mặt.</param>
/// <param name="Reference">Mã đối soát: số giao dịch máy POS, mã VietQR, số sao kê.</param>
public sealed record PosTenderRequest(
    string Method,
    decimal Amount,
    decimal TenderedAmount = 0m,
    string? Reference = null);

/// <summary>Tạm tính tại quầy — không ghi gì vào CSDL, không giữ tồn kho.</summary>
public sealed record PosQuoteRequest
{
    public required IReadOnlyList<PosLineRequest> Lines { get; init; }
    public Guid? CustomerId { get; init; }
    public decimal ManualDiscount { get; init; }
    public string[]? PromotionCodes { get; init; }
}

/// <summary>Chốt đơn tại quầy.</summary>
public sealed record PosSaleRequest
{
    public required IReadOnlyList<PosLineRequest> Lines { get; init; }
    public required Guid StoreId { get; init; }
    public Guid? ShiftId { get; init; }

    /// <summary>Khách có tài khoản. Null = khách vãng lai (đơn vẫn xuất được hoá đơn bán lẻ).</summary>
    public Guid? CustomerId { get; init; }
    public string? CustomerName { get; init; }
    public string? CustomerPhone { get; init; }

    public decimal ManualDiscount { get; init; }
    public string? ManualDiscountReason { get; init; }
    /// <summary>Người duyệt giảm giá tay — phải KHÁC thu ngân khi vượt hạn mức tự duyệt.</summary>
    public string? ApprovedBy { get; init; }

    public string[]? PromotionCodes { get; init; }
    public required IReadOnlyList<PosTenderRequest> Tenders { get; init; }
    public string? Notes { get; init; }

    /// <summary>Đơn giữ được gọi ra để chốt — sẽ được đánh dấu đã dùng.</summary>
    public Guid? HeldOrderId { get; init; }
}

/// <summary>Một dòng trong tạm tính, đã có đủ số tiền server tính.</summary>
public sealed record PosQuoteLine(
    Guid ProductId,
    Guid? VariantId,
    string ProductName,
    string? Sku,
    int Quantity,
    decimal UnitPrice,
    decimal GrossBeforeDiscount,
    decimal LineDiscount,
    decimal AllocatedOrderDiscount,
    decimal Payable,
    decimal VatRate,
    decimal VatAmount);

/// <summary>Kết quả tạm tính. <c>Total</c> là con số thu ngân đọc cho khách.</summary>
public sealed record PosQuoteResult(
    IReadOnlyList<PosQuoteLine> Lines,
    decimal Subtotal,
    decimal Discount,
    decimal ManualDiscountApplied,
    decimal TaxAmount,
    decimal Total,
    IReadOnlyList<Sales.Application.Pricing.VatBucket> VatBreakdown,
    IReadOnlyList<string> Warnings);

/// <summary>Kết quả chốt đơn tại quầy.</summary>
public sealed record PosSaleResult(
    Guid OrderId,
    string OrderNumber,
    decimal Total,
    decimal Collected,
    decimal AmountDue,
    decimal ChangeDue,
    string Status,
    string PaymentStatus,
    string FulfillmentStatus,
    bool IsDeposit,
    int LoyaltyPointsEarned);
