using BuildingBlocks.SharedKernel;
using Sales.Application.Pricing;

namespace Sales.Domain;

/// <summary>
/// Đơn hàng — gốc tổng hợp (aggregate root). File này giữ ĐỊNH DANH + TIỀN.
/// Chuyển trạng thái nằm ở <c>OrderTransitions.cs</c> (partial), sở hữu bởi W2-23.
///
/// D01: giá bán ĐÃ GỒM VAT. <c>Total = Σ thành tiền dòng − giảm giá + phí ship ròng</c>; thuế được
/// TÁCH RA theo từng dòng, không bao giờ cộng thêm. <see cref="TaxRate"/> chỉ còn là NHÃN hiển thị
/// (thuế suất nhóm chuẩn tại ngày đặt) và là fallback cho dòng chưa có hồ sơ thuế riêng.
/// </summary>
public partial class Order : Entity<Guid>
{
    public string OrderNumber { get; private set; } = string.Empty;
    public Guid CustomerId { get; private set; }
    public OrderStatus Status { get; private set; }
    public PaymentStatus PaymentStatus { get; private set; }
    public FulfillmentStatus FulfillmentStatus { get; private set; }

    public List<OrderItem> Items { get; private set; } = new();

    // ===== Snapshot tiền — đóng băng tại thời điểm chốt đơn =====
    public decimal SubtotalAmount { get; private set; }
    public decimal DiscountAmount { get; private set; }
    public decimal TaxAmount { get; private set; }
    public decimal ShippingAmount { get; private set; }
    public decimal TotalAmount { get; private set; }

    /// <summary>D01 §4 — chỉ là nhãn hiển thị; KHÔNG còn là nguồn tính thuế của dòng hàng.</summary>
    public decimal TaxRate { get; private set; }

    /// <summary>D01 §3.3 — thuế suất hiệu lực của phí vận chuyển (dòng thuế riêng).</summary>
    public decimal ShippingVatRate { get; private set; }

    /// <summary>D01 §3.3 — tiền thuế tách ra từ phí vận chuyển.</summary>
    public decimal ShippingVatAmount { get; private set; }

    /// <summary>D01 §2 — ngày giao dịch theo giờ VN; hoá đơn resolve lại thuế suất theo ngày lập.</summary>
    public DateOnly BusinessDate { get; private set; }

    // ===== Khuyến mãi =====
    public string? CouponCode { get; private set; }
    public string? CouponSnapshot { get; private set; }
    public string? AppliedPromotionsJson { get; private set; }
    public decimal ShippingDiscount { get; private set; }

    // ===== Giao hàng / liên hệ =====
    public string ShippingAddress { get; private set; } = string.Empty;
    public string? Notes { get; private set; }
    public string PaymentMethod { get; private set; } = "COD";
    public string? CustomerName { get; private set; }
    public string? CustomerEmail { get; private set; }
    public string? CustomerPhone { get; private set; }
    public bool IsPickup { get; private set; }
    public string? PickupStoreId { get; private set; }
    public string? PickupStoreName { get; private set; }

    // ===== D07: khối người mua cho hoá đơn điện tử (owned, cùng bảng Orders) =====
    public BuyerInvoiceInfo BuyerInvoice { get; private set; } = new();

    // ===== Kênh bán (W2-10 POS đọc/ghi) =====
    /// <summary>Web | Guest | Pos | Quotation — kênh tạo đơn, quyết định luồng hậu kiểm.</summary>
    public string Channel { get; private set; } = OrderChannels.Web;
    public Guid? StoreId { get; private set; }
    public Guid? ShiftId { get; private set; }
    public Guid? CashierId { get; private set; }

    /// <summary>Định danh khách vãng lai (cookie) — dùng để gộp đơn khách vãng lai vào tài khoản khi đăng ký.</summary>
    public string? AnonymousId { get; private set; }

    // ===== D10: báo giá + công nợ =====
    public Guid? QuotationId { get; private set; }
    public DateTime? PaymentDueDate { get; private set; }

    /// <summary>D08 — phiên bản điều khoản bán hàng khách đã chấp nhận khi đặt.</summary>
    public string? TermsVersion { get; private set; }

    // ===== Thông tin kỹ thuật / vận hành =====
    public string? CustomerIp { get; private set; }
    public string? CustomerUserAgent { get; private set; }
    public string? InternalNotes { get; private set; }
    public Guid? SourceId { get; private set; }
    public Guid? AffiliateId { get; private set; }
    public string? DiscountReason { get; private set; }
    public string? DeliveryTrackingNumber { get; private set; }
    public string? DeliveryCarrier { get; private set; }
    public decimal ShippingFee { get; private set; }
    public string? TrackingNumber { get; private set; }
    public string? ShippingProvider { get; private set; }
    public int RetryCount { get; private set; }
    public string? FailureReason { get; private set; }

    // ===== Mốc thời gian =====
    public DateTime OrderDate { get; private set; }
    public DateTime? ConfirmedAt { get; private set; }
    public DateTime? ShippedAt { get; private set; }
    public DateTime? DeliveredAt { get; private set; }
    public DateTime? PaidAt { get; private set; }
    public DateTime? FulfilledAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public DateTime? CancelledAt { get; private set; }
    public string? CancellationReason { get; private set; }

    /// <summary>Thuộc tính mở rộng tự do (jsonb); khoá đã khai báo được validate ở tầng endpoint.</summary>
    public string? Attributes { get; private set; }

