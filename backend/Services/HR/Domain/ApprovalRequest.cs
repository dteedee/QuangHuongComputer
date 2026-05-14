using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public class ApprovalRequest : Entity<Guid>
{
    public ApprovalType Type { get; set; }
    public Guid ReferenceId { get; set; }
    public Guid RequesterId { get; set; }
    public Guid? ApproverId { get; set; }
    public ApprovalStatus Status { get; set; } = ApprovalStatus.Pending;
    public string? RequesterName { get; set; }
    public string? Comments { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DecidedAt { get; set; }
}

public enum ApprovalType { LeaveRequest, OvertimeRequest, ExpenseClaim }
public enum ApprovalStatus { Pending, Approved, Rejected, Cancelled }
