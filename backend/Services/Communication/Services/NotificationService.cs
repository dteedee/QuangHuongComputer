using Communication.Domain;
using Communication.Hubs;
using Communication.Infrastructure;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Communication.Services;

public class NotificationService : INotificationService
{
    private readonly CommunicationDbContext _dbContext;
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationService(
        CommunicationDbContext dbContext,
        IHubContext<NotificationHub> hubContext)
    {
        _dbContext = dbContext;
        _hubContext = hubContext;
    }

    public async Task SendToUserAsync(Guid userId, CreateNotificationDto notification)
    {
        await SendToUserAsync(userId.ToString(), notification);
    }

    public async Task SendToUserAsync(string userId, CreateNotificationDto notification)
    {
        // Create and save notification to database
        var notificationLog = new NotificationLog(
            Guid.TryParse(userId, out var uid) ? uid : Guid.Empty,
            notification.Type,
            notification.Message,
            "InApp",
            notification.Title,
            notification.ReferenceId,
            null, // templateCode
            notification.Link,
            notification.Priority
        );

        _dbContext.NotificationLogs.Add(notificationLog);
        await _dbContext.SaveChangesAsync();

        // Build notification DTO for realtime
        var notificationDto = new NotificationDto
        {
            Id = notificationLog.Id,
            Type = notification.Type.ToString(),
            Title = notification.Title,
            Message = notification.Message,
            Link = notification.Link,
            Priority = notification.Priority,
            CreatedAt = notificationLog.CreatedAt,
            IsRead = false,
            ReferenceId = notification.ReferenceId
        };

        // Send realtime notification
        await _hubContext.Clients.Group($"user_{userId}").SendAsync("ReceiveNotification", notificationDto);

        // Mark as sent
        notificationLog.MarkAsSent();
        await _dbContext.SaveChangesAsync();
    }

    public async Task SendToRoleAsync(string role, CreateNotificationDto notification)
    {
        await SendToRolesAsync(new[] { role }, notification);
    }

    public async Task SendToRolesAsync(string[] roles, CreateNotificationDto notification)
    {
        var targetRoles = string.Join(",", roles);

        // Create a system notification log (userId = Guid.Empty for role-based)
        var notificationLog = new NotificationLog(
            Guid.Empty,
            notification.Type,
            notification.Message,
            "InApp",
            notification.Title,
            notification.ReferenceId,
            null, // templateCode
            notification.Link,
            notification.Priority,
            targetRoles
        );

        _dbContext.NotificationLogs.Add(notificationLog);
        await _dbContext.SaveChangesAsync();

        // Build notification DTO for realtime
        var notificationDto = new NotificationDto
        {
            Id = notificationLog.Id,
            Type = notification.Type.ToString(),
            Title = notification.Title,
            Message = notification.Message,
            Link = notification.Link,
            Priority = notification.Priority,
            CreatedAt = notificationLog.CreatedAt,
            IsRead = false,
            ReferenceId = notification.ReferenceId
        };

        // Send to each role group
        var tasks = roles.Select(role =>
            _hubContext.Clients.Group($"role_{role}").SendAsync("ReceiveNotification", notificationDto)
        );

        await Task.WhenAll(tasks);

        // Mark as sent
        notificationLog.MarkAsSent();
        await _dbContext.SaveChangesAsync();
    }

    public async Task<List<NotificationDto>> GetUserNotificationsAsync(string userId, int page = 1, int pageSize = 50)
    {
        var userGuid = Guid.TryParse(userId, out var uid) ? uid : Guid.Empty;

        var notifications = await _dbContext.NotificationLogs
            .Where(n => n.UserId == userGuid || n.UserId == Guid.Empty) // User-specific or system-wide
            .Where(n => n.Channel == "InApp")
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type.ToString(),
                Title = n.Subject ?? "",
                Message = n.Content,
                Link = n.Link,
                Priority = n.Priority,
                CreatedAt = n.CreatedAt,
                IsRead = n.IsRead,
                ReferenceId = n.ReferenceId
            })
            .ToListAsync();

        return notifications;
    }

    public async Task<int> GetUnreadCountAsync(string userId)
    {
        var userGuid = Guid.TryParse(userId, out var uid) ? uid : Guid.Empty;

        var count = await _dbContext.NotificationLogs
            .Where(n => n.UserId == userGuid || n.UserId == Guid.Empty)
            .Where(n => n.Channel == "InApp")
            .Where(n => !n.IsRead)
            .CountAsync();

        return count;
    }

    public async Task<bool> MarkAsReadAsync(Guid notificationId, string userId)
    {
        var notification = await _dbContext.NotificationLogs.FindAsync(notificationId);
        if (notification == null) return false;

        notification.MarkAsRead();
        await _dbContext.SaveChangesAsync();

        // Broadcast to user's connections
        await _hubContext.Clients.Group($"user_{userId}").SendAsync("NotificationRead", notificationId.ToString());

        return true;
    }

    public async Task MarkAllAsReadAsync(string userId)
    {
        var userGuid = Guid.TryParse(userId, out var uid) ? uid : Guid.Empty;

        var notifications = await _dbContext.NotificationLogs
            .Where(n => n.UserId == userGuid || n.UserId == Guid.Empty)
            .Where(n => n.Channel == "InApp")
            .Where(n => !n.IsRead)
            .ToListAsync();

        foreach (var notification in notifications)
        {
            notification.MarkAsRead();
        }

        await _dbContext.SaveChangesAsync();

        // Broadcast to user's connections
        await _hubContext.Clients.Group($"user_{userId}").SendAsync("AllNotificationsRead");
    }
}
