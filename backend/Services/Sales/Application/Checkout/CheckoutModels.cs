namespace Sales.Application.Checkout;

/// <summary>
/// Yêu cầu chốt đơn — CHUNG cho web, khách vãng lai, POS và chuyển báo giá.
///
/// Cố ý KHÔNG có trường tiền nào do client quyết định: không <c>UnitPrice</c>, không
/// <c>Total</c>, không <c>ShippingFee</c> ở luồng khách. Ba trường đó từng cho phép khách
/// POST giá 0đ cho hàng 27 triệu. Giá đến từ <see cref="IOrderPriceSource"/>, giảm giá từ
/// <c>PricingEngine</c>, phí ship từ chính sách phía server.
/// </summary>
public sealed record CheckoutRequest
{
    public required Guid CartId { get; init; }
    public CheckoutChannel Channel { get; init; } = CheckoutChannel.Web;

    /// <summary>Chủ đơn. Null ở kênh Guest.</summary>
    public Guid? CustomerId { get; init; }

    /// <summary>Định danh khách vãng lai (cookie) — bắt buộc ở kênh Guest.</summary>
    public string? AnonymousId { get; init; }

    public string? GuestEmail { get; init; }
    public string? GuestPhone { get; init; }

    public required ShippingInfo Shipping { get; init; }
    public PaymentMethodChoice PaymentMethod { get; init; } = PaymentMethodChoice.COD;
    public string[]? PromotionCodes { get; init; }
    public Guid? CheckoutSessionId { get; init; }

    /// <summary>D07 — khách tick "Xuất hoá đơn công ty".</summary>
    public BuyerInvoiceRequest? BuyerInvoice { get; init; }

    /// <summary>D08 — phiên bản điều khoản khách đã chấp nhận.</summary>
    public string? TermsVersion { get; init; }

    // ===== Chỉ kênh POS (W2-10), đòi quyền Sales.Pos ở tầng endpoint =====
    public Guid? StoreId { get; init; }
    public Guid? ShiftId { get; init; }
    public Guid? CashierId { get; init; }

    /// <summary>Giảm giá tay của nhân viên. Bị chặn ở mọi kênh trừ POS và bị cap ở tạm tính.</summary>
    public decimal? ManualDiscount { get; init; }
    public string? ManualDiscountReason { get; init; }
    public string? ApprovedBy { get; init; }

    /// <summary>D10 — chỉ kênh Quotation.</summary>
    public Guid? QuotationId { get; init; }
    public int? PaymentTermDays { get; init; }

    /// <summary>Địa chỉ IP / user-agent để soi vết đơn gian lận.</summary>
    public string? CustomerIp { get; init; }
    public string? CustomerUserAgent { get; init; }
}

/// <summary>D07 — khối người mua do client gửi lên; được validate lại ở domain trước khi lưu.</summary>
public sealed record BuyerInvoiceRequest(
    bool InvoiceRequested,
    string? BuyerType,
    string? LegalName,
    string? FullName,
    string? TaxCode,
    string? BudgetUnitCode,
    string? Address,
    string? Email,
    string? Phone);

/// <summary>Thông tin giao hàng. <c>ShippingFee</c> do server tính, không nhận từ khách.</summary>
public sealed record ShippingInfo(
    string RecipientName,
    string Phone,
    string? StreetAddress,
    string? Ward,
    string? District,
    string? Province,
    decimal ShippingFee,
    bool IsPickup = false,
    string? PickupStoreId = null,
    string? PickupStoreName = null,
    string? Notes = null)
{
    public string FormatFull()
    {
        if (IsPickup) return PickupStoreName ?? "Nhận tại cửa hàng";
        return string.Join(", ", new[] { StreetAddress, Ward, District, Province }
            .Where(x => !string.IsNullOrWhiteSpace(x)));
    }
}

public enum PaymentMethodChoice
{
    COD = 0,
    VNPay = 1,
    MoMo = 2,
    ZaloPay = 3,
    SePay = 4,
    Installment = 5,
    Cash = 6,
    Card = 7,
    Transfer = 8,
    /// <summary>D10 — bán công nợ, thu sau theo hạn thanh toán.</summary>
    Credit = 9,
}

/// <summary>Kết quả chốt đơn.</summary>
public sealed class CheckoutResult
{
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public Guid? OrderId { get; init; }
    public string? OrderNumber { get; init; }
    public decimal? TotalAmount { get; init; }
    public decimal? TaxAmount { get; init; }
    public string? OrderStatus { get; init; }
    public bool RequiresPaymentGateway { get; init; }

    public static CheckoutResult Failure(string reason) => new() { Success = false, ErrorMessage = reason };

    public static CheckoutResult SuccessResult(
        Guid orderId,
        string orderNumber,
        decimal totalAmount,
        decimal taxAmount,
        string orderStatus,
        bool requiresPaymentGateway) => new()
    {
        Success = true,
        OrderId = orderId,
        OrderNumber = orderNumber,
        TotalAmount = totalAmount,
        TaxAmount = taxAmount,
        OrderStatus = orderStatus,
        RequiresPaymentGateway = requiresPaymentGateway,
    };
}
