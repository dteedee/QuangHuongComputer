using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using BuildingBlocks.Security;
using Communication.Domain;
using Communication.Repositories;
using System.Linq;
using System.Security.Claims;

namespace Communication.Hubs;

// W1-10: policy CÓ TÊN (không phải [Authorize] trống) để convention phân quyền nhận diện được.
[Authorize(SecurityPolicies.Authenticated)]
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

        if (IsSupportStaff())
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

    // W2-15: DB caps ChatMessage.Text at 4000 (CommunicationDbContext.cs); validate here so the
    // caller gets a friendly SignalR error instead of a raw DbUpdateException from SaveChangesAsync.
    private const int MaxMessageLength = 4000;

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

        if (string.IsNullOrWhiteSpace(text))
        {
            await Clients.Caller.SendAsync("Error", "Tin nhắn không được để trống");
            return;
        }
        if (text.Length > MaxMessageLength)
        {
            await Clients.Caller.SendAsync("Error", $"Tin nhắn vượt quá {MaxMessageLength} ký tự");
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

        if (conversation.Status == ConversationStatus.Closed)
        {
            await Clients.Caller.SendAsync("Error", "Hội thoại đã đóng - hãy mở lại trước khi gửi tin nhắn");
            return;
        }

        // Determine sender type
        var senderType = DetermineSenderType();

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

        // Chỉ khách hàng mở hội thoại mới; nhân viên trả lời chứ không tự mở.
        //
        // W1-10 (verifier sửa): bản quét đổi `!userRoles.Contains(Roles.Customer)` thành
        // `IsSupportStaff()`. Hai điều kiện đó KHÔNG tương đương trong hệ 11 role: mọi nhân viên
        // KHÔNG có quyền CRM.ViewCustomers (HR, Accountant, InventoryStaff, 2 loại kỹ thuật viên,
        // Supplier) bỗng mở được hội thoại khách hàng — trái với chính thông báo lỗi bên dưới.
        // Giữ nguyên luật gốc: phải là tài khoản khách hàng.
        if (Context.User?.IsInRole(Roles.Customer) != true)
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

        // W1-10: nhận hội thoại là hành động của nhân viên CSKH -> quyền CRM.ViewCustomers.
        if (!IsSupportStaff())
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

    /// <summary>
    /// W2-15: was a no-op stub (echoed "MessageRead" back to the caller without persisting
    /// anything) - no read receipts existed at all. Now persists per-message read state and
    /// broadcasts it to the whole conversation room, with the same access check every other
    /// hub method uses.
    /// </summary>
    public async Task MarkAsRead(string messageId)
    {
        var userId = GetUserId();
        var userRoles = GetUserRoles();

        if (!Guid.TryParse(messageId, out var msgId))
        {
            await Clients.Caller.SendAsync("Error", "Invalid message ID");
            return;
        }

        var message = await _conversationRepository.GetMessageByIdAsync(msgId);
        if (message == null)
        {
            await Clients.Caller.SendAsync("Error", "Message not found");
            return;
        }

        var conversation = await _conversationRepository.GetByIdAsync(message.ConversationId);
        if (conversation == null || !conversation.CanBeAccessedBy(userId, userRoles))
        {
            await Clients.Caller.SendAsync("Error", "Access denied");
            return;
        }

        if (!message.IsRead)
        {
            message.MarkAsRead();
            await _conversationRepository.SaveChangesAsync();
        }

        await Clients.Group($"conversation_{conversation.Id}").SendAsync("MessageRead", messageId, userId);
    }

    /// <summary>W2-15: close a conversation - support staff or Admin only.</summary>
    public async Task CloseConversation(string conversationId)
    {
        await ChangeConversationStatus(conversationId, close: true);
    }

    /// <summary>W2-15: reopen a closed conversation - support staff or Admin only.</summary>
    public async Task ReopenConversation(string conversationId)
    {
        await ChangeConversationStatus(conversationId, close: false);
    }

    private async Task ChangeConversationStatus(string conversationId, bool close)
    {
        if (!IsSupportStaff())
        {
            await Clients.Caller.SendAsync("Error", "Access denied");
            return;
        }

        if (!Guid.TryParse(conversationId, out var convId))
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

        if (close) conversation.Close(); else conversation.Reopen();
        await _conversationRepository.UpdateAsync(conversation);
        await _conversationRepository.SaveChangesAsync();

        var eventName = close ? "ConversationClosed" : "ConversationReopened";
        await Clients.Group($"conversation_{convId}").SendAsync(eventName, conversationId);
        await Clients.Group("SupportTeam").SendAsync(eventName, conversationId);
    }

    /// <summary>W2-15: transfer an assigned conversation to another staff member. Support staff
    /// (or Admin) only - the target is trusted from the caller's own input (staff UI picks from
    /// a staff list), same trust level as AssignConversation already has.</summary>
    public async Task TransferConversation(string conversationId, string toUserId, string toUserName)
    {
        if (!IsSupportStaff())
        {
            await Clients.Caller.SendAsync("Error", "Access denied");
            return;
        }

        if (!Guid.TryParse(conversationId, out var convId))
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

        conversation.AssignToUser(toUserId, toUserName);
        await _conversationRepository.UpdateAsync(conversation);
        await _conversationRepository.SaveChangesAsync();

        await Clients.Group($"conversation_{convId}").SendAsync("ConversationTransferred", conversationId, toUserName);
        await Clients.Group("SupportTeam").SendAsync("ConversationTransferred", conversationId, toUserName);
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

    // W1-10 (verifier): tham số `roles` đã thành đường chết sau khi hub xét theo quyền — bỏ đi
    // để người đọc sau không tưởng rằng tên role còn ảnh hưởng tới kết quả.
    private SenderType DetermineSenderType()
    {
        if (IsSupportStaff())
            return SenderType.Sale;

        return SenderType.Customer;
    }

    /// <summary>
    /// W1-10: nhân viên hỗ trợ = có quyền <c>Permissions.CRM.ViewCustomers</c>.
    /// Hub KHÔNG kiểm tra tên role nữa — role chỉ là gói quyền (xem BuildingBlocks/Security/Roles.cs).
    /// Admin luôn qua, giống <c>PermissionAuthorizationHandler</c>.
    /// </summary>
    private bool IsSupportStaff() => HasPermission(Permissions.CRM.ViewCustomers);

    private bool HasPermission(string permission) =>
        Context.User?.IsInRole(Roles.Admin) == true
        || Context.User?.FindAll(Permissions.PermissionType).Any(c => c.Value == permission) == true;
}
