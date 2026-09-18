using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

/// <summary>
/// Báo giá B2B (W2-19, phase-68). Cột đã có sẵn trong migration
/// <c>20260918180000_W23SalesCheckoutSchema</c> (W2-3 tạo bảng, KHÔNG có migration thứ hai —
/// xem <c>Infrastructure/Data/SalesAfterSalesModelConfiguration.cs</c>).
///
/// State machine (guarded, D10):
///   Draft --Send()--&gt; Sent --Accept()--&gt; Accepted --Convert()--&gt; Converted
///                      \--Reject()--&gt; Rejected
///   Sent | Accepted --Expire()--&gt; Expired  (gọi bởi job hết hạn đơn của W2-10, KHÔNG job riêng)
///   KHÔNG có transition nào ra khỏi Converted.
///
/// Khối người mua (BuyerType/BuyerLegalName/BuyerTaxCode/BuyerBudgetUnitCode/BuyerAddress) là
/// snapshot phẳng của D07's <see cref="BuyerInvoiceInfo"/> — không dùng owned-type ở đây vì báo
/// giá chưa xuất hoá đơn; khối này được SAO CHÉP sang <c>Order.BuyerInvoice</c> lúc chuyển đổi
/// (<see cref="Application.Quotations.QuotationConversionService"/>).
/// </summary>
public class SalesQuotation : Entity<Guid>
{
    public string QuotationNumber { get; private set; } = string.Empty;
    public QuotationStatus Status { get; private set; } = QuotationStatus.Draft;

    // ===== Khách hàng =====
    public Guid? CustomerId { get; private set; }
    public string? CustomerName { get; private set; }
    public string? CustomerPhone { get; private set; }
    public string? CustomerEmail { get; private set; }

    // ===== Khối người mua cho hoá đơn — D07, sao chép sang Order lúc chuyển đổi =====
    public BuyerType BuyerType { get; private set; } = BuyerType.Individual;
    public string? BuyerLegalName { get; private set; }
    public string? BuyerTaxCode { get; private set; }
    public string? BuyerBudgetUnitCode { get; private set; }
    public string? BuyerAddress { get; private set; }

    public List<SalesQuotationLine> Lines { get; private set; } = new();

    // ===== Tiền — D01: đơn giá dòng ĐÃ GỒM VAT, thuế tách riêng để hiển thị =====
    public decimal SubtotalAmount { get; private set; }
    public decimal DiscountAmount { get; private set; }
    public decimal TaxAmount { get; private set; }
    public decimal TotalAmount { get; private set; }

    // ===== Công nợ (D10, tối giản) =====
    public int PaymentTermDays { get; private set; }

    public DateTime? ValidUntil { get; private set; }
    public DateTime? AcceptedAt { get; private set; }
    public DateTime? ConvertedAt { get; private set; }
    public Guid? ConvertedOrderId { get; private set; }

    public string? TermsText { get; private set; }
    public string? Notes { get; private set; }

    // CreatedBy/CreatedAt/UpdatedAt/IsActive kế thừa từ Entity<Guid> (BuildingBlocks.SharedKernel).

    protected SalesQuotation() { }

    public SalesQuotation(
        string quotationNumber,
        Guid? customerId,
        string? customerName,
        string? customerPhone,
        string? customerEmail,
        BuyerType buyerType,
        string? buyerLegalName,
        string? buyerTaxCode,
        string? buyerBudgetUnitCode,
        string? buyerAddress,
        DateTime validUntil,
        int paymentTermDays,
        string? termsText,
        string? notes,
        string? createdBy)
    {
        if (string.IsNullOrWhiteSpace(quotationNumber))
            throw new ArgumentException("Thiếu số báo giá", nameof(quotationNumber));
        if (buyerType == BuyerType.Organization && string.IsNullOrWhiteSpace(buyerLegalName))
            throw new ArgumentException("Tên đơn vị là bắt buộc với khách tổ chức", nameof(buyerLegalName));
        if (paymentTermDays < 0)
            throw new ArgumentException("Số ngày công nợ không được âm", nameof(paymentTermDays));

        Id = Guid.NewGuid();
        QuotationNumber = quotationNumber;
        Status = QuotationStatus.Draft;
        CustomerId = customerId;
        CustomerName = customerName;
        CustomerPhone = customerPhone;
        CustomerEmail = customerEmail;
        BuyerType = buyerType;
        BuyerLegalName = buyerLegalName;
        BuyerTaxCode = buyerTaxCode;
        BuyerBudgetUnitCode = buyerBudgetUnitCode;
        BuyerAddress = buyerAddress;
        ValidUntil = validUntil;
        PaymentTermDays = paymentTermDays;
        TermsText = termsText;
        Notes = notes;
        CreatedBy = createdBy;
        CreatedAt = DateTime.UtcNow;
        IsActive = true;
    }

    /// <summary>Chỉ sửa được khi còn Draft — mọi thứ khác phải huỷ/tạo báo giá mới.</summary>
    public void ReplaceLines(IEnumerable<SalesQuotationLine> lines)
    {
        RequireDraft("sửa dòng báo giá");
        Lines = lines.ToList();
        Recalculate();
        Touch();
    }

