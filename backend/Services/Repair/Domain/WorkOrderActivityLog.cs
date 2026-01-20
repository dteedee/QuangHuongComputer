using BuildingBlocks.SharedKernel;

namespace Repair.Domain;

public class WorkOrderActivityLog : Entity<Guid>
{
    public Guid WorkOrderId { get; private set; }
    public string Activity { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public WorkOrderStatus? PreviousStatus { get; private set; }
    public WorkOrderStatus? NewStatus { get; private set; }
    public Guid? PerformedBy { get; private set; }
    public string? PerformedByName { get; private set; }

    // Reference to work order
    public WorkOrder? WorkOrder { get; private set; }

    protected WorkOrderActivityLog() { }

    public WorkOrderActivityLog(
        Guid workOrderId,
        string activity,
        Guid? performedBy = null,
        string? performedByName = null,
        string? description = null,
        WorkOrderStatus? previousStatus = null,
        WorkOrderStatus? newStatus = null)
    {
        Id = Guid.NewGuid();
        WorkOrderId = workOrderId;
        Activity = activity;
        Description = description;
        PreviousStatus = previousStatus;
        NewStatus = newStatus;
        PerformedBy = performedBy;
        PerformedByName = performedByName;
        CreatedAt = DateTime.UtcNow;
    }

    public static WorkOrderActivityLog CreateStatusChange(
        Guid workOrderId,
        WorkOrderStatus previousStatus,
        WorkOrderStatus newStatus,
        Guid? performedBy = null,
        string? performedByName = null,
        string? description = null)
    {
        return new WorkOrderActivityLog(
            workOrderId,
            $"Status changed from {previousStatus} to {newStatus}",
            performedBy,
            performedByName,
            description,
            previousStatus,
            newStatus);
    }

    public static WorkOrderActivityLog CreatePartAdded(
        Guid workOrderId,
        string partName,
        int quantity,
        Guid? performedBy = null,
        string? performedByName = null)
    {
        return new WorkOrderActivityLog(
            workOrderId,
            "Part added",
            performedBy,
            performedByName,
            $"Added {quantity}x {partName}");
    }

    public static WorkOrderActivityLog CreateQuoteGenerated(
        Guid workOrderId,
        string quoteNumber,
        decimal totalCost,
        Guid? performedBy = null,
        string? performedByName = null)
    {
        return new WorkOrderActivityLog(
            workOrderId,
            "Quote generated",
            performedBy,
            performedByName,
            $"Quote {quoteNumber} created with total cost: ${totalCost:F2}");
    }

    public static WorkOrderActivityLog CreateNote(
        Guid workOrderId,
        string note,
        Guid? performedBy = null,
        string? performedByName = null)
    {
        return new WorkOrderActivityLog(
            workOrderId,
            "Note added",
            performedBy,
            performedByName,
            note);
    }
}
