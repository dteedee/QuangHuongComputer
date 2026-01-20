using Communication.Domain;
using Communication.Repositories;

namespace Communication.Application;

/// <summary>
/// Service to integrate AI chatbot into customer conversations
/// </summary>
public interface IAiChatService
{
    Task<string> GetAiResponseAsync(Guid conversationId, string question, CancellationToken ct = default);
}

public class AiChatService : IAiChatService
{
    private readonly IConversationRepository _conversationRepository;
    private readonly HttpClient _httpClient;

    public AiChatService(IConversationRepository conversationRepository, IHttpClientFactory httpClientFactory)
    {
        _conversationRepository = conversationRepository;
        _httpClient = httpClientFactory.CreateClient("AiService");
    }

    public async Task<string> GetAiResponseAsync(Guid conversationId, string question, CancellationToken ct = default)
    {
        // Get conversation to verify it exists
        var conversation = await _conversationRepository.GetByIdAsync(conversationId, ct);
        if (conversation == null)
        {
            throw new InvalidOperationException("Conversation not found");
        }

        // Call AI service
        var response = await _httpClient.PostAsJsonAsync("/api/ai/chat", new { message = question }, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<AiChatResponse>(ct);
        if (result == null || string.IsNullOrEmpty(result.Response))
        {
            return "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.";
        }

        // Add AI response as a message to the conversation
        var aiMessage = new ChatMessage(
            conversationId,
            "ai-assistant",
            "QUANG HƯỜNG AI",
            SenderType.AI,
            result.Response
        );

        conversation.AddMessage(aiMessage);
        await _conversationRepository.UpdateAsync(conversation, ct);
        await _conversationRepository.SaveChangesAsync(ct);

        return result.Response;
    }

    private record AiChatResponse(string Response);
}
