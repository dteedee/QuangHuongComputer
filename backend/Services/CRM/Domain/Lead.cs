using BuildingBlocks.SharedKernel;

namespace CRM.Domain;

/// <summary>
/// Potential customer before conversion
/// </summary>
public class Lead : Entity<Guid>
{
    public string FullName { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string? Phone { get; private set; }
    public string? Company { get; private set; }
    public string? JobTitle { get; private set; }

    // Lead info
    public LeadSource Source { get; private set; }
    public string? SourceDetail { get; private set; } // e.g., specific ad campaign
    public LeadStatus Status { get; private set; } = LeadStatus.New;

    // Pipeline
    public Guid? PipelineStageId { get; private set; }
    public LeadPipelineStage? PipelineStage { get; private set; }

    // Assignment
    public Guid? AssignedToUserId { get; private set; }
    public string? AssignedToUserName { get; private set; }

    // Value
    public decimal? EstimatedValue { get; private set; }
    public string? Currency { get; private set; } = "VND";

    // Follow-up
    public DateTime? NextFollowUpAt { get; private set; }
    public string? NextFollowUpNote { get; private set; }

    // Conversion
    public bool IsConverted { get; private set; }
    public Guid? ConvertedCustomerId { get; private set; }
    public DateTime? ConvertedAt { get; private set; }

    // Loss reason if lost
    public string? LossReason { get; private set; }

    // Notes
    public string? Notes { get; private set; }

    // Address
    public string? Address { get; private set; }
    public string? City { get; private set; }
    public string? District { get; private set; }

    // Interests
    public string? InterestedProducts { get; private set; } // JSON array of product IDs or names

    // Interactions
    public List<CustomerInteraction> Interactions { get; private set; } = new();

    public Lead(string fullName, string email, LeadSource source)
    {
        Id = Guid.NewGuid();
        FullName = fullName;
        Email = email;
        Source = source;
        Status = LeadStatus.New;
    }

    protected Lead() { }

    public void Update(string fullName, string? phone, string? company, string? jobTitle,
        string? address, string? city, string? district, string? notes)
    {
        FullName = fullName;
        Phone = phone;
        Company = company;
        JobTitle = jobTitle;
        Address = address;
        City = city;
        District = district;
        Notes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AssignTo(Guid userId, string userName)
    {
        AssignedToUserId = userId;
        AssignedToUserName = userName;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Unassign()
    {
        AssignedToUserId = null;
        AssignedToUserName = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetPipelineStage(Guid stageId)
    {
        PipelineStageId = stageId;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateStatus(LeadStatus status, string? lossReason = null)
    {
        Status = status;
        if (status == LeadStatus.Lost)
        {
            LossReason = lossReason;
        }
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetEstimatedValue(decimal value)
    {
        EstimatedValue = value;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetFollowUp(DateTime followUpDate, string? note = null)
    {
        NextFollowUpAt = followUpDate;
        NextFollowUpNote = note;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ClearFollowUp()
    {
        NextFollowUpAt = null;
        NextFollowUpNote = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetInterestedProducts(string productsJson)
    {
        InterestedProducts = productsJson;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Convert lead to customer
    /// </summary>
    public void Convert(Guid customerId)
    {
        if (IsConverted)
            throw new InvalidOperationException("Lead is already converted");

        IsConverted = true;
        ConvertedCustomerId = customerId;
        ConvertedAt = DateTime.UtcNow;
        Status = LeadStatus.Won;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Mark lead as lost
    /// </summary>
    public void MarkAsLost(string reason)
    {
        Status = LeadStatus.Lost;
        LossReason = reason;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Move to contacted status
    /// </summary>
    public void MarkAsContacted()
    {
        if (Status == LeadStatus.New)
        {
            Status = LeadStatus.Contacted;
            UpdatedAt = DateTime.UtcNow;
        }
    }

    /// <summary>
    /// Mark as qualified
    /// </summary>
    public void Qualify()
    {
        Status = LeadStatus.Qualified;
        UpdatedAt = DateTime.UtcNow;
    }
}