    public void UpdateBuyerAndTerms(
        Guid? customerId, string? customerName, string? customerPhone, string? customerEmail,
        BuyerType buyerType, string? buyerLegalName, string? buyerTaxCode, string? buyerBudgetUnitCode,
        string? buyerAddress, DateTime validUntil, int paymentTermDays, string? termsText, string? notes)
    {
        RequireDraft("sửa báo giá");
        if (buyerType == BuyerType.Organization && string.IsNullOrWhiteSpace(buyerLegalName))
            throw new ArgumentException("Tên đơn vị là bắt buộc với khách tổ chức", nameof(buyerLegalName));
        if (paymentTermDays < 0)
            throw new ArgumentException("Số ngày công nợ không được âm", nameof(paymentTermDays));

        CustomerId = customerId;
        CustomerName = customerName;
        CustomerPhone = customerPhone;
        CustomerEmail = customerEmail;
        BuyerType = buyerType;
        BuyerLegalName = buyerLegalName;
        BuyerTaxCode = buyerTaxCode;
        BuyerBudgetUnitCode = buyerBudgetUnitCode;
        BuyerAddress = buyerAddress;
        ValidUntil = validUntil;
        PaymentTermDays = paymentTermDays;
        TermsText = termsText;
        Notes = notes;
        Touch();
    }

    /// <summary>Draft -> Sent. Gửi cho khách; từ đây không còn sửa dòng được nữa.</summary>
    public void Send()
    {
        if (Status != QuotationStatus.Draft)
            throw new InvalidOperationException($"Chỉ gửi được báo giá đang Draft (hiện tại: {Status})");
        if (Lines.Count == 0)
            throw new InvalidOperationException("Báo giá chưa có dòng nào");
        Status = QuotationStatus.Sent;
        Touch();
    }

    /// <summary>Sent -> Accepted. Từ chối nếu đã hết hạn (khách phản hồi trễ).</summary>
    public void Accept(DateTime nowUtc)
    {
        if (Status != QuotationStatus.Sent)
            throw new InvalidOperationException($"Chỉ chấp nhận được báo giá đang Sent (hiện tại: {Status})");
        if (ValidUntil.HasValue && ValidUntil.Value < nowUtc)
            throw new InvalidOperationException("Báo giá đã hết hạn, không thể chấp nhận");
        Status = QuotationStatus.Accepted;
        AcceptedAt = nowUtc;
        Touch();
    }

    /// <summary>Sent -> Rejected.</summary>
    public void Reject(string? reason)
    {
        if (Status != QuotationStatus.Sent)
            throw new InvalidOperationException($"Chỉ từ chối được báo giá đang Sent (hiện tại: {Status})");
        Status = QuotationStatus.Rejected;
        if (!string.IsNullOrWhiteSpace(reason))
            Notes = string.IsNullOrWhiteSpace(Notes) ? $"[Từ chối] {reason}" : $"{Notes}\n[Từ chối] {reason}";
        Touch();
    }

    /// <summary>
    /// Sent|Accepted -> Expired. Gọi bởi job hết hạn đơn có sẵn của W2-10 (đọc mọi báo giá
    /// Sent/Accepted có ValidUntil &lt; now) — KHÔNG có scheduler riêng cho báo giá (Risk Assessment).
    /// </summary>
    public void Expire(DateTime nowUtc)
    {
        if (Status is not (QuotationStatus.Sent or QuotationStatus.Accepted)) return;
        if (!ValidUntil.HasValue || ValidUntil.Value >= nowUtc) return;
        Status = QuotationStatus.Expired;
        Touch();
    }

    /// <summary>Accepted -> Converted. Chỉ gọi SAU KHI CheckoutOrchestrator tạo đơn thành công.</summary>
    public void MarkConverted(Guid orderId, DateTime nowUtc)
    {
        if (Status != QuotationStatus.Accepted)
            throw new InvalidOperationException($"Chỉ chuyển đổi được báo giá đang Accepted (hiện tại: {Status})");
        if (ValidUntil.HasValue && ValidUntil.Value < nowUtc)
            throw new InvalidOperationException("Báo giá đã hết hạn, không thể chuyển thành đơn");
        Status = QuotationStatus.Converted;
        ConvertedAt = nowUtc;
        ConvertedOrderId = orderId;
        Touch();
    }

    /// <summary>Có được phép chuyển đổi ngay bây giờ không (dùng để 400 sớm trước khi gọi orchestrator).</summary>
    public bool CanConvert(DateTime nowUtc)
        => Status == QuotationStatus.Accepted && (!ValidUntil.HasValue || ValidUntil.Value >= nowUtc);

    public void Deactivate() { IsActive = false; Touch(); }

    /// <summary>Tổng lại tiền từ các dòng — SubtotalAmount/TaxAmount đã gồm VAT theo dòng (D01).</summary>
    private void Recalculate()
    {
        SubtotalAmount = Lines.Sum(l => l.UnitPrice * l.Quantity);
        DiscountAmount = Lines.Sum(l => l.LineDiscount);
        TaxAmount = Lines.Sum(l => l.VatAmount);
        TotalAmount = Lines.Sum(l => l.LineTotal);
    }

    private void RequireDraft(string action)
    {
        if (Status != QuotationStatus.Draft)
            throw new InvalidOperationException($"Không thể {action} khi báo giá ở trạng thái {Status}");
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}

/// <summary>D10 — trạng thái báo giá. Giá trị số khớp cột <c>Status</c> (int) trong CSDL.</summary>
public enum QuotationStatus
{
    Draft = 0,
    Sent = 1,
    Accepted = 2,
    Rejected = 3,
    Expired = 4,
    Converted = 5,
}
