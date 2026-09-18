using BuildingBlocks.SharedKernel;

namespace Accounting.Domain;

/// <summary>
/// Hoá đơn bán ra (AR) hoặc hoá đơn mua vào / công nợ nhà cung cấp (AP).
///
/// W2-14/D01: tiền tệ luôn là VND, các dòng LƯU sẵn net/vat/gross (xem <see cref="InvoiceLine"/>),
/// và <see cref="OrderId"/> là khoá chống tạo trùng khi sự kiện đơn hàng được phát lại.
/// </summary>
public class Invoice : AggregateRoot<Guid>
{
    public string InvoiceNumber { get; private set; } = string.Empty;
    public InvoiceType Type { get; private set; }
    public InvoiceStatus Status { get; private set; }

    // AR
    public Guid? CustomerId { get; private set; }
    public Guid? OrganizationAccountId { get; private set; }

    /// <summary>Đơn hàng nguồn. DUY NHẤT — mỗi đơn chỉ đẻ ra đúng một hoá đơn.</summary>
    public Guid? OrderId { get; private set; }
    public string? OrderNumber { get; private set; }

    // AP
    public Guid? SupplierId { get; private set; }
    public Guid? PurchaseOrderId { get; private set; }
    public Guid? GoodsReceiptId { get; private set; }

    public DateTime IssueDate { get; private set; }
    public DateTime DueDate { get; private set; }

    /// <summary>Ngày làm việc (giờ VN) dùng để resolve thuế suất và xếp kỳ kê khai.</summary>
    public DateOnly? BusinessDate { get; private set; }

    public decimal SubTotal { get; private set; }

    /// <summary>Thuế suất chủ đạo theo PHẦN TRĂM; 0 khi hoá đơn có nhiều thuế suất (xem các dòng).</summary>
    public decimal VatRate { get; private set; }
    public decimal VatAmount { get; private set; }
    public decimal TotalAmount { get; private set; }
    public decimal PaidAmount { get; private set; }
    public decimal RemainingAmount => TotalAmount - PaidAmount;
    public decimal OutstandingAmount => TotalAmount - PaidAmount;

    public AgingBucket AgingBucket { get; private set; } = AgingBucket.None;
    public Currency Currency { get; private set; } = Currency.VND;
    public string? Notes { get; private set; }

    // Ảnh chụp người mua tại thời điểm lập hoá đơn (không bao giờ truy ngược sang module khác).
    public string? BuyerType { get; private set; }
    public string? BuyerLegalName { get; private set; }
    public string? BuyerFullName { get; private set; }
    public string? BuyerTaxCode { get; private set; }
    public string? BuyerBudgetUnitCode { get; private set; }
    public string? BuyerAddress { get; private set; }
    public string? BuyerEmail { get; private set; }
    public string? BuyerPhone { get; private set; }

    // E-Invoice: thuộc W2-24, ở đây chỉ giữ chỗ lưu trữ.
    public string? EInvoiceId { get; private set; }
    public string? EInvoiceNumber { get; private set; }
    public string? EInvoiceLookupCode { get; private set; }
    public string? EInvoiceStatus { get; private set; }
    public DateTime? EInvoiceIssuedAt { get; private set; }

    private readonly List<InvoiceLine> _lines = new();
    public IReadOnlyCollection<InvoiceLine> Lines => _lines.AsReadOnly();

    private readonly List<Payment> _payments = new();
    public IReadOnlyCollection<Payment> Payments => _payments.AsReadOnly();

    private readonly List<PaymentApplication> _paymentApplications = new();
    public IReadOnlyCollection<PaymentApplication> PaymentApplications => _paymentApplications.AsReadOnly();

    protected Invoice() { }

