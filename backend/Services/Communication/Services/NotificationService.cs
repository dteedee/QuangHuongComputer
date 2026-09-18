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

    // W2-15: how many role-targeted (broadcast) rows we scan before pagination/role-filtering.
    // Bounded on purpose so a busy TargetRoles feed can't force an unbounded table scan; own
    // (non-broadcast) notifications are never capped by this window.
    private const int BroadcastCandidateWindow = 1000;

    public async Task<List<NotificationDto>> GetUserNotificationsAsync(string userId, string[] userRoles, int page = 1, int pageSize = 50)
    {
        var userGuid = Guid.TryParse(userId, out var uid) ? uid : Guid.Empty;
        var roleSet = BuildRoleSet(userRoles);

        var candidates = await _dbContext.NotificationLogs
            .Where(n => n.Channel == "InApp" && (n.UserId == userGuid || n.UserId == Guid.Empty))
            .OrderByDescending(n => n.CreatedAt)
            .Take(BroadcastCandidateWindow)
            .ToListAsync();

        var visible = candidates
            .Where(n => n.UserId == userGuid || RolesIntersect(n.TargetRoles, roleSet))
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var visibleIds = visible.Select(n => n.Id).ToList();
        var readIds = visibleIds.Count == 0
            ? new HashSet<Guid>()
            : new HashSet<Guid>(await _dbContext.NotificationReads
                .Where(r => r.UserId == userGuid && visibleIds.Contains(r.NotificationLogId))
                .Select(r => r.NotificationLogId)
                .ToListAsync());

        return visible.Select(n => new NotificationDto
        {
            Id = n.Id,
            Type = n.Type.ToString(),
            Title = n.Subject ?? "",
            Message = n.Content,
            Link = n.Link,
            Priority = n.Priority,
            CreatedAt = n.CreatedAt,
            IsRead = readIds.Contains(n.Id),
            ReferenceId = n.ReferenceId
        }).ToList();
    }

    public async Task<int> GetUnreadCountAsync(string userId, string[] userRoles)
    {
        var userGuid = Guid.TryParse(userId, out var uid) ? uid : Guid.Empty;
        var roleSet = BuildRoleSet(userRoles);

        var candidates = await _dbContext.NotificationLogs
            .Where(n => n.Channel == "InApp" && (n.UserId == userGuid || n.UserId == Guid.Empty))
            .OrderByDescending(n => n.CreatedAt)
            .Take(BroadcastCandidateWindow)
            .Select(n => new { n.Id, n.UserId, n.TargetRoles })
            .ToListAsync();

        var visibleIds = candidates
            .Where(n => n.UserId == userGuid || RolesIntersect(n.TargetRoles, roleSet))
            .Select(n => n.Id)
            .ToList();

        if (visibleIds.Count == 0) return 0;

        var readCount = await _dbContext.NotificationReads
            .Where(r => r.UserId == userGuid && visibleIds.Contains(r.NotificationLogId))
            .Select(r => r.NotificationLogId)
            .Distinct()
            .CountAsync();

        return visibleIds.Count - readCount;
    }

    public async Task<bool> MarkAsReadAsync(Guid notificationId, string userId, string[] userRoles)
    {
        var userGuid = Guid.TryParse(userId, out var uid) ? uid : Guid.Empty;
        var roleSet = BuildRoleSet(userRoles);

        var notification = await _dbContext.NotificationLogs.FindAsync(notificationId);
        if (notification == null) return false;

        // Ownership/visibility check - a caller may only mark read what they can see.
        var visible = notification.UserId == userGuid || RolesIntersect(notification.TargetRoles, roleSet);
        if (!visible) return false;

        var alreadyRead = await _dbContext.NotificationReads
            .AnyAsync(r => r.NotificationLogId == notificationId && r.UserId == userGuid);
        if (!alreadyRead)
        {
            _dbContext.NotificationReads.Add(new NotificationRead(notificationId, userGuid));
            await _dbContext.SaveChangesAsync();
        }

        // Broadcast to this user's connections only - never affects other callers' read state.
        await _hubContext.Clients.Group($"user_{userId}").SendAsync("NotificationRead", notificationId.ToString());

        return true;
    }

    public async Task MarkAllAsReadAsync(string userId, string[] userRoles)
    {
        var userGuid = Guid.TryParse(userId, out var uid) ? uid : Guid.Empty;
        var roleSet = BuildRoleSet(userRoles);

        var candidates = await _dbContext.NotificationLogs
            .Where(n => n.Channel == "InApp" && (n.UserId == userGuid || n.UserId == Guid.Empty))
            .OrderByDescending(n => n.CreatedAt)
            .Take(BroadcastCandidateWindow)
            .Select(n => new { n.Id, n.UserId, n.TargetRoles })
            .ToListAsync();

        var visibleIds = candidates
            .Where(n => n.UserId == userGuid || RolesIntersect(n.TargetRoles, roleSet))
            .Select(n => n.Id)
            .ToList();

        if (visibleIds.Count > 0)
        {
            var alreadyRead = new HashSet<Guid>(await _dbContext.NotificationReads
                .Where(r => r.UserId == userGuid && visibleIds.Contains(r.NotificationLogId))
                .Select(r => r.NotificationLogId)
                .ToListAsync());

            foreach (var id in visibleIds.Where(id => !alreadyRead.Contains(id)))
            {
                _dbContext.NotificationReads.Add(new NotificationRead(id, userGuid));
            }

            await _dbContext.SaveChangesAsync();
        }

        // Broadcast to user's connections
        await _hubContext.Clients.Group($"user_{userId}").SendAsync("AllNotificationsRead");
    }

    private static HashSet<string> BuildRoleSet(string[]? userRoles) =>
        new(userRoles ?? Array.Empty<string>(), StringComparer.OrdinalIgnoreCase);

    private static bool RolesIntersect(string? targetRoles, HashSet<string> callerRoles)
    {
        if (string.IsNullOrWhiteSpace(targetRoles) || callerRoles.Count == 0) return false;
        return targetRoles
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(callerRoles.Contains);
    }
}
