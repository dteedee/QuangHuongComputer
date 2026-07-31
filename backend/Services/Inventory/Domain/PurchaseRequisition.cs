using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Đề nghị mua hàng (Purchase Requisition — PR).
/// Nguồn: AutoReorderService khi tồn ≤ điểm đặt hàng, hoặc nhân viên tự tạo.
/// Vòng đời: Draft → Submitted → Approved → ConvertedToPO | Rejected | Cancelled.
/// Ghi lý do, mức khẩn để bộ phận mua hàng ưu tiên.
/// </summary>
public class PurchaseRequisition : Entity<Guid>
{
    public string Number { get; private set; } = string.Empty;
    public Guid RequestedBy { get; private set; }
    public string? RequesterName { get; private set; }
    public DateTime RequestedAt { get; private set; } = DateTime.UtcNow;
    public UrgencyLevel Urgency { get; private set; } = UrgencyLevel.Medium;
    public string? Reason { get; private set; }
    public PurchaseRequisitionStatus Status { get; private set; } = PurchaseRequisitionStatus.Draft;
    public List<PurchaseRequisitionItem> Items { get; private set; } = new();

    public Guid? ApprovedBy { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public Guid? RejectedBy { get; private set; }
    public DateTime? RejectedAt { get; private set; }
    public string? RejectionReason { get; private set; }

    public Guid? ConvertedPOId { get; private set; }
    public DateTime? ConvertedAt { get; private set; }

    // Nguồn tạo: "Manual" hoặc "AutoReorder"
    public string Source { get; private set; } = "Manual";

    protected PurchaseRequisition() { }

    public PurchaseRequisition(
        Guid requestedBy,
        string? requesterName,
        List<PurchaseRequisitionItem> items,
        UrgencyLevel urgency = UrgencyLevel.Medium,
        string? reason = null,
        string source = "Manual")
    {
        if (items == null || items.Count == 0)
            throw new ArgumentException("Đề nghị mua phải có ít nhất 1 sản phẩm.", nameof(items));

        Id = Guid.NewGuid();
        Number = $"PR-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";
        RequestedBy = requestedBy;
        RequesterName = requesterName;
        Items = items;
        Urgency = urgency;
        Reason = reason;
        Source = source;
    }

    public void Submit()
    {
        if (Status != PurchaseRequisitionStatus.Draft)
            throw new InvalidOperationException("Chỉ đề nghị nháp mới có thể gửi duyệt.");
        Status = PurchaseRequisitionStatus.Submitted;
    }

    public void Approve(Guid approverUserId)
    {
        if (Status != PurchaseRequisitionStatus.Submitted)
            throw new InvalidOperationException("Chỉ đề nghị đã gửi mới có thể duyệt.");
        Status = PurchaseRequisitionStatus.Approved;
        ApprovedBy = approverUserId;
        ApprovedAt = DateTime.UtcNow;
    }

    public void Reject(Guid approverUserId, string reason)
    {
        if (Status != PurchaseRequisitionStatus.Submitted)
            throw new InvalidOperationException("Chỉ đề nghị đã gửi mới có thể từ chối.");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Phải nhập lý do từ chối.", nameof(reason));
        Status = PurchaseRequisitionStatus.Rejected;
        RejectedBy = approverUserId;
        RejectedAt = DateTime.UtcNow;
        RejectionReason = reason;
    }

    public void Cancel()
    {
        if (Status == PurchaseRequisitionStatus.ConvertedToPO)
            throw new InvalidOperationException("Đã chuyển sang PO, không thể huỷ.");
        Status = PurchaseRequisitionStatus.Cancelled;
    }

    /// <summary>Chuyển đề nghị thành PO. Trả về entity PO đã tạo (chưa lưu DB).</summary>
    public PurchaseOrder ConvertToPO(Guid supplierId, Guid createdByUserId, Dictionary<Guid, decimal> unitPrices)
    {
        if (Status != PurchaseRequisitionStatus.Approved)
            throw new InvalidOperationException("Chỉ đề nghị đã duyệt mới có thể chuyển thành PO.");

        var poItems = Items.Select(it =>
        {
            var price = unitPrices.TryGetValue(it.ProductId, out var p) ? p : 0m;
            return new PurchaseOrderItem(it.ProductId, it.Quantity, price, it.ProductName);
        }).ToList();

        var po = new PurchaseOrder(supplierId, poItems, createdByUserId, isUrgent: Urgency == UrgencyLevel.Urgent);
        po.LinkToRequisition(Id);

        Status = PurchaseRequisitionStatus.ConvertedToPO;
        ConvertedPOId = po.Id;
        ConvertedAt = DateTime.UtcNow;
        return po;
    }
}

public class PurchaseRequisitionItem : Entity<Guid>
{
    public Guid PurchaseRequisitionId { get; set; }
    public Guid ProductId { get; private set; }
    public string ProductName { get; private set; } = string.Empty;
    public int Quantity { get; private set; }
    public string? Notes { get; private set; }

    protected PurchaseRequisitionItem() { }

    public PurchaseRequisitionItem(Guid productId, string productName, int quantity, string? notes = null)
    {
        if (quantity <= 0) throw new ArgumentException("Số lượng phải > 0.", nameof(quantity));
        Id = Guid.NewGuid();
        ProductId = productId;
        ProductName = productName;
        Quantity = quantity;
        Notes = notes;
    }
}

public enum PurchaseRequisitionStatus
{
    Draft = 0,
    Submitted = 1,
    Approved = 2,
    Rejected = 3,
    ConvertedToPO = 4,
    Cancelled = 5
}

public enum UrgencyLevel
{
    Low = 0,
    Medium = 1,
    High = 2,
    Urgent = 3
}