    public static Invoice CreateReceivable(
        Guid? customerId,
        Guid? organizationAccountId,
        string invoiceNumber,
        DateTime issueDate,
        DateTime dueDate,
        string? notes = null)
    {
        return new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = invoiceNumber,
            Type = InvoiceType.Receivable,
            Status = InvoiceStatus.Draft,
            CustomerId = customerId,
            OrganizationAccountId = organizationAccountId,
            IssueDate = issueDate,
            DueDate = dueDate,
            Currency = Currency.VND,
            Notes = notes
        };
    }

    public static Invoice CreatePayable(
        Guid supplierId,
        string invoiceNumber,
        DateTime issueDate,
        DateTime dueDate,
        string? notes = null,
        Guid? purchaseOrderId = null,
        Guid? goodsReceiptId = null)
    {
        return new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = invoiceNumber,
            Type = InvoiceType.Payable,
            Status = InvoiceStatus.Draft,
            SupplierId = supplierId,
            IssueDate = issueDate,
            DueDate = dueDate,
            Currency = Currency.VND,
            Notes = notes,
            PurchaseOrderId = purchaseOrderId,
            GoodsReceiptId = goodsReceiptId
        };
    }

    /// <summary>Gắn hoá đơn với đơn hàng nguồn + ngày làm việc dùng để resolve thuế suất.</summary>
    public void LinkToOrder(Guid orderId, string? orderNumber, DateOnly businessDate)
    {
        OrderId = orderId;
        OrderNumber = orderNumber;
        BusinessDate = businessDate;
    }

    public void SetBuyer(
        string? buyerType, string? legalName, string? fullName, string? taxCode,
        string? budgetUnitCode, string? address, string? email, string? phone)
    {
        BuyerType = buyerType;
        BuyerLegalName = legalName;
        BuyerFullName = fullName;
        BuyerTaxCode = taxCode;
        BuyerBudgetUnitCode = budgetUnitCode;
        BuyerAddress = address;
        BuyerEmail = email;
        BuyerPhone = phone;
    }

    public void LinkToPurchaseOrder(Guid purchaseOrderId, Guid? goodsReceiptId = null)
    {
        if (Type != InvoiceType.Payable)
            throw new InvalidOperationException("Chỉ hoá đơn mua vào mới gắn được với đơn đặt mua.");

        PurchaseOrderId = purchaseOrderId;
        GoodsReceiptId = goodsReceiptId;
    }

    /// <summary>Thêm một dòng ĐÃ tách VAT. Chỉ sửa được khi hoá đơn còn ở trạng thái nháp.</summary>
    public void AddLine(InvoiceLine line)
    {
        if (Status != InvoiceStatus.Draft)
            throw new InvalidOperationException("Không thể sửa hoá đơn đã phát hành.");

        _lines.Add(line);
        RecalculateTotals();
    }

    public void ClearLines()
    {
        if (Status != InvoiceStatus.Draft)
            throw new InvalidOperationException("Không thể sửa hoá đơn đã phát hành.");

        _lines.Clear();
        RecalculateTotals();
    }

    public void UpdateNotes(string? notes)
    {
        if (Status != InvoiceStatus.Draft)
            throw new InvalidOperationException("Không thể sửa hoá đơn đã phát hành.");
        Notes = notes;
    }

    public void UpdateDueDate(DateTime dueDate)
    {
        if (Status != InvoiceStatus.Draft)
            throw new InvalidOperationException("Không thể sửa hoá đơn đã phát hành.");
        DueDate = dueDate;
    }

    public void Issue(DateTime issuedAt)
    {
        if (Status != InvoiceStatus.Draft)
            throw new InvalidOperationException("Chỉ hoá đơn nháp mới phát hành được.");

        if (_lines.Count == 0)
            throw new InvalidOperationException("Hoá đơn phải có ít nhất một dòng hàng.");

        Status = InvoiceStatus.Issued;
        IssueDate = issuedAt;
        CalculateAgingStatus(issuedAt);
        RaiseDomainEvent(new InvoiceIssuedEvent(Id, InvoiceNumber, TotalAmount, DueDate));
    }

    public void ApplyPayment(Guid paymentIntentId, decimal amount, DateTime at, string? notes = null)
    {
        if (Status == InvoiceStatus.Draft)
            throw new InvalidOperationException("Không thể ghi nhận thanh toán cho hoá đơn nháp.");
        if (Status == InvoiceStatus.Cancelled)
            throw new InvalidOperationException("Không thể ghi nhận thanh toán cho hoá đơn đã huỷ.");
        if (amount <= 0)
            throw new ArgumentException("Số tiền thanh toán phải lớn hơn 0.", nameof(amount));

        var existingApplications = _paymentApplications.Sum(pa => pa.Amount);
        PaymentApplication.ValidateTotalApplications(OutstandingAmount, existingApplications, amount);

        _paymentApplications.Add(PaymentApplication.Create(paymentIntentId, Id, amount, notes));
        PaidAmount += amount;
        SettleStatus(at);
    }

    public void RecordPayment(decimal amount, string paymentReference, PaymentMethod method, DateTime at)
    {
        if (Status == InvoiceStatus.Draft)
            throw new InvalidOperationException("Không thể ghi nhận thanh toán cho hoá đơn nháp.");
        if (Status == InvoiceStatus.Cancelled)
            throw new InvalidOperationException("Không thể ghi nhận thanh toán cho hoá đơn đã huỷ.");
        if (amount <= 0)
            throw new ArgumentException("Số tiền thanh toán phải lớn hơn 0.");
        if (amount > RemainingAmount)
            throw new InvalidOperationException("Số tiền thanh toán vượt quá số còn phải thu/trả.");

        _payments.Add(new Payment(Id, amount, paymentReference, method, at));
        PaidAmount += amount;
        SettleStatus(at);
    }

    private void SettleStatus(DateTime at)
    {
        if (OutstandingAmount == 0)
        {
            Status = InvoiceStatus.Paid;
            RaiseDomainEvent(new InvoicePaidEvent(Id, InvoiceNumber, OrderId, Type));
        }
        else if (PaidAmount > 0)
        {
            Status = InvoiceStatus.PartiallyPaid;
        }

        CalculateAgingStatus(at);
    }

    /// <summary>Cập nhật nhóm tuổi nợ theo MỐC THỜI GIAN TRUYỀN VÀO (không dùng DateTime.UtcNow).</summary>
    public void CalculateAgingStatus(DateTime at)
    {
        if (Status is InvoiceStatus.Paid or InvoiceStatus.Cancelled)
        {
            AgingBucket = AgingBucket.None;
            return;
        }

        var daysOverdue = (at - DueDate).Days;
        AgingBucket = BucketFor(daysOverdue);

        if (daysOverdue > 0 && Status == InvoiceStatus.Issued)
        {
            Status = InvoiceStatus.Overdue;
            RaiseDomainEvent(new InvoiceOverdueEvent(Id, InvoiceNumber, DueDate, OutstandingAmount));
        }
    }

    public AgingBucket GetAgingBucket(DateTime at)
        => Status is InvoiceStatus.Paid or InvoiceStatus.Cancelled
            ? AgingBucket.None
            : BucketFor((at - DueDate).Days);

    private static AgingBucket BucketFor(int daysOverdue) => daysOverdue switch
    {
        <= 0 => AgingBucket.Current,
        <= 30 => AgingBucket.Days1To30,
        <= 60 => AgingBucket.Days31To60,
        <= 90 => AgingBucket.Days61To90,
        _ => AgingBucket.Over90Days
    };

    /// <param name="at">Mốc phát hành. Để trống = bây giờ (giữ chữ ký cũ cho EInvoiceEndpoints của W2-24).</param>
    public void UpdateEInvoice(string invoiceId, string invoiceNumber, string lookupCode, string status, DateTime? at = null)
    {
        EInvoiceId = invoiceId;
        EInvoiceNumber = invoiceNumber;
        EInvoiceLookupCode = lookupCode;
        EInvoiceStatus = status;
        EInvoiceIssuedAt = at ?? DateTime.UtcNow;
    }

    /// <summary>Huỷ hoá đơn. Hoá đơn đã thu tiền phải đi qua giấy báo có (<see cref="CreditNote"/>).</summary>
    public void Cancel(string reason)
    {
        if (Status == InvoiceStatus.Paid)
            throw new InvalidOperationException("Hoá đơn đã thanh toán không huỷ được; hãy lập giấy báo có.");
        if (PaidAmount > 0)
            throw new InvalidOperationException("Hoá đơn đã thu một phần không huỷ được; hãy lập giấy báo có.");

        Status = InvoiceStatus.Cancelled;
        AgingBucket = AgingBucket.None;
        Notes = string.IsNullOrWhiteSpace(Notes) ? $"Huỷ: {reason}" : $"{Notes}\nHuỷ: {reason}";
    }

    private void RecalculateTotals()
    {
        SubTotal = _lines.Sum(l => l.NetAmount);
        VatAmount = _lines.Sum(l => l.VatAmount);
        TotalAmount = _lines.Sum(l => l.GrossAmount);

        var rates = _lines.Where(l => l.GrossAmount > 0).Select(l => l.VatRate).Distinct().ToList();
        VatRate = rates.Count == 1 ? rates[0] : 0m;
    }
}
