namespace Repair.Domain;

public enum WorkOrderStatus
{
    Requested = 0,          // Initial booking
    Assigned = 1,           // Technician assigned
    Declined = 2,           // Technician declined
    Diagnosed = 3,          // Issue diagnosed
    Quoted = 4,             // Quote created
    AwaitingApproval = 5,   // Waiting for customer approval
    Approved = 6,           // Customer approved quote
    Rejected = 7,           // Customer rejected quote
    InProgress = 8,         // Repair in progress
    OnHold = 9,             // Paused
    Completed = 10,         // Finished
    Cancelled = 11,         // Cancelled

    // Legacy statuses for backward compatibility
    Pending = 0             // Maps to Requested
}