    public Order(
        Guid customerId,
        string shippingAddress,
        List<OrderItem> items,
        decimal taxRate = 0.1m,
        string? notes = null,
        string? customerIp = null,
        string? customerUserAgent = null,
        Guid? sourceId = null,
        string paymentMethod = "COD",
        bool isPickup = false,
        string? pickupStoreId = null,
        string? pickupStoreName = null,
        string? customerName = null,
        string? customerEmail = null,
        string? customerPhone = null,
        DateOnly? businessDate = null,
        string channel = OrderChannels.Web)
    {
        if (items == null || !items.Any())
            throw new ArgumentException("Order must have at least one item");

        Id = Guid.NewGuid();
        OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Id.ToString().Substring(0, 8).ToUpper()}";
        CustomerId = customerId;
        Status = OrderStatus.Pending;
        PaymentStatus = PaymentStatus.Pending;
        FulfillmentStatus = FulfillmentStatus.Pending;
        Items = items;
        ShippingAddress = shippingAddress;
        Notes = notes;
        CustomerIp = customerIp;
        CustomerUserAgent = customerUserAgent;
        SourceId = sourceId;
        PaymentMethod = paymentMethod;
        IsPickup = isPickup;
        PickupStoreId = pickupStoreId;
        PickupStoreName = pickupStoreName;
        CustomerName = customerName;
        CustomerEmail = customerEmail;
        CustomerPhone = customerPhone;
        OrderDate = DateTime.UtcNow;
        TaxRate = taxRate;
        ShippingVatRate = taxRate;
        Channel = string.IsNullOrWhiteSpace(channel) ? OrderChannels.Web : channel;
        // Mặc định = ngày VN của thời điểm đặt. Caller có IBusinessClock nên truyền TodayVn vào.
        BusinessDate = businessDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        BuyerInvoice = BuyerInvoiceInfo.None(customerName, customerEmail, customerPhone);
        RetryCount = 0;

        CalculateAmounts();
    }

    protected Order() { }

    public void SetCustomerInfo(string? name, string? email, string? phone)
    {
        if (!string.IsNullOrWhiteSpace(name)) CustomerName = name;
        if (!string.IsNullOrWhiteSpace(email)) CustomerEmail = email;
        if (!string.IsNullOrWhiteSpace(phone)) CustomerPhone = phone;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>D07 — gắn khối người mua đã validate cho hoá đơn điện tử.</summary>
    public void SetBuyerInvoiceInfo(BuyerInvoiceInfo buyer)
    {
        BuyerInvoice = buyer ?? BuyerInvoiceInfo.None(CustomerName, CustomerEmail, CustomerPhone);
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Gắn ngữ cảnh quầy/ca cho đơn POS (W2-10).</summary>
    public void SetPosContext(Guid storeId, Guid? shiftId, Guid? cashierId)
    {
        Channel = OrderChannels.Pos;
        StoreId = storeId;
        ShiftId = shiftId;
        CashierId = cashierId;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>D10 — liên kết đơn với báo giá đã chuyển đổi và hạn thanh toán công nợ.</summary>
    public void SetQuotationLink(Guid quotationId, DateTime? paymentDueDate)
    {
        QuotationId = quotationId;
        PaymentDueDate = paymentDueDate;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Định danh khách vãng lai để gộp đơn vào tài khoản sau khi đăng ký.</summary>
    public void SetGuestIdentity(string? anonymousId)
    {
        AnonymousId = string.IsNullOrWhiteSpace(anonymousId) ? null : anonymousId.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Gắn đơn khách vãng lai vào một tài khoản thật (đăng ký sau khi mua).</summary>
    public void LinkToAccount(Guid customerId)
    {
        if (customerId == Guid.Empty) return;
        CustomerId = customerId;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>D08 — phiên bản điều khoản bán hàng khách đã chấp nhận.</summary>
    public void SetTermsVersion(string? version)
    {
        TermsVersion = string.IsNullOrWhiteSpace(version) ? null : version.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    public void AddItem(Guid productId, string productName, decimal unitPrice, int quantity)
        => AddItem(productId, productName, unitPrice, quantity, null, null, null);

    public void AddItem(
        Guid productId,
        string productName,
        decimal unitPrice,
        int quantity,
        Guid? variantId,
        string? variantName,
        string? variantSku)
    {
        RequireMutable("thêm dòng hàng");
        Items.Add(new OrderItem(productId, productName, unitPrice, quantity,
            productSku: null, originalPrice: null,
            variantId: variantId, variantName: variantName, variantSku: variantSku));
        CalculateAmounts();
    }

    public void RemoveItem(Guid itemId)
    {
        RequireMutable("bỏ dòng hàng");
        var item = Items.FirstOrDefault(i => i.Id == itemId);
        if (item != null)
        {
            Items.Remove(item);
            // Giảm riêng của dòng bị bỏ không được "rơi" thành giảm cấp đơn (xem CalculateAmounts).
            DiscountAmount = Math.Max(0m, DiscountAmount - item.LineDiscount);
            CalculateAmounts();
        }
    }

    /// <summary>Đặt/thay khối thuộc tính mở rộng JSON. Caller chịu trách nhiệm validate.</summary>
    public void SetAttributes(string? attributesJson)
    {
        Attributes = attributesJson;
        UpdatedAt = DateTime.UtcNow;
    }

    private void RequireMutable(string action)
    {
        if (Status != OrderStatus.Draft && Status != OrderStatus.Pending)
            throw new InvalidOperationException($"Không thể {action} khi đơn ở trạng thái {Status}");
    }
}

/// <summary>Kênh tạo đơn — giá trị lưu vào <c>Orders.Channel</c>.</summary>
public static class OrderChannels
{
    public const string Web = "Web";
    public const string Guest = "Guest";
    public const string Pos = "Pos";
    public const string Quotation = "Quotation";
}
