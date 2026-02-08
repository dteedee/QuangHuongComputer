using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

public class ReturnRequest : Entity<Guid>
{
    public Guid OrderId { get; private set; }
    public Guid OrderItemId { get; private set; }
    public string Reason { get; private set; }
    public string? Description { get; private set; }
    public ReturnStatus Status { get; private set; }
    public decimal RefundAmount { get; private set; }
    public string? RefundMethod { get; private set; }
    public DateTime? RequestedAt { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? RejectedAt { get; private set; }
    public string? RejectionReason { get; private set; }
    public DateTime? RefundedAt { get; private set; }
    public string? ProcessedBy { get; private set; }
    public string? CustomerNotes { get; private set; }
    
    public ReturnRequest(
        Guid orderId,
        Guid orderItemId,
        string reason,
        decimal refundAmount,
        string? description = null,
        string? customerNotes = null)
    {
        Id = Guid.NewGuid();
        OrderId = orderId;
        OrderItemId = orderItemId;
        Reason = reason;
        Description = description;
        RefundAmount = refundAmount;
        Status = ReturnStatus.Pending;
        RequestedAt = DateTime.UtcNow;
        CustomerNotes = customerNotes;
    }

    protected ReturnRequest() { }

    public void Approve(string processedBy, string? refundMethod = null)
    {
        if (Status != ReturnStatus.Pending)
            throw new InvalidOperationException($"Can only approve pending returns. Current status: {Status}");

        Status = ReturnStatus.Approved;
        ApprovedAt = DateTime.UtcNow;
        ProcessedBy = processedBy;
        RefundMethod = refundMethod;
    }

    public void Reject(string rejectionReason, string processedBy)
    {
        if (Status != ReturnStatus.Pending)
            throw new InvalidOperationException($"Can only reject pending returns. Current status: {Status}");

        Status = ReturnStatus.Rejected;
        RejectedAt = DateTime.UtcNow;
        RejectionReason = rejectionReason;
        ProcessedBy = processedBy;
    }

    public void ProcessRefund(string processedBy)
    {
        if (Status != ReturnStatus.Approved)
            throw new InvalidOperationException($"Can only refund approved returns. Current status: {Status}");

        Status = ReturnStatus.Refunded;
        RefundedAt = DateTime.UtcNow;
        ProcessedBy = processedBy;
    }

    public void Complete(string processedBy)
    {
        if (Status != ReturnStatus.Refunded)
            throw new InvalidOperationException($"Can only complete refunded returns. Current status: {Status}");

        Status = ReturnStatus.Completed;
        ProcessedBy = processedBy;
    }
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
