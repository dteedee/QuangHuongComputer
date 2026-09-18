using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Phiếu điều chỉnh tồn kho (W2-5 bước 7).
///
/// <para>
/// Ba tính chất bắt buộc, vì đây là con đường duy nhất mà một nhân viên có thể "vẽ" thêm hoặc
/// xoá bớt hàng: (1) luôn có <see cref="Type"/> + <see cref="Reason"/>; (2) người ghi phiếu
/// KHÔNG được là người duyệt; (3) chỉ khi duyệt xong tồn kho mới thật sự đổi, qua
/// <c>StockLedgerService</c>.
/// </para>
/// </summary>
public class StockAdjustment : Entity<Guid>
{
    public string AdjustmentNumber { get; private set; } = string.Empty;
    public Guid WarehouseId { get; private set; }
    public AdjustmentType Type { get; private set; }
    public string? Reason { get; private set; }
    public DateTime? AdjustedAt { get; private set; }
    public string? AdjustedBy { get; private set; }
    public bool IsApproved { get; private set; }
    public string? ApprovedBy { get; private set; }
    public DateTime? ApprovedAt { get; private set; }

    /// <summary>W2-5: đã ghi bút toán vào sổ cái chưa. Chặn duyệt hai lần cùng post hai lần.</summary>
    public bool IsPosted { get; private set; }
    public DateTime? PostedAt { get; private set; }

    /// <summary>W2-5: lý do từ chối phiếu (bắt buộc khi từ chối).</summary>
    public string? RejectionReason { get; private set; }

    public List<StockAdjustmentItem> Items { get; private set; } = new();

    public StockAdjustment(
        string adjustmentNumber,
        Guid warehouseId,
        AdjustmentType type,
        List<StockAdjustmentItem> items,
        string? reason = null,
        string? adjustedBy = null)
    {
        // Success Criteria W2-5: "điều chỉnh thủ công không có lý do bị từ chối".
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Phiếu điều chỉnh bắt buộc có lý do.", nameof(reason));
        if (items is null || items.Count == 0)
            throw new ArgumentException("Phiếu điều chỉnh phải có ít nhất 1 dòng.", nameof(items));

        Id = Guid.NewGuid();
        AdjustmentNumber = adjustmentNumber;
        WarehouseId = warehouseId;
        Type = type;
        Items = items;
        Reason = reason.Trim();
        AdjustedBy = adjustedBy;
        IsApproved = false;
        AdjustedAt = DateTime.UtcNow;
    }

    protected StockAdjustment() { }

    /// <summary>
    /// Duyệt phiếu. Người duyệt phải KHÁC người ghi phiếu — cùng một tài khoản vừa ghi vừa duyệt
    /// thì bước duyệt không có tác dụng kiểm soát nào.
    /// </summary>
    public void Approve(string approvedBy)
    {
        if (string.IsNullOrWhiteSpace(approvedBy))
            throw new ArgumentException("Thiếu người duyệt.", nameof(approvedBy));
        if (IsApproved)
            throw new InvalidOperationException("Phiếu điều chỉnh đã được duyệt.");
        if (!string.IsNullOrWhiteSpace(AdjustedBy) &&
            string.Equals(AdjustedBy, approvedBy, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Người lập phiếu không được tự duyệt phiếu điều chỉnh.");

        IsApproved = true;
        ApprovedAt = DateTime.UtcNow;
        ApprovedBy = approvedBy;
    }

    public void Reject(string rejectedBy, string reason)
    {
        if (IsApproved)
            throw new InvalidOperationException("Không thể từ chối phiếu đã duyệt.");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Phải nhập lý do từ chối.", nameof(reason));

        RejectionReason = reason.Trim();
        ApprovedBy = rejectedBy;
        IsActive = false;
    }

    /// <summary>Đánh dấu đã ghi sổ cái. Gọi trong CÙNG transaction với các bút toán.</summary>
    public void MarkPosted()
    {
        if (!IsApproved)
            throw new InvalidOperationException("Chỉ phiếu đã duyệt mới được ghi sổ.");
        if (IsPosted)
            throw new InvalidOperationException("Phiếu điều chỉnh đã ghi sổ.");

        IsPosted = true;
        PostedAt = DateTime.UtcNow;
    }

    /// <summary>Mã lý do sổ cái tương ứng với loại phiếu — tránh khai báo trùng hai enum.</summary>
    public StockMovementReason ToMovementReason() => Type switch
    {
        AdjustmentType.Damage => StockMovementReason.Damage,
        AdjustmentType.Loss => StockMovementReason.Loss,
        AdjustmentType.Found => StockMovementReason.Found,
        AdjustmentType.Count => StockMovementReason.CountAdjustment,
        AdjustmentType.Return => StockMovementReason.CustomerReturn,
        AdjustmentType.Expiry => StockMovementReason.Expiry,
        _ => StockMovementReason.ManualAdjustment
    };
}

public class StockAdjustmentItem : Entity<Guid>
{
    public Guid StockAdjustmentId { get; private set; }
    public Guid InventoryItemId { get; private set; }
    public int QuantityBefore { get; private set; }
    public int QuantityAdjusted { get; private set; }
    public int QuantityAfter { get; private set; }
    public string? ProductName { get; private set; }
    public string? ProductSku { get; private set; }

    public StockAdjustmentItem(
        Guid inventoryItemId,
        int quantityBefore,
        int quantityAdjusted,
        string? productName = null,
        string? productSku = null)
    {
        if (quantityAdjusted == 0)
            throw new ArgumentException("Chênh lệch điều chỉnh phải khác 0.", nameof(quantityAdjusted));
        if (quantityBefore + quantityAdjusted < 0)
            throw new ArgumentException("Điều chỉnh làm tồn kho âm.", nameof(quantityAdjusted));

        Id = Guid.NewGuid();
        InventoryItemId = inventoryItemId;
        QuantityBefore = quantityBefore;
        QuantityAdjusted = quantityAdjusted;
        QuantityAfter = quantityBefore + quantityAdjusted;
        ProductName = productName;
        ProductSku = productSku;
    }

    protected StockAdjustmentItem() { }
}

public enum AdjustmentType
{
    Damage,
    Loss,
    Found,
    Count,
    Return,
    Expiry
}
