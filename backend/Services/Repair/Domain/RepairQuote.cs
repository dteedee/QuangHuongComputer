using BuildingBlocks.SharedKernel;

namespace Repair.Domain;

public class RepairQuote : Entity<Guid>
{
    public Guid WorkOrderId { get; private set; }
    public string QuoteNumber { get; private set; } = string.Empty;

    // Costs
    public decimal PartsCost { get; private set; }
    public decimal LaborCost { get; private set; }
    public decimal ServiceFee { get; private set; }
    public decimal TotalCost => PartsCost + LaborCost + ServiceFee;

    // Labor Details
    public decimal EstimatedHours { get; private set; }
    public decimal HourlyRate { get; private set; }

    // Description
    public string? Description { get; private set; }
    public string? Notes { get; private set; }

    // Status
    public QuoteStatus Status { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? RejectedAt { get; private set; }
    public string? RejectionReason { get; private set; }

    // Validity
    public DateTime ValidUntil { get; private set; }

    // Reference to work order
    public WorkOrder? WorkOrder { get; private set; }

    protected RepairQuote() { }

    public RepairQuote(
        Guid workOrderId,
        decimal partsCost,
        decimal laborCost,
        decimal serviceFee,
        decimal estimatedHours,
        decimal hourlyRate,
        string? description = null,
        string? notes = null)
    {
        if (partsCost < 0 || laborCost < 0 || serviceFee < 0)
            throw new ArgumentException("Costs cannot be negative");

        if (estimatedHours < 0)
            throw new ArgumentException("Estimated hours cannot be negative");

        if (hourlyRate < 0)
            throw new ArgumentException("Hourly rate cannot be negative");

        Id = Guid.NewGuid();
        WorkOrderId = workOrderId;
        QuoteNumber = GenerateQuoteNumber();
        PartsCost = partsCost;
        LaborCost = laborCost;
        ServiceFee = serviceFee;
        EstimatedHours = estimatedHours;
        HourlyRate = hourlyRate;
        Description = description;
        Notes = notes;
        Status = QuoteStatus.Pending;
        ValidUntil = DateTime.UtcNow.AddDays(7); // 7 days validity
        CreatedAt = DateTime.UtcNow;
    }

    private static string GenerateQuoteNumber()
    {
        return $"QT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
    }

    public void Approve()
    {
        if (DateTime.UtcNow > ValidUntil)
            throw new InvalidOperationException("Quote has expired");

        if (Status != QuoteStatus.Pending)
            throw new InvalidOperationException($"Cannot approve quote in {Status} status");

        Status = QuoteStatus.Approved;
        ApprovedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reject(string reason)
    {
        if (Status != QuoteStatus.Pending)
            throw new InvalidOperationException($"Cannot reject quote in {Status} status");

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Rejection reason is required", nameof(reason));

        Status = QuoteStatus.Rejected;
        RejectedAt = DateTime.UtcNow;
        RejectionReason = reason;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsExpired()
    {
        if (DateTime.UtcNow > ValidUntil && Status == QuoteStatus.Pending)
        {
            Status = QuoteStatus.Expired;
            UpdatedAt = DateTime.UtcNow;
        }
    }

    public void UpdateCosts(decimal? partsCost = null, decimal? laborCost = null, decimal? serviceFee = null)
    {
        if (Status != QuoteStatus.Pending)
            throw new InvalidOperationException("Cannot update costs for non-pending quote");

        if (partsCost.HasValue)
        {
            if (partsCost.Value < 0)
                throw new ArgumentException("Parts cost cannot be negative");
            PartsCost = partsCost.Value;
        }

        if (laborCost.HasValue)
        {
            if (laborCost.Value < 0)
                throw new ArgumentException("Labor cost cannot be negative");
            LaborCost = laborCost.Value;
        }

        if (serviceFee.HasValue)
        {
            if (serviceFee.Value < 0)
                throw new ArgumentException("Service fee cannot be negative");
            ServiceFee = serviceFee.Value;
        }

        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsExpired()
    {
        return DateTime.UtcNow > ValidUntil;
    }
}
