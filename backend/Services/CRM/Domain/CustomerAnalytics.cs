using BuildingBlocks.SharedKernel;

namespace CRM.Domain;

/// <summary>
/// Aggregate view of customer with RFM scoring and analytics
/// Links to ApplicationUser via UserId
/// </summary>
public class CustomerAnalytics : Entity<Guid>
{
    public Guid UserId { get; private set; }

    // RFM Scores (1-5)
    public int RecencyScore { get; private set; } = 1;
    public int FrequencyScore { get; private set; } = 1;
    public int MonetaryScore { get; private set; } = 1;
    public int TotalRfmScore => RecencyScore + FrequencyScore + MonetaryScore;

    // Analytics
    public int TotalOrderCount { get; private set; }
    public decimal TotalSpent { get; private set; }
    public decimal AverageOrderValue { get; private set; }
    public DateTime? FirstPurchaseDate { get; private set; }
    public DateTime? LastPurchaseDate { get; private set; }
    public int DaysSinceLastPurchase => LastPurchaseDate.HasValue
        ? (int)(DateTime.UtcNow - LastPurchaseDate.Value).TotalDays
        : int.MaxValue;

    // Lifecycle
    public LifecycleStage LifecycleStage { get; private set; } = LifecycleStage.New;
    public DateTime? LifecycleStageChangedAt { get; private set; }

    // Engagement metrics
    public int EmailOpenCount { get; private set; }
    public int EmailClickCount { get; private set; }
    public DateTime? LastEmailOpenedAt { get; private set; }
    public DateTime? LastInteractionAt { get; private set; }

    // Notes
    public string? InternalNotes { get; private set; }

    // Last calculation timestamp
    public DateTime? LastRfmCalculatedAt { get; private set; }

    public CustomerAnalytics(Guid userId)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        LifecycleStage = LifecycleStage.New;
    }

    protected CustomerAnalytics() { }

    /// <summary>
    /// Update RFM scores based on order data
    /// </summary>
    public void UpdateRfmScores(int recency, int frequency, int monetary)
    {
        RecencyScore = Math.Clamp(recency, 1, 5);
        FrequencyScore = Math.Clamp(frequency, 1, 5);
        MonetaryScore = Math.Clamp(monetary, 1, 5);
        LastRfmCalculatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        // Update lifecycle stage based on new RFM
        UpdateLifecycleStage();
    }

    /// <summary>
    /// Update order statistics
    /// </summary>
    public void UpdateOrderStats(int orderCount, decimal totalSpent, DateTime? firstPurchase, DateTime? lastPurchase)
    {
        TotalOrderCount = orderCount;
        TotalSpent = totalSpent;
        AverageOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
        FirstPurchaseDate = firstPurchase;
        LastPurchaseDate = lastPurchase;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Calculate and set lifecycle stage based on RFM scores
    /// </summary>
    private void UpdateLifecycleStage()
    {
        var previousStage = LifecycleStage;

        // Champion: 12-15 total score
        if (TotalRfmScore >= 12)
        {
            LifecycleStage = LifecycleStage.Champion;
        }
        // VIP: 10-11 total score
        else if (TotalRfmScore >= 10)
        {
            LifecycleStage = LifecycleStage.VIP;
        }
        // Active: 7-9 total score
        else if (TotalRfmScore >= 7)
        {
            LifecycleStage = LifecycleStage.Active;
        }
        // At Risk: 4-6 total score
        else if (TotalRfmScore >= 4)
        {
            LifecycleStage = LifecycleStage.AtRisk;
        }
        // Churned: < 4 OR > 90 days since last purchase
        else if (TotalRfmScore < 4 || DaysSinceLastPurchase > 90)
        {
            LifecycleStage = TotalOrderCount == 0 ? LifecycleStage.New : LifecycleStage.Churned;
        }

        if (previousStage != LifecycleStage)
        {
            LifecycleStageChangedAt = DateTime.UtcNow;
        }
    }

    /// <summary>
    /// Record email open
    /// </summary>
    public void RecordEmailOpen()
    {
        EmailOpenCount++;
        LastEmailOpenedAt = DateTime.UtcNow;
        LastInteractionAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Record email click
    /// </summary>
    public void RecordEmailClick()
    {
        EmailClickCount++;
        LastInteractionAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Add internal note
    /// </summary>
    public void AddNote(string note)
    {
        InternalNotes = string.IsNullOrWhiteSpace(InternalNotes)
            ? note
            : $"{InternalNotes}\n{DateTime.UtcNow:yyyy-MM-dd HH:mm}: {note}";
        UpdatedAt = DateTime.UtcNow;
    }
}
