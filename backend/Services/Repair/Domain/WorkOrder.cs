using BuildingBlocks.SharedKernel;

namespace Repair.Domain;

public class WorkOrder : Entity<Guid>
{
    public string TicketNumber { get; private set; } = string.Empty;
    public Guid CustomerId { get; private set; }
    public string DeviceModel { get; private set; } = string.Empty;
    public string SerialNumber { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public WorkOrderStatus Status { get; private set; }
    public Guid? TechnicianId { get; private set; }
    public decimal EstimatedCost { get; private set; }
    public decimal ActualCost { get; private set; }
    public decimal PartsCost { get; private set; }
    public decimal LaborCost { get; private set; }
    public decimal TotalCost => PartsCost + LaborCost;
    public string? TechnicalNotes { get; private set; }
    public DateTime? StartedAt { get; private set; }
    public DateTime? FinishedAt { get; private set; }

    public WorkOrder(Guid customerId, string deviceModel, string serialNumber, string description)
    {
        Id = Guid.NewGuid();
        TicketNumber = $"TKT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";
        CustomerId = customerId;
        DeviceModel = deviceModel;
        SerialNumber = serialNumber;
        Description = description;
        Status = WorkOrderStatus.Pending;
        EstimatedCost = 0;
        ActualCost = 0;
        PartsCost = 0;
        LaborCost = 0;
    }

    protected WorkOrder() { }

    public void AssignTechnician(Guid technicianId)
    {
        TechnicianId = technicianId;
        Status = WorkOrderStatus.Assigned;
    }

    public void StartRepair()
    {
        if (Status != WorkOrderStatus.Assigned)
            throw new InvalidOperationException("Work order must be assigned before starting");
        
        Status = WorkOrderStatus.InProgress;
        StartedAt = DateTime.UtcNow;
    }

    public void CompleteRepair(decimal partsCost, decimal laborCost, string? notes)
    {
        if (Status != WorkOrderStatus.InProgress && Status != WorkOrderStatus.OnHold)
            throw new InvalidOperationException("Work order must be in progress or on hold to complete");

        PartsCost = partsCost;
        LaborCost = laborCost;
        ActualCost = partsCost + laborCost;
        TechnicalNotes = notes;
        Status = WorkOrderStatus.Completed;
        FinishedAt = DateTime.UtcNow;
    }

    public void Cancel(string reason)
    {
        Status = WorkOrderStatus.Cancelled;
        TechnicalNotes = $"Cancelled: {reason}";
    }
}
