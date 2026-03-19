using Communication.Domain;

namespace Communication.Services;

/// <summary>
/// DTO for creating a notification
/// </summary>
public record CreateNotificationDto
{
    public NotificationType Type { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public string? Link { get; init; }
    public string Priority { get; init; } = "medium"; // low, medium, high
    public string? ReferenceId { get; init; } // OrderId, PaymentId, etc.
    public Dictionary<string, object>? Metadata { get; init; }
}

/// <summary>
/// DTO for notification response
/// </summary>
public record NotificationDto
{
    public Guid Id { get; init; }
    public string Type { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public string? Link { get; init; }
    public string Priority { get; init; } = "medium";
    public DateTime CreatedAt { get; init; }
    public bool IsRead { get; init; }
    public string? ReferenceId { get; init; }
}

/// <summary>
/// Interface for notification service
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// Send notification to a specific user
    /// </summary>
    Task SendToUserAsync(Guid userId, CreateNotificationDto notification);

    /// <summary>
    /// Send notification to a specific user by string ID
    /// </summary>
    Task SendToUserAsync(string userId, CreateNotificationDto notification);

    /// <summary>
    /// Send notification to all users with a specific role
    /// </summary>
    Task SendToRoleAsync(string role, CreateNotificationDto notification);

    /// <summary>
    /// Send notification to all users with any of the specified roles
    /// </summary>
    Task SendToRolesAsync(string[] roles, CreateNotificationDto notification);

    /// <summary>
    /// Get all notifications for a user
    /// </summary>
    Task<List<NotificationDto>> GetUserNotificationsAsync(string userId, int page = 1, int pageSize = 50);

    /// <summary>
    /// Get unread notification count for a user
    /// </summary>
    Task<int> GetUnreadCountAsync(string userId);

    /// <summary>
    /// Mark a notification as read
    /// </summary>
    Task<bool> MarkAsReadAsync(Guid notificationId, string userId);

    /// <summary>
    /// Mark all notifications as read for a user
    /// </summary>
    Task MarkAllAsReadAsync(string userId);
}
