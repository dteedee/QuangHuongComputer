namespace Repair.Domain;

public enum BookingStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Converted = 3  // Converted to WorkOrder
}
