namespace CRM.Domain;

/// <summary>
/// Customer lifecycle stages based on RFM analysis
/// </summary>
public enum LifecycleStage
{
    New = 0,        // Registered but no purchase
    Active = 1,     // Regular purchasing activity
    AtRisk = 2,     // Declining activity, needs attention
    Churned = 3,    // Lost customer (>90 days no activity)
    VIP = 4,        // High value customer
    Champion = 5    // Top tier, loyal, high value
}

/// <summary>
/// Lead sources - where did the lead come from
/// </summary>
public enum LeadSource
{
    Website = 0,
    Referral = 1,
    Advertisement = 2,
    SocialMedia = 3,
    Event = 4,
    ColdCall = 5,
    Email = 6,
    Partner = 7,
    Other = 99
}

/// <summary>
/// Lead status in the pipeline
/// </summary>
public enum LeadStatus
{
    New = 0,
    Contacted = 1,
    Qualified = 2,
    Proposal = 3,
    Negotiation = 4,
    Won = 5,
    Lost = 6
}

/// <summary>
/// Types of customer interactions
/// </summary>
public enum InteractionType
{
    Note = 0,
    Call = 1,
    Email = 2,
    Meeting = 3,
    Task = 4,
    SMS = 5,
    Chat = 6,
    SocialMedia = 7
}

/// <summary>
/// Task priority levels
/// </summary>
public enum TaskPriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Urgent = 3
}

/// <summary>
/// Task status
/// </summary>
public enum TaskStatus
{
    Pending = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3
}

/// <summary>
/// Email campaign status
/// </summary>
public enum CampaignStatus
{
    Draft = 0,
    Scheduled = 1,
    Sending = 2,
    Sent = 3,
    Paused = 4,
    Cancelled = 5
}

/// <summary>
/// Email recipient status
/// </summary>
public enum RecipientStatus
{
    Pending = 0,
    Sent = 1,
    Delivered = 2,
    Opened = 3,
    Clicked = 4,
    Bounced = 5,
    Unsubscribed = 6,
    Failed = 7
}
