using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using BuildingBlocks.Security;
using Communication.Domain;
using Communication.Repositories;
using System.Security.Claims;

namespace Communication.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IConversationRepository _conversationRepository;

    public ChatHub(IConversationRepository conversationRepository)
    {
        _conversationRepository = conversationRepository;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        var userRoles = GetUserRoles();

        if (userRoles.Contains(Roles.Admin) || userRoles.Contains(Roles.Sale))
        {
            // Support staff join the shared team group only; they are added to a specific
            // conversation_{id} group on demand (AssignConversation), not auto-joined to
            // every conversation that GetConversationsForUserAsync would return for them.
            await Groups.AddToGroupAsync(Context.ConnectionId, "SupportTeam");
        }
        else
        {
            // Customers (and any other non-staff caller): join the room(s) they already
            // own so a reconnect keeps receiving replies without calling StartConversation
            // again. GetConversationsForUserAsync is default-deny for this branch.
            var conversations = await _conversationRepository.GetConversationsForUserAsync(userId, userRoles);
            foreach (var conversation in conversations)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"conversation_{conversation.Id}");
            }
        }

        await base.OnConnectedAsync();
    }

    public async Task SendMessage(string conversationId, string text)
    {
        var userId = GetUserId();
        var userName = Context.User?.Identity?.Name ?? "Guest";
        var userRoles = GetUserRoles();

        Guid convId;
        if (!Guid.TryParse(conversationId, out convId))
        {
            await Clients.Caller.SendAsync("Error", "Invalid conversation ID");
            return;
        }

        // Get or create conversation
        var conversation = await _conversationRepository.GetByIdAsync(convId);

        if (conversation == null)
        {
            await Clients.Caller.SendAsync("Error", "Conversation not found");
            return;
        }

        // Check access
        if (!conversation.CanBeAccessedBy(userId, userRoles))
        {
            await Clients.Caller.SendAsync("Error", "Access denied");
            return;
        }

        // Determine sender type
        var senderType = DetermineSenderType(userRoles);

        // Create and add message. AddMessageAsync stages the message as Added explicitly
        // (see IConversationRepository) instead of Update()-ing the whole aggregate, which
        // used to throw DbUpdateConcurrencyException on every send.
        var message = new ChatMessage(conversation.Id, userId, userName, senderType, text);
        await _conversationRepository.AddMessageAsync(conversation, message);
        await _conversationRepository.SaveChangesAsync();

        // Broadcast to conversation room
        await Clients.Group($"conversation_{conversation.Id}").SendAsync(
            "ReceiveMessage",
            userName,
            text,
            message.Id.ToString(),
            message.CreatedAt.ToString("o"),
            senderType.ToString()
        );
    }

    public async Task StartConversation()
    {
        var userId = GetUserId();
        var userName = Context.User?.Identity?.Name ?? "Guest";
        var userRoles = GetUserRoles();

        // Only customers can start new conversations
        if (!userRoles.Contains(Roles.Customer))
        {
            await Clients.Caller.SendAsync("Error", "Only customers can start conversations");
            return;
        }

        // Check if customer already has an active conversation
        var existingConversation = await _conversationRepository.GetActiveConversationForCustomerAsync(userId);

        if (existingConversation != null)
        {
            // Join existing conversation
            await Groups.AddToGroupAsync(Context.ConnectionId, $"conversation_{existingConversation.Id}");
            await Clients.Caller.SendAsync("ConversationStarted", existingConversation.Id.ToString());
            return;
        }

        // Create new conversation
        var conversation = new Conversation(userId, userName);
        await _conversationRepository.AddAsync(conversation);
        await _conversationRepository.SaveChangesAsync();

        // Join conversation room
        await Groups.AddToGroupAsync(Context.ConnectionId, $"conversation_{conversation.Id}");

        // Notify support team about new conversation
        await Clients.Group("SupportTeam").SendAsync("NewConversation", conversation.Id.ToString(), userName);

        await Clients.Caller.SendAsync("ConversationStarted", conversation.Id.ToString());
    }

    public async Task AssignConversation(string conversationId)
    {
        var userId = GetUserId();
        var userName = Context.User?.Identity?.Name ?? "Guest";
        var userRoles = GetUserRoles();

        // Only sales/admin can assign conversations
        if (!userRoles.Contains(Roles.Admin) && !userRoles.Contains(Roles.Sale))
        {
            await Clients.Caller.SendAsync("Error", "Access denied");
            return;
        }

        Guid convId;
        if (!Guid.TryParse(conversationId, out convId))
        {
            await Clients.Caller.SendAsync("Error", "Invalid conversation ID");
            return;
        }

        var conversation = await _conversationRepository.GetByIdAsync(convId);
        if (conversation == null)
        {
            await Clients.Caller.SendAsync("Error", "Conversation not found");
            return;
        }

        conversation.AssignToUser(userId, userName);
        await _conversationRepository.UpdateAsync(conversation);
        await _conversationRepository.SaveChangesAsync();

        // Join conversation room
        await Groups.AddToGroupAsync(Context.ConnectionId, $"conversation_{conversation.Id}");

        await Clients.Caller.SendAsync("ConversationAssigned", conversation.Id.ToString());
        await Clients.Group($"conversation_{conversation.Id}").SendAsync("Notify", $"{userName} đã tham gia hỗ trợ");
    }

    public async Task MarkAsRead(string messageId)
    {
        // Implementation for marking messages as read
        await Clients.Caller.SendAsync("MessageRead", messageId);
    }

    public async Task UserTyping(string conversationId)
    {
        var userName = Context.User?.Identity?.Name ?? "Guest";

        Guid convId;
        if (Guid.TryParse(conversationId, out convId))
        {
            await Clients.OthersInGroup($"conversation_{convId}").SendAsync("UserTyping", userName);
        }
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

    private SenderType DetermineSenderType(string[] roles)
    {
        if (roles.Contains(Roles.Admin) || roles.Contains(Roles.Sale))
            return SenderType.Sale;

        return SenderType.Customer;
    }
}
