namespace Communication.Domain;

public class NewsletterSubscription
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime SubscribedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UnsubscribedAt { get; set; }
    public string? UnsubscribeReason { get; set; }

    // Metadata
    public string? SubscriptionSource { get; set; } // "Website", "Mobile", "Admin"
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
