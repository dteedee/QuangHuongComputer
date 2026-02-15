using BuildingBlocks.SharedKernel;

namespace CRM.Domain;

/// <summary>
/// Email marketing campaign
/// </summary>
public class EmailCampaign : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string Subject { get; private set; } = string.Empty;
    public string? PreviewText { get; private set; }
    public string HtmlContent { get; private set; } = string.Empty;
    public string? PlainTextContent { get; private set; }

    /// <summary>
    /// Target segment for this campaign
    /// </summary>
    public Guid? TargetSegmentId { get; private set; }
    public CustomerSegment? TargetSegment { get; private set; }

    /// <summary>
    /// Or target specific lifecycle stages
    /// </summary>
    public string? TargetLifecycleStages { get; private set; } // JSON array

    /// <summary>
    /// Filter by minimum RFM score
    /// </summary>
    public int? MinRfmScore { get; private set; }

    public CampaignStatus Status { get; private set; } = CampaignStatus.Draft;

    /// <summary>
    /// Scheduled send time
    /// </summary>
    public DateTime? ScheduledAt { get; private set; }

    /// <summary>
    /// Actual send time
    /// </summary>
    public DateTime? SentAt { get; private set; }

    /// <summary>
    /// Completed time
    /// </summary>
    public DateTime? CompletedAt { get; private set; }

    // Stats
    public int TotalRecipients { get; private set; }
    public int SentCount { get; private set; }
    public int DeliveredCount { get; private set; }
    public int OpenedCount { get; private set; }
    public int ClickedCount { get; private set; }
    public int BouncedCount { get; private set; }
    public int UnsubscribedCount { get; private set; }

    // Calculated rates
    public decimal OpenRate => TotalRecipients > 0 ? (decimal)OpenedCount / TotalRecipients * 100 : 0;
    public decimal ClickRate => OpenedCount > 0 ? (decimal)ClickedCount / OpenedCount * 100 : 0;
    public decimal BounceRate => TotalRecipients > 0 ? (decimal)BouncedCount / TotalRecipients * 100 : 0;

    /// <summary>
    /// From email address
    /// </summary>
    public string? FromEmail { get; private set; }
    public string? FromName { get; private set; }

    /// <summary>
    /// Reply-to email
    /// </summary>
    public string? ReplyToEmail { get; private set; }

    public List<EmailCampaignRecipient> Recipients { get; private set; } = new();

    public EmailCampaign(string name, string subject, string htmlContent)
    {
        Id = Guid.NewGuid();
        Name = name;
        Subject = subject;
        HtmlContent = htmlContent;
    }

    protected EmailCampaign() { }

    public void Update(string name, string subject, string htmlContent, string? previewText = null)
    {
        if (Status != CampaignStatus.Draft)
            throw new InvalidOperationException("Can only update draft campaigns");

        Name = name;
        Subject = subject;
        HtmlContent = htmlContent;
        PreviewText = previewText;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetPlainTextContent(string plainText)
    {
        PlainTextContent = plainText;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetTargetSegment(Guid segmentId)
    {
        TargetSegmentId = segmentId;
        TargetLifecycleStages = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetTargetLifecycleStages(string stagesJson)
    {
        TargetLifecycleStages = stagesJson;
        TargetSegmentId = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetMinRfmScore(int minScore)
    {
        MinRfmScore = Math.Clamp(minScore, 3, 15);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetSenderInfo(string fromEmail, string fromName, string? replyToEmail = null)
    {
        FromEmail = fromEmail;
        FromName = fromName;
        ReplyToEmail = replyToEmail;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Schedule(DateTime sendAt)
    {
        if (Status != CampaignStatus.Draft)
            throw new InvalidOperationException("Can only schedule draft campaigns");

        Status = CampaignStatus.Scheduled;
        ScheduledAt = sendAt;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Unschedule()
    {
        if (Status != CampaignStatus.Scheduled)
            throw new InvalidOperationException("Can only unschedule scheduled campaigns");

        Status = CampaignStatus.Draft;
        ScheduledAt = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void StartSending(int totalRecipients)
    {
        if (Status != CampaignStatus.Draft && Status != CampaignStatus.Scheduled)
            throw new InvalidOperationException("Cannot start sending this campaign");

        Status = CampaignStatus.Sending;
        TotalRecipients = totalRecipients;
        SentAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsSent()
    {
        if (Status != CampaignStatus.Sending)
            throw new InvalidOperationException("Campaign is not being sent");

        Status = CampaignStatus.Sent;
        CompletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Pause()
    {
        if (Status != CampaignStatus.Sending)
            throw new InvalidOperationException("Can only pause sending campaigns");

        Status = CampaignStatus.Paused;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Resume()
    {
        if (Status != CampaignStatus.Paused)
            throw new InvalidOperationException("Can only resume paused campaigns");

        Status = CampaignStatus.Sending;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        if (Status == CampaignStatus.Sent)
            throw new InvalidOperationException("Cannot cancel sent campaign");

        Status = CampaignStatus.Cancelled;
        UpdatedAt = DateTime.UtcNow;
    }

    public void IncrementSentCount()
    {
        SentCount++;
        UpdatedAt = DateTime.UtcNow;
    }

    public void IncrementDeliveredCount()
    {
        DeliveredCount++;
        UpdatedAt = DateTime.UtcNow;
    }

    public void IncrementOpenedCount()
    {
        OpenedCount++;
        UpdatedAt = DateTime.UtcNow;
    }

    public void IncrementClickedCount()
    {
        ClickedCount++;
        UpdatedAt = DateTime.UtcNow;
    }

    public void IncrementBouncedCount()
    {
        BouncedCount++;
        UpdatedAt = DateTime.UtcNow;
    }

    public void IncrementUnsubscribedCount()
    {
        UnsubscribedCount++;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateStats(int sent, int delivered, int opened, int clicked, int bounced, int unsubscribed)
    {
        SentCount = sent;
        DeliveredCount = delivered;
        OpenedCount = opened;
        ClickedCount = clicked;
        BouncedCount = bounced;
        UnsubscribedCount = unsubscribed;
        UpdatedAt = DateTime.UtcNow;
    }
}
