using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public class LeaveRequest : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public LeaveType Type { get; private set; }
    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }
    public decimal Days { get; private set; }
    public string? Reason { get; private set; }
    public RequestStatus Status { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public string? ApprovedBy { get; private set; }
    public string? RejectReason { get; private set; }
    public DateTime? RejectedAt { get; private set; }
    public string? RejectedBy { get; private set; }
    public DateTime? CancelledAt { get; private set; }
    public string? HandoverNotes { get; private set; }
    public string? HandoverTo { get; private set; }
    public string? ContactDuringLeave { get; private set; }
    public bool IsPaidLeave { get; private set; }

    public LeaveRequest(
        Guid employeeId,
        LeaveType type,
        DateTime startDate,
        DateTime endDate,
        decimal days,
        string? reason = null,
        bool isPaidLeave = true,
        string? handoverNotes = null,
        string? handoverTo = null,
        string? contactDuringLeave = null)
    {
        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        Type = type;
        StartDate = startDate;
        EndDate = endDate;
        Days = days;
        Reason = reason;
        Status = RequestStatus.Pending;
        IsPaidLeave = isPaidLeave;
        HandoverNotes = handoverNotes;
        HandoverTo = handoverTo;
        ContactDuringLeave = contactDuringLeave;
    }

    protected LeaveRequest() { }

    public void Approve(string approvedBy)
    {
        if (Status != RequestStatus.Pending)
            throw new InvalidOperationException($"Cannot approve leave request in status {Status}");

        Status = RequestStatus.Approved;
        ApprovedAt = DateTime.UtcNow;
        ApprovedBy = approvedBy;
    }

    public void Reject(string rejectReason, string rejectedBy)
    {
        if (Status != RequestStatus.Pending)
            throw new InvalidOperationException($"Cannot reject leave request in status {Status}");

        Status = RequestStatus.Rejected;
        RejectReason = rejectReason;
        RejectedAt = DateTime.UtcNow;
        RejectedBy = rejectedBy;
    }

    public void Cancel()
    {
        if (Status == RequestStatus.Approved && StartDate <= DateTime.UtcNow.AddDays(-1))
            throw new InvalidOperationException("Cannot cancel leave that has already started");

        if (Status == RequestStatus.Cancelled)
            throw new InvalidOperationException("Leave request is already cancelled");

        Status = RequestStatus.Cancelled;
        CancelledAt = DateTime.UtcNow;
    }

    public void UpdateDates(DateTime startDate, DateTime endDate, decimal days)
    {
        if (Status != RequestStatus.Pending)
            throw new InvalidOperationException("Cannot modify non-pending leave request");

        StartDate = startDate;
        EndDate = endDate;
        Days = days;
    }
}

public enum LeaveType
{
    Annual,
    Sick,
    Unpaid,
    Personal,
    Maternity,
    Paternity,
    Bereavement,
    Compassionate,
    Study,
    JuryDuty
}

public enum RequestStatus
{
    Pending,
    Approved,
    Rejected,
    Cancelled
}
