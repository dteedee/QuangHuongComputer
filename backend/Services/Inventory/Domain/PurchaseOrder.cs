using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Purchase Order — đơn đặt hàng NCC.
/// Từ Phase 05 luồng A: bổ sung quy trình duyệt nhiều cấp theo hạn mức tiền.
/// Vòng đời: Draft → PendingApproval → Approved → Sent → PartialReceived/Received.
/// Rejected → có thể quay về Draft để chỉnh sửa (do lời gọi ứng dụng quyết định).
/// </summary>
public class PurchaseOrder : Entity<Guid>
{
    public string PONumber { get; private set; } = string.Empty;
    public Guid SupplierId { get; private set; }
    public POStatus Status { get; private set; }
    public decimal TotalAmount { get; private set; }
    public List<PurchaseOrderItem> Items { get; private set; } = new();

    // Workflow duyệt
    public Guid? CreatedByUserId { get; private set; }
    public Guid? SubmittedBy { get; private set; }
    public DateTime? SubmittedAt { get; private set; }
    public Guid? ApprovedBy { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public Guid? RejectedBy { get; private set; }
    public DateTime? RejectedAt { get; private set; }
    public string? RejectionReason { get; private set; }
    public bool IsUrgent { get; private set; }

    // Nguồn (tuỳ chọn): PO có thể sinh từ RFQ hoặc PurchaseRequisition
    public Guid? RequisitionId { get; private set; }
    public Guid? SupplierQuotationId { get; private set; }

    public PurchaseOrder(Guid supplierId, List<PurchaseOrderItem> items, Guid? createdByUserId = null, bool isUrgent = false)
    {
        Id = Guid.NewGuid();
        PONumber = $"PO-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";
        SupplierId = supplierId;
        Status = POStatus.Draft;
        Items = items;
        TotalAmount = items.Sum(i => i.Quantity * i.UnitPrice);
        CreatedByUserId = createdByUserId;
        IsUrgent = isUrgent;
    }

    protected PurchaseOrder() { }

    // === Workflow duyệt ===

    /// <summary>Gửi đơn để duyệt. Từ Draft → PendingApproval.</summary>
    public void SubmitForApproval(Guid userId)
    {
        if (Status != POStatus.Draft && Status != POStatus.Rejected)
            throw new InvalidOperationException("Chỉ đơn nháp hoặc bị từ chối mới có thể gửi duyệt.");
        Status = POStatus.PendingApproval;
        SubmittedBy = userId;
        SubmittedAt = DateTime.UtcNow;
    }

    /// <summary>Duyệt đơn. Kiểm tra chặn tự duyệt được thực hiện ở service layer.</summary>
    public void Approve(Guid approverUserId)
    {
        if (Status != POStatus.PendingApproval)
            throw new InvalidOperationException("Chỉ đơn đang chờ duyệt mới có thể duyệt.");
        Status = POStatus.Approved;
        ApprovedBy = approverUserId;
        ApprovedAt = DateTime.UtcNow;
    }

    /// <summary>Từ chối đơn. Bắt buộc có lý do.</summary>
    public void Reject(Guid approverUserId, string reason)
    {
        if (Status != POStatus.PendingApproval)
            throw new InvalidOperationException("Chỉ đơn đang chờ duyệt mới có thể từ chối.");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Phải nhập lý do từ chối.", nameof(reason));
        Status = POStatus.Rejected;
        RejectedBy = approverUserId;
        RejectedAt = DateTime.UtcNow;
        RejectionReason = reason;
    }

    /// <summary>Người tạo mở lại đơn bị từ chối để chỉnh sửa. Rejected → Draft.</summary>
    public void ReopenForEdit()
    {
        if (Status != POStatus.Rejected)
            throw new InvalidOperationException("Chỉ đơn bị từ chối mới có thể mở lại để sửa.");
        Status = POStatus.Draft;
    }

    // === Gửi & nhận ===

    /// <summary>Gửi PO cho NCC. Bắt buộc đã Approved (Phase 05 siết bằng duyệt).</summary>
    public void Send()
    {
        if (Status != POStatus.Approved)
            throw new InvalidOperationException("Chỉ đơn đã được duyệt mới có thể gửi NCC.");
        Status = POStatus.Sent;
    }

    public void ReceiveAll()
    {
        if (Status != POStatus.Sent && Status != POStatus.PartialReceived)
            throw new InvalidOperationException("Chỉ đơn đã gửi mới có thể nhận hàng.");
        Status = POStatus.Received;
    }

    public void MarkPartialReceived()
    {
        if (Status != POStatus.Sent && Status != POStatus.PartialReceived)
            throw new InvalidOperationException("Chỉ đơn đã gửi mới có thể nhận từng phần.");
        Status = POStatus.PartialReceived;
    }

    public void Cancel()
    {
        if (Status == POStatus.Received || Status == POStatus.Cancelled)
            throw new InvalidOperationException("Không thể hủy đơn này.");
        Status = POStatus.Cancelled;
    }

    // === Gán liên kết nguồn ===
    public void LinkToRequisition(Guid requisitionId) => RequisitionId = requisitionId;
    public void LinkToQuotation(Guid quotationId) => SupplierQuotationId = quotationId;
}

public class PurchaseOrderItem
{
    public Guid ProductId { get; private set; }
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public string ProductName { get; private set; } = string.Empty;

    public PurchaseOrderItem(Guid productId, int quantity, decimal unitPrice, string productName = "")
    {
        ProductId = productId;
        Quantity = quantity;
        UnitPrice = unitPrice;
        ProductName = productName;
    }

    protected PurchaseOrderItem() { }
}
