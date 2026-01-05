using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using BuildingBlocks.Security;

namespace Communication.Hubs;

[Authorize]
public class ChatHub : Hub
{
    public async Task SendMessage(string user, string message)
    {
        // Broadcast message to all connected clients
        // In a real scenario, you might send to a specific group or admin
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }

    public async Task JoinSupportGroup()
    {
        if (Context.User.IsInRole(Roles.Admin) || Context.User.IsInRole(Roles.Sale) || Context.User.IsInRole(Roles.Technician))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "SupportTeam");
            await Clients.Caller.SendAsync("Notify", "You have joined the support group.");
        }
    }

    public async Task SendToSupport(string message)
    {
        var userName = Context.User.Identity?.Name ?? "Guest";
        await Clients.Group("SupportTeam").SendAsync("ReceiveSupportMessage", userName, message);
    }
}
