using Ai.Application;
using Communication.Domain;
using Communication.Repositories;

namespace Communication.Application;

/// <summary>
/// Service to integrate AI chatbot into customer conversations
/// </summary>
public interface IAiChatService
{
    Task<string> GetAiResponseAsync(Guid conversationId, string question, string askingUserId, string[] askingUserRoles, CancellationToken ct = default);
}

/// <summary>
/// W2-15: was an HTTP loopback - this same process POSTing to its own host at
/// "http://localhost:5000/api/ai/chat" to answer a chat message, and only the AI's reply was
/// persisted (the customer's own question never became a ChatMessage row). Now calls IAiService
/// in-process (Communication.csproj -> Ai.csproj, Ai has no reference back, so no cycle) and
/// persists both sides of the exchange. Also enforces the same conversation access check every
/// other conversation-touching endpoint uses - previously ai/ask had none, so any authenticated
/// caller could ask (and have answered into) a conversation they did not own.
/// </summary>
public class AiChatService : IAiChatService
{
    private readonly IConversationRepository _conversationRepository;
    private readonly IAiService _aiService;

    public AiChatService(IConversationRepository conversationRepository, IAiService aiService)
    {
        _conversationRepository = conversationRepository;
        _aiService = aiService;
    }

    public async Task<string> GetAiResponseAsync(
        Guid conversationId, string question, string askingUserId, string[] askingUserRoles, CancellationToken ct = default)
    {
        var conversation = await _conversationRepository.GetByIdAsync(conversationId, ct);
        if (conversation == null)
        {
            throw new InvalidOperationException("Conversation not found");
        }

        if (!conversation.CanBeAccessedBy(askingUserId, askingUserRoles))
        {
            throw new UnauthorizedAccessException("Access denied to this conversation");
        }

        // Persist the customer's own question first - the old HTTP-loopback version only ever
        // saved the AI's reply, so a conversation transcript was missing every question asked.
        var questionMessage = new ChatMessage(conversationId, askingUserId, "Khách hàng", SenderType.Customer, question);
        await _conversationRepository.AddMessageAsync(conversation, questionMessage, ct);
        await _conversationRepository.SaveChangesAsync(ct);

        string responseText;
        try
        {
            responseText = await _aiService.AskAsync(question, ct);
        }
        catch (Exception)
        {
            responseText = "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.";
        }

        var aiMessage = new ChatMessage(conversationId, "ai-assistant", "QUANG HƯỜNG AI", SenderType.AI, responseText);
        await _conversationRepository.AddMessageAsync(conversation, aiMessage, ct);
        await _conversationRepository.SaveChangesAsync(ct);

        return responseText;
    }
}
