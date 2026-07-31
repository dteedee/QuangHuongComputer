using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Báo giá của NCC trả lời cho 1 RFQ. NCC VN hiếm có API,
/// nên giai đoạn 1 nhập tay từ mail/PDF/điện thoại.
/// </summary>
public class SupplierQuotation : Entity<Guid>
{
    public Guid RfqId { get; private set; }
    public Guid SupplierId { get; private set; }
    public string? QuotationNumber { get; private set; }
    public DateTime ReceivedDate { get; private set; } = DateTime.UtcNow;
    public DateTime? ValidUntil { get; private set; }
    public SupplierQuotationStatus Status { get; private set; } = SupplierQuotationStatus.Received;
    public decimal TotalAmount { get; private set; }
    public PaymentTermType PaymentTermType { get; private set; } = PaymentTermType.COD;
    public int DeliveryDays { get; private set; }
    public int WarrantyMonths { get; private set; }
    public string? Notes { get; private set; }
    public List<SupplierQuotationItem> Items { get; private set; } = new();

    protected SupplierQuotation() { }

    public SupplierQuotation(
        Guid rfqId,
        Guid supplierId,
        List<SupplierQuotationItem> items,
        DateTime? validUntil = null,
        PaymentTermType paymentTermType = PaymentTermType.COD,
        int deliveryDays = 0,
        int warrantyMonths = 0,
        string? quotationNumber = null,
        string? notes = null)
    {
        if (items == null || items.Count == 0)
            throw new ArgumentException("Báo giá phải có ít nhất 1 dòng.", nameof(items));

        Id = Guid.NewGuid();
        RfqId = rfqId;
        SupplierId = supplierId;
        Items = items;
        ValidUntil = validUntil;
        PaymentTermType = paymentTermType;
        DeliveryDays = deliveryDays;
        WarrantyMonths = warrantyMonths;
        QuotationNumber = quotationNumber;
        Notes = notes;
        TotalAmount = items.Sum(i => i.UnitPrice * Math.Max(i.MinQuantity, 1));
    }

    public void MarkAwarded()
    {
        Status = SupplierQuotationStatus.Awarded;
    }

    public void MarkRejected()
    {
        Status = SupplierQuotationStatus.Rejected;
    }
}

public class SupplierQuotationItem : Entity<Guid>
{
    public Guid QuotationId { get; set; }
    public Guid ProductId { get; private set; }
    public decimal UnitPrice { get; private set; }
    public int MinQuantity { get; private set; }
    public int LeadTimeDays { get; private set; }
    public string? Notes { get; private set; }

    protected SupplierQuotationItem() { }

    public SupplierQuotationItem(Guid productId, decimal unitPrice, int minQuantity = 1, int leadTimeDays = 0, string? notes = null)
    {
        if (unitPrice < 0) throw new ArgumentException("Đơn giá không được âm.", nameof(unitPrice));
        Id = Guid.NewGuid();
        ProductId = productId;
        UnitPrice = unitPrice;
        MinQuantity = minQuantity;
        LeadTimeDays = leadTimeDays;
        Notes = notes;
    }
}

public enum SupplierQuotationStatus
{
    Received = 0,
    Awarded = 1,
    Rejected = 2,
    Expired = 3
}
