using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

/// <summary>
/// Đơn TẠM GIỮ ở quầy POS ("park sale"): khách quên ví, đi rút tiền, hoặc thu ngân phải phục vụ
/// khách tiếp theo. Giỏ được cất nguyên trạng và gọi lại sau, KHÔNG tạo đơn thật và KHÔNG giữ tồn.
///
/// Vì sao không dùng <c>Carts</c>: giỏ gắn với một tài khoản khách; đơn giữ ở quầy gắn với CA BÁN
/// và có thể thuộc về khách vãng lai không có tài khoản. Trộn hai khái niệm làm hỏng cả hai.
///
/// Bảng do W2-3 tạo; W2-10 (POS) là bên ghi.
/// </summary>
public class HeldOrder : Entity<Guid>
{
    /// <summary>Nhãn thu ngân đặt để gọi lại ("Anh Nam áo xanh").</summary>
    public string Label { get; private set; } = string.Empty;

    public Guid StoreId { get; private set; }
    public Guid? ShiftId { get; private set; }
    public Guid? CashierId { get; private set; }

    /// <summary>Khách có tài khoản; null = khách vãng lai.</summary>
    public Guid? CustomerId { get; private set; }
    public string? CustomerName { get; private set; }
    public string? CustomerPhone { get; private set; }

    /// <summary>
    /// Snapshot JSON các dòng hàng: <c>[{productId, variantId, name, sku, unitPrice, quantity, serials}]</c>.
    /// Cố ý là JSON: đơn giữ là dữ liệu tạm, không cần truy vấn theo dòng và không được ràng buộc
    /// khoá ngoại vào sản phẩm có thể bị ngừng bán trong lúc đang giữ.
    /// </summary>
    public string ItemsJson { get; private set; } = "[]";

    /// <summary>Tổng tạm tính lúc giữ — chỉ để hiển thị danh sách đơn giữ, tính lại khi gọi ra.</summary>
    public decimal EstimatedTotal { get; private set; }

    public string? Notes { get; private set; }

    /// <summary>Đã được gọi ra và chuyển thành đơn thật.</summary>
    public Guid? ResumedOrderId { get; private set; }
    public DateTime? ResumedAt { get; private set; }

    public HeldOrder(
        string label,
        Guid storeId,
        string itemsJson,
        decimal estimatedTotal,
        Guid? shiftId = null,
        Guid? cashierId = null,
        Guid? customerId = null,
        string? customerName = null,
        string? customerPhone = null,
        string? notes = null)
    {
        if (string.IsNullOrWhiteSpace(label))
            throw new ArgumentException("Đơn giữ phải có nhãn để gọi lại", nameof(label));

        Id = Guid.NewGuid();
        Label = label.Trim();
        StoreId = storeId;
        ShiftId = shiftId;
        CashierId = cashierId;
        CustomerId = customerId;
        CustomerName = customerName;
        CustomerPhone = customerPhone;
        ItemsJson = string.IsNullOrWhiteSpace(itemsJson) ? "[]" : itemsJson;
        EstimatedTotal = estimatedTotal < 0m ? 0m : estimatedTotal;
        Notes = notes;
    }

    protected HeldOrder() { }

    /// <summary>Gọi đơn giữ ra thành đơn thật. Idempotent: gọi lần hai không đổi đơn đã gắn.</summary>
    public void Resume(Guid orderId)
    {
        if (ResumedOrderId.HasValue) return;
        ResumedOrderId = orderId;
        ResumedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
}
