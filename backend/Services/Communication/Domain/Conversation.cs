using BuildingBlocks.SharedKernel;

namespace Communication.Domain;

/// <summary>
/// Represents a conversation between a customer and sales/support team
/// </summary>
public class Conversation : Entity<Guid>
{
    public string CustomerId { get; private set; }
    public string CustomerName { get; private set; }
    public string? AssignedToUserId { get; private set; }
    public string? AssignedToUserName { get; private set; }
    public ConversationStatus Status { get; private set; }
    public DateTime? LastMessageAt { get; private set; }
    public DateTime? ClosedAt { get; private set; }

    private readonly List<ChatMessage> _messages = new();
    public IReadOnlyCollection<ChatMessage> Messages => _messages.AsReadOnly();

    protected Conversation() { }

    public Conversation(string customerId, string customerName)
    {
        Id = Guid.NewGuid();
        CustomerId = customerId;
        CustomerName = customerName;
        Status = ConversationStatus.Open;
        CreatedAt = DateTime.UtcNow;
    }

    public void AssignToUser(string userId, string userName)
    {
        AssignedToUserId = userId;
        AssignedToUserName = userName;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AddMessage(ChatMessage message)
    {
        _messages.Add(message);
        LastMessageAt = message.CreatedAt;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Close()
    {
        Status = ConversationStatus.Closed;
        ClosedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reopen()
    {
        Status = ConversationStatus.Open;
        ClosedAt = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool CanBeAccessedBy(string userId, string[] userRoles)
    {
        // Customer can access their own conversation
        if (CustomerId == userId) return true;

        // Admin can access all conversations
        if (userRoles.Contains(BuildingBlocks.Security.Roles.Admin)) return true;

        // Sales can only access assigned conversations or unassigned ones
        if (userRoles.Contains(BuildingBlocks.Security.Roles.Sale))
        {
            return AssignedToUserId == null || AssignedToUserId == userId;
        }

        return false;
    }
}

public enum ConversationStatus
{
    Open = 0,
    Closed = 1
}
