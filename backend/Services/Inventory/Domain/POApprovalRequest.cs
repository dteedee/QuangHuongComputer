using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Yêu cầu duyệt PO nội bộ module Inventory (không dùng HR.ApprovalRequest
/// để tránh coupling cross-module — HR.ApprovalRequest chỉ phục vụ nghiệp vụ nhân sự).
/// Ghi lại: ai gửi, khoản tiền, rule khớp, người phải duyệt, quyết định.
/// </summary>
public class POApprovalRequest : Entity<Guid>
{
    public Guid PurchaseOrderId { get; private set; }
    public Guid RuleId { get; private set; }
    public string RequiredRole { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public Guid RequestedBy { get; private set; }
    public POApprovalDecision Decision { get; private set; } = POApprovalDecision.Pending;
    public Guid? DecidedBy { get; private set; }
    public DateTime? DecidedAt { get; private set; }
    public string? Reason { get; private set; }

    protected POApprovalRequest() { }

    public POApprovalRequest(Guid purchaseOrderId, Guid ruleId, string requiredRole, decimal amount, Guid requestedBy)
    {
        Id = Guid.NewGuid();
        PurchaseOrderId = purchaseOrderId;
        RuleId = ruleId;
        RequiredRole = requiredRole;
        Amount = amount;
        RequestedBy = requestedBy;
    }

    public void Approve(Guid approverUserId)
    {
        if (Decision != POApprovalDecision.Pending)
            throw new InvalidOperationException("Yêu cầu đã có quyết định.");
        Decision = POApprovalDecision.Approved;
        DecidedBy = approverUserId;
        DecidedAt = DateTime.UtcNow;
    }

    public void Reject(Guid approverUserId, string reason)
    {
        if (Decision != POApprovalDecision.Pending)
            throw new InvalidOperationException("Yêu cầu đã có quyết định.");
        Decision = POApprovalDecision.Rejected;
        DecidedBy = approverUserId;
        DecidedAt = DateTime.UtcNow;
        Reason = reason;
    }
}

public enum POApprovalDecision
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}
