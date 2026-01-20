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

    // New properties
    public Guid? ServiceBookingId { get; private set; }
    public Guid? CurrentQuoteId { get; private set; }
    public DateTime? AssignedAt { get; private set; }
    public DateTime? DiagnosedAt { get; private set; }
    public DateTime? QuotedAt { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public ServiceType? ServiceType { get; private set; }
    public string? ServiceAddress { get; private set; }
    public decimal ServiceFee { get; private set; }

    // Navigation properties
    public List<WorkOrderPart> Parts { get; private set; } = new();
    public List<RepairQuote> Quotes { get; private set; } = new();
    public List<WorkOrderActivityLog> ActivityLogs { get; private set; } = new();

    public WorkOrder(Guid customerId, string deviceModel, string serialNumber, string description)
    {
        Id = Guid.NewGuid();
        TicketNumber = $"TKT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";
        CustomerId = customerId;
        DeviceModel = deviceModel;
        SerialNumber = serialNumber;
        Description = description;
        Status = WorkOrderStatus.Requested;
        EstimatedCost = 0;
        ActualCost = 0;
        PartsCost = 0;
        LaborCost = 0;
        CreatedAt = DateTime.UtcNow;
    }

    // Constructor from ServiceBooking
    public WorkOrder(ServiceBooking booking, Guid? technicianId = null)
    {
        Id = Guid.NewGuid();
        TicketNumber = $"TKT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";
        CustomerId = booking.CustomerId;
        DeviceModel = booking.DeviceModel;
        SerialNumber = booking.SerialNumber ?? string.Empty;
        Description = booking.IssueDescription;
        ServiceBookingId = booking.Id;
        ServiceType = booking.ServiceType;
        ServiceAddress = booking.ServiceAddress;
        ServiceFee = booking.OnSiteFee;
        EstimatedCost = booking.EstimatedCost;
        Status = technicianId.HasValue ? WorkOrderStatus.Assigned : WorkOrderStatus.Requested;
        TechnicianId = technicianId;
        AssignedAt = technicianId.HasValue ? DateTime.UtcNow : null;
        CreatedAt = DateTime.UtcNow;
    }

    protected WorkOrder() { }

    public void AssignTechnician(Guid technicianId)
    {
        if (Status != WorkOrderStatus.Requested && Status != WorkOrderStatus.Declined)
            throw new InvalidOperationException($"Cannot assign technician when status is {Status}");

        TechnicianId = technicianId;
        Status = WorkOrderStatus.Assigned;
        AssignedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AcceptAssignment()
    {
        if (Status != WorkOrderStatus.Assigned)
            throw new InvalidOperationException("Can only accept when status is Assigned");

        // Status remains Assigned, just confirmed by technician
        UpdatedAt = DateTime.UtcNow;
    }

    public void DeclineAssignment()
    {
        if (Status != WorkOrderStatus.Assigned)
            throw new InvalidOperationException("Can only decline when status is Assigned");

        Status = WorkOrderStatus.Declined;
        TechnicianId = null;
        AssignedAt = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsDiagnosed(string diagnosticNotes)
    {
        if (Status != WorkOrderStatus.Assigned)
            throw new InvalidOperationException("Must be assigned before diagnosis");

        Status = WorkOrderStatus.Diagnosed;
        TechnicalNotes = diagnosticNotes;
        DiagnosedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AddPart(WorkOrderPart part)
    {
        Parts.Add(part);
        CalculatePartsCost();
        UpdatedAt = DateTime.UtcNow;
    }

    public void RemovePart(Guid partId)
    {
        var part = Parts.FirstOrDefault(p => p.Id == partId);
        if (part != null)
        {
            Parts.Remove(part);
            CalculatePartsCost();
            UpdatedAt = DateTime.UtcNow;
        }
    }

    private void CalculatePartsCost()
    {
        PartsCost = Parts.Sum(p => p.TotalPrice);
    }

    public void CreateQuote(RepairQuote quote)
    {
        if (Status != WorkOrderStatus.Diagnosed && Status != WorkOrderStatus.Quoted)
            throw new InvalidOperationException("Must diagnose issue before creating quote");

        Quotes.Add(quote);
        CurrentQuoteId = quote.Id;
        Status = WorkOrderStatus.Quoted;
        QuotedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAwaitingApproval()
    {
        if (Status != WorkOrderStatus.Quoted)
            throw new InvalidOperationException("Must have a quote before awaiting approval");

        Status = WorkOrderStatus.AwaitingApproval;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ApproveQuote()
    {
        if (Status != WorkOrderStatus.AwaitingApproval && Status != WorkOrderStatus.Quoted)
            throw new InvalidOperationException("Must be awaiting approval or quoted");

        Status = WorkOrderStatus.Approved;
        ApprovedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RejectQuote()
    {
        if (Status != WorkOrderStatus.AwaitingApproval && Status != WorkOrderStatus.Quoted)
            throw new InvalidOperationException("Must be awaiting approval or quoted");

        Status = WorkOrderStatus.Rejected;
        UpdatedAt = DateTime.UtcNow;
    }

    public void StartRepair()
    {
        if (Status != WorkOrderStatus.Assigned && Status != WorkOrderStatus.Approved)
            throw new InvalidOperationException("Work order must be assigned or approved before starting");

        Status = WorkOrderStatus.InProgress;
        StartedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void PutOnHold(string reason)
    {
        if (Status != WorkOrderStatus.InProgress)
            throw new InvalidOperationException("Can only put in-progress work orders on hold");

        Status = WorkOrderStatus.OnHold;
        TechnicalNotes = (TechnicalNotes ?? "") + $"\nOn Hold: {reason}";
        UpdatedAt = DateTime.UtcNow;
    }

    public void ResumeFromHold()
    {
        if (Status != WorkOrderStatus.OnHold)
            throw new InvalidOperationException("Can only resume work orders that are on hold");

        Status = WorkOrderStatus.InProgress;
        UpdatedAt = DateTime.UtcNow;
    }

    public void CompleteRepair(decimal? partsCost = null, decimal? laborCost = null, string? notes = null)
    {
        if (Status != WorkOrderStatus.InProgress && Status != WorkOrderStatus.OnHold)
            throw new InvalidOperationException("Work order must be in progress or on hold to complete");

        if (partsCost.HasValue)
            PartsCost = partsCost.Value;
        if (laborCost.HasValue)
            LaborCost = laborCost.Value;

        ActualCost = PartsCost + LaborCost + ServiceFee;

        if (!string.IsNullOrWhiteSpace(notes))
            TechnicalNotes = (TechnicalNotes ?? "") + $"\nCompletion Notes: {notes}";

        Status = WorkOrderStatus.Completed;
        FinishedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel(string reason)
    {
        Status = WorkOrderStatus.Cancelled;
        TechnicalNotes = (TechnicalNotes ?? "") + $"\nCancelled: {reason}";
        UpdatedAt = DateTime.UtcNow;
    }

    public void AddActivityLog(WorkOrderActivityLog log)
    {
        ActivityLogs.Add(log);
    }

    public void AddNote(string note, Guid? performedBy = null, string? performedByName = null)
    {
        var log = WorkOrderActivityLog.CreateNote(Id, note, performedBy, performedByName);
        ActivityLogs.Add(log);
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateStatus(WorkOrderStatus newStatus, string? notes = null)
    {
        var previousStatus = Status;
        Status = newStatus;

        if (!string.IsNullOrWhiteSpace(notes))
            TechnicalNotes = (TechnicalNotes ?? "") + $"\n{notes}";

        UpdatedAt = DateTime.UtcNow;
    }
}
