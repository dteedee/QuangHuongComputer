using BuildingBlocks.SharedKernel;

namespace Warranty.Domain;

public enum ClaimStatus
{
    Pending,
    Approved,
    Rejected,
    Resolved
}

public enum ResolutionPreference
{
    Repair,
    Replace,
    Refund
}

public class WarrantyClaim : Entity<Guid>
{
    public Guid CustomerId { get; private set; }
    public string SerialNumber { get; private set; }
    public string IssueDescription { get; private set; }
    public ClaimStatus Status { get; private set; }
    public DateTime FiledDate { get; private set; }
    public DateTime? ResolvedDate { get; private set; }
    public string? ResolutionNotes { get; private set; }
    public ResolutionPreference PreferredResolution { get; private set; }
    public List<string> AttachmentUrls { get; private set; } = new();
    public bool IsManagerOverride { get; private set; }

    public WarrantyClaim(Guid customerId, string serialNumber, string issueDescription, ResolutionPreference preferredResolution = ResolutionPreference.Repair, List<string>? attachmentUrls = null, bool isManagerOverride = false)
    {
        Id = Guid.NewGuid();
        CustomerId = customerId;
        SerialNumber = serialNumber;
        IssueDescription = issueDescription;
        Status = ClaimStatus.Pending;
        FiledDate = DateTime.UtcNow;
        PreferredResolution = preferredResolution;
        AttachmentUrls = attachmentUrls ?? new List<string>();
        IsManagerOverride = isManagerOverride;
    }

    protected WarrantyClaim() { }

    public void Approve()
    {
        Status = ClaimStatus.Approved;
    }

    public void Reject(string reason)
    {
        Status = ClaimStatus.Rejected;
        ResolutionNotes = reason;
        ResolvedDate = DateTime.UtcNow;
    }

    public void Resolve(string notes)
    {
        Status = ClaimStatus.Resolved;
        ResolutionNotes = notes;
        ResolvedDate = DateTime.UtcNow;
    }
}
