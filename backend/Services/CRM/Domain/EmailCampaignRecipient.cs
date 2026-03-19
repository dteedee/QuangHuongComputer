using BuildingBlocks.SharedKernel;

namespace CRM.Domain;

/// <summary>
/// Individual recipient of an email campaign
/// </summary>
public class EmailCampaignRecipient : Entity<Guid>
{
    public Guid CampaignId { get; private set; }
    public EmailCampaign Campaign { get; private set; } = null!;

    /// <summary>
    /// CustomerAnalytics ID (tracks which customer received)
    /// </summary>
    public Guid? CustomerAnalyticsId { get; private set; }
    public CustomerAnalytics? CustomerAnalytics { get; private set; }

    /// <summary>
    /// Recipient email (stored separately for tracking)
    /// </summary>
    public string Email { get; private set; } = string.Empty;
    public string? FullName { get; private set; }

    public RecipientStatus Status { get; private set; } = RecipientStatus.Pending;

    // Tracking
    public DateTime? SentAt { get; private set; }
    public DateTime? DeliveredAt { get; private set; }
    public DateTime? OpenedAt { get; private set; }
    public DateTime? ClickedAt { get; private set; }
    public DateTime? BouncedAt { get; private set; }
    public DateTime? UnsubscribedAt { get; private set; }

    // Open/click counts
    public int OpenCount { get; private set; }
    public int ClickCount { get; private set; }

    /// <summary>
    /// Links clicked (JSON array)
    /// </summary>
    public string? ClickedLinks { get; private set; }

    /// <summary>
    /// Bounce reason if bounced
    /// </summary>
    public string? BounceReason { get; private set; }

    /// <summary>
    /// User agent when opened
    /// </summary>
    public string? UserAgent { get; private set; }

    /// <summary>
    /// IP address when opened
    /// </summary>
    public string? IpAddress { get; private set; }

    /// <summary>
    /// Unique tracking ID for this recipient
    /// </summary>
    public string TrackingId { get; private set; } = string.Empty;

    public EmailCampaignRecipient(Guid campaignId, string email, Guid? customerAnalyticsId = null, string? fullName = null)
    {
        Id = Guid.NewGuid();
        CampaignId = campaignId;
        Email = email;
        CustomerAnalyticsId = customerAnalyticsId;
        FullName = fullName;
        TrackingId = Guid.NewGuid().ToString("N"); // Short unique ID for tracking
    }

    protected EmailCampaignRecipient() { }

    public void MarkAsSent()
    {
        Status = RecipientStatus.Sent;
        SentAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsDelivered()
    {
        Status = RecipientStatus.Delivered;
        DeliveredAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RecordOpen(string? userAgent = null, string? ipAddress = null)
    {
        if (Status < RecipientStatus.Opened)
        {
            Status = RecipientStatus.Opened;
            OpenedAt = DateTime.UtcNow;
        }
        OpenCount++;
        UserAgent = userAgent;
        IpAddress = ipAddress;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RecordClick(string link, string? userAgent = null, string? ipAddress = null)
    {
        if (Status < RecipientStatus.Clicked)
        {
            Status = RecipientStatus.Clicked;
            ClickedAt = DateTime.UtcNow;
        }
        ClickCount++;
        UserAgent = userAgent;
        IpAddress = ipAddress;

        // Add to clicked links
        var links = string.IsNullOrEmpty(ClickedLinks)
            ? new List<string>()
            : System.Text.Json.JsonSerializer.Deserialize<List<string>>(ClickedLinks) ?? new List<string>();
        if (!links.Contains(link))
        {
            links.Add(link);
            ClickedLinks = System.Text.Json.JsonSerializer.Serialize(links);
        }

        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsBounced(string reason)
    {
        Status = RecipientStatus.Bounced;
        BouncedAt = DateTime.UtcNow;
        BounceReason = reason;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsUnsubscribed()
    {
        Status = RecipientStatus.Unsubscribed;
        UnsubscribedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsFailed(string reason)
    {
        Status = RecipientStatus.Failed;
        BounceReason = reason;
        UpdatedAt = DateTime.UtcNow;
    }
}
