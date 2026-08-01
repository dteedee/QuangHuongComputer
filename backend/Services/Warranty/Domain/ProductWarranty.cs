using BuildingBlocks.SharedKernel;

namespace Warranty.Domain;

/// <summary>
/// Phase 07: bảo hành gắn serial cụ thể + phân biệt hãng vs shop.
/// Một máy có thể có 2 record song song: 1 bản Manufacturer (hãng, 24 tháng)
/// + 1 bản Store (shop cộng thêm 6 tháng).
/// </summary>
public class ProductWarranty : Entity<Guid>
{
    public Guid ProductId { get; private set; }
    public string SerialNumber { get; private set; } = string.Empty;
    /// <summary>Phase 07: FK Inventory.SerialNumber.Id (không truy vấn qua entity — chỉ Guid).</summary>
    public Guid? SerialNumberId { get; private set; }
    public Guid CustomerId { get; private set; }
    public DateTime PurchaseDate { get; private set; }
    public DateTime ExpirationDate { get; private set; }
    public int WarrantyPeriodMonths { get; private set; }
    public WarrantyStatus Status { get; private set; }
    /// <summary>Phase 07: hãng hay shop.</summary>
    public WarrantyProvider Provider { get; private set; }
    /// <summary>Phase 07: policy áp dụng (phạm vi + loại trừ).</summary>
    public Guid? PolicyId { get; private set; }
    public string? Notes { get; private set; }
    public string? OrderNumber { get; private set; }

    public ProductWarranty(
        Guid productId,
        string serialNumber,
        Guid customerId,
        DateTime purchaseDate,
        int warrantyPeriodMonths,
        string? orderNumber = null,
        WarrantyProvider provider = WarrantyProvider.Manufacturer,
        Guid? policyId = null,
        Guid? serialNumberId = null)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        SerialNumber = serialNumber;
        SerialNumberId = serialNumberId;
        CustomerId = customerId;
        PurchaseDate = purchaseDate;
        WarrantyPeriodMonths = warrantyPeriodMonths;
        ExpirationDate = purchaseDate.AddMonths(warrantyPeriodMonths);
        Status = WarrantyStatus.Active;
        Provider = provider;
        PolicyId = policyId;
        OrderNumber = orderNumber;
    }

    protected ProductWarranty() { }

    public bool IsValid()
    {
        return Status == WarrantyStatus.Active && DateTime.UtcNow <= ExpirationDate;
    }

    public void Void(string reason)
    {
        Status = WarrantyStatus.Voided;
        Notes = reason;
    }

    public void Expire()
    {
        Status = WarrantyStatus.Expired;
    }

    /// <summary>Phase 07: gắn/đổi serial (khi hoàn thiện data lịch sử).</summary>
    public void AttachSerialNumberId(Guid serialNumberId)
    {
        SerialNumberId = serialNumberId;
        UpdatedAt = DateTime.UtcNow;
    }
}

public enum WarrantyStatus
{
    Active,
    Expired,
    Voided
}

/// <summary>Phase 07: nhà cung cấp bảo hành — cùng máy có thể có 2 bản song song.</summary>
public enum WarrantyProvider
{
    Manufacturer = 1, // Hãng (thường 12-24 tháng theo NCC)
    Store = 2         // Shop (extend thêm 3-6 tháng như dịch vụ gia tăng)
}
