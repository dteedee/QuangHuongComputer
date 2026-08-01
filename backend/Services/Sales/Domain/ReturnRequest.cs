using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

/// <summary>
/// Phase 07: mở rộng ReturnRequest thành 3 luồng
///   Refund   : hoàn tiền qua phương thức gốc
///   Exchange : đổi sang sản phẩm khác (tính chênh lệch)
///   Replace  : đổi cùng SKU (không phát sinh tiền)
///
/// Quy tắc chống gian lận: chỉ hoàn tiền SAU KHI đã nhận + kiểm hàng (RecordInspection).
/// State machine: Pending → Approved/Rejected → Inspected → Completed
/// </summary>
public class ReturnRequest : Entity<Guid>
{
    public Guid OrderId { get; private set; }
    public Guid OrderItemId { get; private set; }

    // Phase 07: loại luồng
    public ReturnType Type { get; private set; }

    public string Reason { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public ReturnStatus Status { get; private set; }

    // Refund
    public decimal RefundAmount { get; private set; }
    public string? RefundMethod { get; private set; }
    public DateTime? RefundedAt { get; private set; }

    // Exchange (đổi sang sản phẩm khác)
    public Guid? ExchangeProductId { get; private set; }
    public Guid? ExchangeVariantId { get; private set; }
    public Guid? ExchangeOrderId { get; private set; }
    // Dương = khách bù, âm = shop hoàn
    public decimal? PriceDifference { get; private set; }

    // Kiểm hàng nhận về
    public ReceivedCondition? ReceivedCondition { get; private set; }
    public Guid? RestockWarehouseId { get; private set; }
    public DateTime? InspectedAt { get; private set; }
    public Guid? InspectedBy { get; private set; }
    public string? InspectionNotes { get; private set; }

    // Ảnh khách gửi (JSON array URL MinIO)
    public string? AttachmentUrls { get; private set; }

    public DateTime? RequestedAt { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? RejectedAt { get; private set; }
    public string? RejectionReason { get; private set; }
    public string? ProcessedBy { get; private set; }
    public string? CustomerNotes { get; private set; }

    protected ReturnRequest() { }

    // Backward-compatible constructor (giữ nguyên cho luồng hoàn tiền cũ)
    public ReturnRequest(
        Guid orderId,
        Guid orderItemId,
        string reason,
        decimal refundAmount,
        string? description = null,
        string? customerNotes = null)
        : this(orderId, orderItemId, ReturnType.Refund, reason, refundAmount, description, customerNotes)
    { }

    private ReturnRequest(
        Guid orderId,
        Guid orderItemId,
        ReturnType type,
        string reason,
        decimal refundAmount,
        string? description,
        string? customerNotes,
        Guid? exchangeProductId = null,
        Guid? exchangeVariantId = null,
        string? attachmentUrls = null)
    {
        Id = Guid.NewGuid();
        OrderId = orderId;
        OrderItemId = orderItemId;
        Type = type;
        Reason = reason;
        Description = description;
        RefundAmount = refundAmount;
        ExchangeProductId = exchangeProductId;
        ExchangeVariantId = exchangeVariantId;
        AttachmentUrls = attachmentUrls;
        Status = ReturnStatus.Pending;
        RequestedAt = DateTime.UtcNow;
        CustomerNotes = customerNotes;
    }

    // ===== Factory theo 3 luồng =====

    public static ReturnRequest RequestRefund(
        Guid orderId,
        Guid orderItemId,
        string reason,
        decimal refundAmount,
        string? description = null,
        string? attachmentUrls = null,
        string? customerNotes = null)
        => new ReturnRequest(orderId, orderItemId, ReturnType.Refund, reason, refundAmount,
            description, customerNotes, attachmentUrls: attachmentUrls);

    public static ReturnRequest RequestExchange(
        Guid orderId,
        Guid orderItemId,
        Guid newProductId,
        Guid? newVariantId,
        string reason,
        decimal originalItemAmount,
        string? description = null,
        string? attachmentUrls = null,
        string? customerNotes = null)
        => new ReturnRequest(orderId, orderItemId, ReturnType.Exchange, reason, originalItemAmount,
            description, customerNotes, newProductId, newVariantId, attachmentUrls);

    public static ReturnRequest RequestReplace(
        Guid orderId,
        Guid orderItemId,
        string reason,
        decimal originalItemAmount,
        string? description = null,
        string? attachmentUrls = null,
        string? customerNotes = null)
        => new ReturnRequest(orderId, orderItemId, ReturnType.Replace, reason, originalItemAmount,
            description, customerNotes, attachmentUrls: attachmentUrls);

    // ===== State machine =====

    public void Approve(string processedBy, string? refundMethod = null)
    {
        if (Status != ReturnStatus.Pending)
            throw new InvalidOperationException($"Chỉ duyệt được yêu cầu đang chờ. Hiện: {Status}");

        Status = ReturnStatus.Approved;
        ApprovedAt = DateTime.UtcNow;
        ProcessedBy = processedBy;
        RefundMethod = refundMethod;
    }

    public void Reject(string rejectionReason, string processedBy)
    {
        if (Status != ReturnStatus.Pending)
            throw new InvalidOperationException($"Chỉ từ chối được yêu cầu đang chờ. Hiện: {Status}");

        Status = ReturnStatus.Rejected;
        RejectedAt = DateTime.UtcNow;
        RejectionReason = rejectionReason;
        ProcessedBy = processedBy;
    }

    /// <summary>Nhân viên kiểm hàng nhận về → chọn tình trạng + kho nhập.</summary>
    public void RecordInspection(
        ReceivedCondition condition,
        Guid restockWarehouseId,
        Guid inspectedBy,
        string? notes = null)
    {
        if (Status != ReturnStatus.Approved)
            throw new InvalidOperationException($"Chỉ kiểm hàng khi yêu cầu đã duyệt. Hiện: {Status}");

        ReceivedCondition = condition;
        RestockWarehouseId = restockWarehouseId;
        InspectedAt = DateTime.UtcNow;
        InspectedBy = inspectedBy;
        InspectionNotes = notes;
    }

    /// <summary>Cập nhật đơn đổi (Exchange) khi Orchestrator sinh Order mới.</summary>
    public void AttachExchangeOrder(Guid exchangeOrderId, decimal priceDifference)
    {
        if (Type != ReturnType.Exchange)
            throw new InvalidOperationException("Chỉ Exchange mới có ExchangeOrderId.");
        ExchangeOrderId = exchangeOrderId;
        PriceDifference = priceDifference;
    }

    /// <summary>Hoàn tất. Chống gian lận: yêu cầu InspectedAt != null trước khi Complete.</summary>
    public void Complete(string processedBy, decimal? finalRefundAmount = null)
    {
        if (Status != ReturnStatus.Approved)
            throw new InvalidOperationException($"Chỉ hoàn tất yêu cầu đã duyệt. Hiện: {Status}");
        if (InspectedAt == null)
            throw new InvalidOperationException("Không được hoàn tất trước khi kiểm hàng (chống gian lận).");

        if (Type == ReturnType.Refund)
        {
            if (finalRefundAmount.HasValue)
                RefundAmount = finalRefundAmount.Value;
            RefundedAt = DateTime.UtcNow;
        }

        Status = ReturnStatus.Completed;
        ProcessedBy = processedBy;
    }
}

public enum ReturnType
{
    Refund = 1,
    Exchange = 2,
    Replace = 3
}

public enum ReceivedCondition
{
    Intact = 1,              // Nguyên vẹn, còn seal → kho chính
    UsedGood = 2,            // Đã mở, còn tốt → kho Returns
    DefectiveTechnical = 3,  // Lỗi kỹ thuật → kho Defective (gửi hãng)
    UserDamage = 4,          // Hỏng do người dùng → kho Defective, từ chối/trừ tiền
    MissingAccessories = 5   // Thiếu phụ kiện → kho Returns, trừ tiền
}

public enum ReturnStatus
{
    Pending,
    Approved,
    Rejected,
    Refunded,
    Completed,
    Cancelled
}
