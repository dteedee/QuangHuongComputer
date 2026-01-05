using BuildingBlocks.SharedKernel;

namespace Repair.Domain;

public enum RepairStatus
{
    Pending,
    Diagnosing,
    InRepair,
    Testing,
    ReadyForPickup,
    Completed,
    Cancelled
}

public class RepairRequest : Entity<Guid>
{
    public Guid CustomerId { get; private set; }
    public string DeviceModel { get; private set; } = string.Empty;
    public string SerialNumber { get; private set; } = string.Empty;
    public string IssueDescription { get; private set; } = string.Empty;
    public RepairStatus Status { get; private set; }
    public decimal EstimatedCost { get; private set; }
    public string? technicianNotes { get; private set; }
    public DateTime RequestDate { get; private set; }
    public DateTime? CompletedDate { get; private set; }

    public RepairRequest(Guid customerId, string deviceModel, string serialNumber, string issueDescription)
    {
        Id = Guid.NewGuid();
        CustomerId = customerId;
        DeviceModel = deviceModel;
        SerialNumber = serialNumber;
        IssueDescription = issueDescription;
        Status = RepairStatus.Pending;
        RequestDate = DateTime.UtcNow;
    }

    protected RepairRequest() { }

    public void UpdateStatus(RepairStatus status, string? notes = null)
    {
        Status = status;
        if (notes != null) technicianNotes = notes;
        if (status == RepairStatus.Completed) CompletedDate = DateTime.UtcNow;
    }

    public void SetEstimatedCost(decimal cost) => EstimatedCost = cost;
}
