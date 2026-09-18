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

    /// <summary>
    /// D08 §4: "thời gian xử lý KHÔNG tính vào hạn BH" — số ngày cộng bù do máy nằm ở
    /// shop/gửi hãng, cộng dồn qua <see cref="ExtendForServiceTime"/>. Không trừ trực tiếp
    /// vào <see cref="ExpirationDate"/> gốc để giữ lịch sử tính toán minh bạch.
    /// </summary>
    public int ExtendedDays { get; private set; }

    /// <summary>Bản BH bị Void do đổi máy mới thì trỏ tới bản thay thế (chuỗi lịch sử).</summary>
    public Guid? ReplacedByWarrantyId { get; private set; }

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
        // D08 §4 validators: tháng 0-120; ngày mua không được ở tương lai (dữ liệu audit rác
        // từng có -12 tháng và ngày mua 2099).
        if (warrantyPeriodMonths < 0 || warrantyPeriodMonths > 120)
            throw new ArgumentOutOfRangeException(nameof(warrantyPeriodMonths), "Số tháng bảo hành phải trong khoảng 0-120.");
        if (purchaseDate.Date > DateTime.UtcNow.Date)
            throw new ArgumentOutOfRangeException(nameof(purchaseDate), "Ngày mua không được ở tương lai.");
        if (string.IsNullOrWhiteSpace(serialNumber))
            throw new ArgumentException("Serial/mã bảo hành không được rỗng.", nameof(serialNumber));

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

    /// <summary>D08 §4: máy đã đổi mới -> hủy bản cũ và trỏ sang bản thay thế.</summary>
    public void VoidForReplacement(Guid replacementWarrantyId, string reason)
    {
        Status = WarrantyStatus.Voided;
        ReplacedByWarrantyId = replacementWarrantyId;
        Notes = reason;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Expire()
    {
        Status = WarrantyStatus.Expired;
    }

    /// <summary>
    /// D08 §4 / Điều 30.2.đ Luật 19/2023: thời gian máy nằm ở shop/hãng để xử lý claim được
    /// cộng bù vào hạn bảo hành (không trừ khỏi thời gian khách được dùng máy).
    /// </summary>
    public void ExtendForServiceTime(int days)
    {
        if (days <= 0) return;
        ExtendedDays += days;
        ExpirationDate = ExpirationDate.AddDays(days);
        UpdatedAt = DateTime.UtcNow;
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
