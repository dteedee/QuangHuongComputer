using BuildingBlocks.SharedKernel;

namespace Communication.Domain;

/// <summary>
/// Represents a single message in a conversation
/// </summary>
public class ChatMessage : Entity<Guid>
{
    public Guid ConversationId { get; private set; }
    public string SenderId { get; private set; }
    public string SenderName { get; private set; }
    public SenderType SenderType { get; private set; }
    public string Text { get; private set; }
    public bool IsRead { get; private set; }
    public DateTime? ReadAt { get; private set; }

    protected ChatMessage() { }

    public ChatMessage(Guid conversationId, string senderId, string senderName, SenderType senderType, string text)
    {
        Id = Guid.NewGuid();
        ConversationId = conversationId;
        SenderId = senderId;
        SenderName = senderName;
        SenderType = senderType;
        Text = text;
        IsRead = false;
        CreatedAt = DateTime.UtcNow;
    }

    public void MarkAsRead()
    {
        IsRead = true;
        ReadAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
}

public enum SenderType
{
    Customer = 0,
    Sale = 1,
    AI = 2,
    System = 3
}
