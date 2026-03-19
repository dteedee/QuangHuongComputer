using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using BuildingBlocks.Security;
using System.Security.Claims;

namespace Communication.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        var userRoles = GetUserRoles();

        // Join personal group
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");

        // Join role-based groups
        foreach (var role in userRoles)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"role_{role}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        var userRoles = GetUserRoles();

        // Leave personal group
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");

        // Leave role-based groups
        foreach (var role in userRoles)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"role_{role}");
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Mark a notification as read and broadcast to all user's connections
    /// </summary>
    public async Task MarkAsRead(string notificationId)
    {
        var userId = GetUserId();

        // Broadcast to all user's connections that this notification was read
        await Clients.Group($"user_{userId}").SendAsync("NotificationRead", notificationId);
    }

    /// <summary>
    /// Mark all notifications as read
    /// </summary>
    public async Task MarkAllAsRead()
    {
        var userId = GetUserId();

        // Broadcast to all user's connections that all notifications were read
        await Clients.Group($"user_{userId}").SendAsync("AllNotificationsRead");
    }

    /// <summary>
    /// Join a specific notification group (e.g., for order-specific notifications)
    /// </summary>
    public async Task JoinGroup(string groupName)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
    }

    /// <summary>
    /// Leave a specific notification group
    /// </summary>
    public async Task LeaveGroup(string groupName)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
    }

    private string GetUserId()
    {
        return Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? Context.User?.FindFirst("sub")?.Value
            ?? "anonymous";
    }

    private string[] GetUserRoles()
    {
        return Context.User?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray() ?? Array.Empty<string>();
    }
}
