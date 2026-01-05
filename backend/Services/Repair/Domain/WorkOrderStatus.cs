namespace Repair.Domain;

public enum WorkOrderStatus
{
    Pending = 0,
    Assigned = 1,
    InProgress = 2,
    OnHold = 3,
    Completed = 4,
    Cancelled = 5
}
