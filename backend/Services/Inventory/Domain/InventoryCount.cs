using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Phiên kiểm kê kho. W2-5 bước 6: dòng kiểm kê ghim thẳng <see cref="InventoryCountItem.InventoryItemId"/>
/// nên khi duyệt, bút toán điều chỉnh rơi đúng dòng tồn (sản phẩm + biến thể + kho) đã đếm,
/// thay vì "dòng đầu tiên trùng ProductId" như bản cũ.
/// </summary>
public class InventoryCountSession : Entity<Guid>
{
    public InventoryCountSession() { Id = Guid.NewGuid(); }

    public string DocumentNumber { get; set; } = "";
    public DateTime CountDate { get; set; } = DateTime.UtcNow;
    public Guid? WarehouseId { get; set; }
    public CountScope Scope { get; set; } = CountScope.Full;
    public Guid? CategoryId { get; set; }
    public CountSessionStatus Status { get; set; } = CountSessionStatus.Open;

    // W2-5: người mở phiên (từ JWT) dùng chính Entity.CreatedBy có sẵn — cột "CreatedBy" đã tồn
    // tại trong CSDL, nên chặn "tự mở tự duyệt" không cần thêm cột nào.

    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? Notes { get; set; }
    public List<InventoryCountItem> Items { get; set; } = new();
}

public class InventoryCountItem : Entity<Guid>
{
    public InventoryCountItem() { Id = Guid.NewGuid(); }

    public Guid CountSessionId { get; set; }

    /// <summary>W2-5: dòng tồn đã đếm. 0 = dữ liệu kiểm kê cũ (trước W2-5) không ghim được dòng nào.</summary>
    public Guid InventoryItemId { get; set; }

    public Guid ProductId { get; set; }

    /// <summary>W2-5: biến thể của dòng tồn (null = sản phẩm không có biến thể).</summary>
    public Guid? VariantId { get; set; }

    /// <summary>W2-5: kho của dòng tồn — một phiên "toàn kho" đếm nhiều kho.</summary>
    public Guid? WarehouseId { get; set; }

    public string ProductName { get; set; } = "";
    public int SystemQuantity { get; set; }
    public int? CountedQuantity { get; set; }
    public int Variance => (CountedQuantity ?? SystemQuantity) - SystemQuantity;
    public string? CountedBy { get; set; }
    public string? Notes { get; set; }
}

public enum CountScope { Full, ByCategory }
public enum CountSessionStatus { Open, InProgress, PendingApproval, Approved, Cancelled }
