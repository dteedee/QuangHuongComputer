using BuildingBlocks.SharedKernel;

namespace CRM.Domain;

/// <summary>
/// Timeline of interactions with a customer or lead
/// </summary>
public class CustomerInteraction : Entity<Guid>
{
    /// <summary>
    /// CustomerAnalytics ID (if interaction with existing customer)
    /// </summary>
    public Guid? CustomerAnalyticsId { get; private set; }
    public CustomerAnalytics? CustomerAnalytics { get; private set; }

    /// <summary>
    /// Lead ID (if interaction with a lead)
    /// </summary>
    public Guid? LeadId { get; private set; }
    public Lead? Lead { get; private set; }

    public InteractionType Type { get; private set; }
    public string Subject { get; private set; } = string.Empty;
    public string? Content { get; private set; }

    /// <summary>
    /// User who performed/logged this interaction
    /// </summary>
    public Guid PerformedByUserId { get; private set; }
    public string PerformedByUserName { get; private set; } = string.Empty;

    /// <summary>
    /// When did this interaction happen
    /// </summary>
    public DateTime PerformedAt { get; private set; }

    /// <summary>
    /// Duration in minutes (for calls, meetings)
    /// </summary>
    public int? DurationMinutes { get; private set; }

    /// <summary>
    /// Call outcome (for calls)
    /// </summary>
    public string? CallOutcome { get; private set; }

    /// <summary>
    /// Meeting location (for meetings)
    /// </summary>
    public string? MeetingLocation { get; private set; }

    /// <summary>
    /// Scheduled follow-up date
    /// </summary>
    public DateTime? FollowUpDate { get; private set; }
    public string? FollowUpNote { get; private set; }

    /// <summary>
    /// Sentiment/outcome of interaction
    /// </summary>
    public string? Sentiment { get; private set; } // Positive, Neutral, Negative

    /// <summary>
    /// Attachments (JSON array of file paths/URLs)
    /// </summary>
    public string? Attachments { get; private set; }

    public CustomerInteraction(
        InteractionType type,
        string subject,
        Guid performedByUserId,
        string performedByUserName,
        Guid? customerAnalyticsId = null,
        Guid? leadId = null)
    {
        if (customerAnalyticsId == null && leadId == null)
            throw new ArgumentException("Either customerAnalyticsId or leadId must be provided");

        Id = Guid.NewGuid();
        Type = type;
        Subject = subject;
        PerformedByUserId = performedByUserId;
        PerformedByUserName = performedByUserName;
        CustomerAnalyticsId = customerAnalyticsId;
        LeadId = leadId;
        PerformedAt = DateTime.UtcNow;
    }

    protected CustomerInteraction() { }

    public void SetContent(string content)
    {
        Content = content;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetCallDetails(int durationMinutes, string? outcome)
    {
        DurationMinutes = durationMinutes;
        CallOutcome = outcome;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetMeetingDetails(int durationMinutes, string? location)
    {
        DurationMinutes = durationMinutes;
        MeetingLocation = location;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetFollowUp(DateTime followUpDate, string? note = null)
    {
        FollowUpDate = followUpDate;
        FollowUpNote = note;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetSentiment(string sentiment)
    {
        Sentiment = sentiment;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetAttachments(string attachmentsJson)
    {
        Attachments = attachmentsJson;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdatePerformedAt(DateTime performedAt)
    {
        PerformedAt = performedAt;
        UpdatedAt = DateTime.UtcNow;
    }
}
