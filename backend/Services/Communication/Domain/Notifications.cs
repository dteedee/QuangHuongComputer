namespace Communication.Domain;

using BuildingBlocks.SharedKernel;

public class NotificationTemplate : Entity<Guid>
{
    public string Code { get; private set; }
    public string Name { get; private set; }
    public string Subject { get; private set; }
    public string Body { get; private set; }
    public NotificationType Type { get; private set; }
    public string? Variables { get; private set; } // JSON array of variable names
    public string? Description { get; private set; }
    public string? FromEmail { get; private set; }
    public string? FromName { get; private set; }

    public NotificationTemplate(
        string code,
        string name,
        string subject,
        string body,
        NotificationType type,
        string? variables = null,
        string? description = null,
        string? fromEmail = null,
        string? fromName = null)
    {
        Id = Guid.NewGuid();
        Code = code;
        Name = name;
        Subject = subject;
        Body = body;
        Type = type;
        Variables = variables;
        Description = description;
        FromEmail = fromEmail;
        FromName = fromName;
        IsActive = true;
    }

    protected NotificationTemplate() { }

    public void Update(string name, string subject, string body)
    {
        Name = name;
        Subject = subject;
        Body = body;
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
    }
}

public class NotificationLog : Entity<Guid>
{
    public Guid UserId { get; private set; }
    public NotificationType Type { get; private set; }
    public string? Subject { get; private set; }
    public string Content { get; private set; }
    public string? Channel { get; private set; } // Email, SMS, Push, InApp
    public bool IsSent { get; private set; }
    public DateTime? SentAt { get; private set; }
    public string? Error { get; private set; }
    public int RetryCount { get; private set; }
    public string? ReferenceId { get; private set; } // Order ID, etc.
    public string? TemplateCode { get; private set; }

    public NotificationLog(
        Guid userId,
        NotificationType type,
        string content,
        string? channel = null,
        string? subject = null,
        string? referenceId = null,
        string? templateCode = null)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        Type = type;
        Content = content;
        Channel = channel ?? "InApp";
        Subject = subject;
        ReferenceId = referenceId;
        TemplateCode = templateCode;
        IsSent = false;
        RetryCount = 0;
    }

    protected NotificationLog() { }

    public void MarkAsSent()
    {
        IsSent = true;
        SentAt = DateTime.UtcNow;
    }

    public void MarkAsFailed(string error)
    {
        IsSent = false;
        Error = error;
    }

    public void IncrementRetry()
    {
        RetryCount++;
    }
}

public enum NotificationType
{
    OrderCreated,
    OrderConfirmed,
    OrderShipped,
    OrderDelivered,
    OrderCancelled,
    PaymentReceived,
    PaymentFailed,
    RepairCompleted,
    RepairInProgress,
    WarrantyExpiring,
    WarrantyExpired,
    Promotion,
    PasswordReset,
    EmailVerification,
    SystemAlert
}
