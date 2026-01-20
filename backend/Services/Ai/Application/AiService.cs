using System.Text;
using Ai.Domain;
using Ai.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Ai.Application;

public interface IAiService
{
    Task<string> AskAsync(string question, CancellationToken ct = default);
}

public class AiService : IAiService
{
    private readonly AiDbContext _db;
    private readonly ILogger<AiService> _logger;

    // Safety: Disallowed topics that should not be answered
    private readonly string[] _disallowedTopics = new[]
    {
        "internal", "nội bộ", "employee", "nhân viên", "salary", "lương",
        "confidential", "bí mật", "password", "mật khẩu", "admin", "database"
    };

    // Safety: Price-related keywords that need exact data
    private readonly string[] _priceKeywords = new[]
    {
        "giá", "price", "cost", "chi phí", "bao nhiêu", "how much"
    };

    public AiService(AiDbContext db, ILogger<AiService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<string> AskAsync(string question, CancellationToken ct = default)
    {
        // Safety Guard 1: Check for disallowed topics
        if (ContainsDisallowedTopic(question))
        {
            _logger.LogWarning("Blocked question about internal data: {Question}", question);
            return "Tôi xin lỗi, tôi chỉ có thể trả lời các câu hỏi về sản phẩm và dịch vụ công khai của Quang Hường Computer. Vui lòng liên hệ trực tiếp với nhân viên nếu bạn cần hỗ trợ thêm.";
        }

        // 1. Search for context (RAG - Retrieval)
        var keywords = ExtractKeywords(question);

        // Only search in public data (Product and Post source types)
        var relevantEntries = await _db.SearchEntries
            .Where(e => (e.SourceType == "Product" || e.SourceType == "Post") &&
                        keywords.Any(k => e.Title.Contains(k) || e.Content.Contains(k)))
            .OrderByDescending(e => e.CreatedAt) // Prioritize recent entries
            .Take(5)
            .ToListAsync(ct);

        if (!relevantEntries.Any())
        {
            return "Tôi xin lỗi, tôi chưa tìm thấy thông tin chính xác về câu hỏi của bạn. Bạn có thể hỏi về các sản phẩm máy tính, linh kiện, dịch vụ sửa chữa hoặc chính sách bảo hành của Quang Hường Computer.";
        }

        // Safety Guard 2: Handle price questions with exact data only
        var isPriceQuestion = IsPriceQuestion(question);

        // 2. Build Context
        var contextBuilder = new StringBuilder();
        contextBuilder.AppendLine("Dựa trên thông tin từ hệ thống của Quang Hường Computer:");
        contextBuilder.AppendLine();

        foreach (var entry in relevantEntries)
        {
            contextBuilder.AppendLine($"• **{entry.Title}**");
            contextBuilder.AppendLine($"  {entry.Content}");

            // Safety Guard 3: Only show price if we have exact data
            if (entry.Price.HasValue)
            {
                contextBuilder.AppendLine($"  💰 Giá: {entry.Price:N0} VNĐ");
            }
            else if (isPriceQuestion)
            {
                contextBuilder.AppendLine($"  💰 Giá: Vui lòng liên hệ để được báo giá chính xác");
            }

            if (!string.IsNullOrEmpty(entry.Url))
            {
                contextBuilder.AppendLine($"  🔗 Chi tiết: {entry.Url}");
            }
            contextBuilder.AppendLine();
        }

        // 3. Generate Response (Simulated LLM)
        // In production, this would call OpenAI/Gemini with the context
        var response = new StringBuilder();
        response.AppendLine("Chào bạn! 👋");
        response.AppendLine();
        response.Append(contextBuilder);

        // Add helpful suggestions based on query type
        if (isPriceQuestion && relevantEntries.Any(e => !e.Price.HasValue))
        {
            response.AppendLine("⚠️ **Lưu ý:** Một số sản phẩm chưa có giá niêm yết công khai. Vui lòng liên hệ nhân viên bán hàng để được tư vấn và báo giá chính xác nhất.");
        }
        else
        {
            response.AppendLine("Bạn có muốn tôi hỗ trợ thêm về sản phẩm nào không? Tôi cũng có thể giúp bạn:");
            response.AppendLine("• Tìm hiểu về chính sách bảo hành");
            response.AppendLine("• Đặt lịch sửa chữa/bảo trì");
            response.AppendLine("• So sánh các sản phẩm tương tự");
        }

        return response.ToString();
    }

    private bool ContainsDisallowedTopic(string question)
    {
        var lowerQuestion = question.ToLowerInvariant();
        return _disallowedTopics.Any(topic => lowerQuestion.Contains(topic.ToLowerInvariant()));
    }

    private bool IsPriceQuestion(string question)
    {
        var lowerQuestion = question.ToLowerInvariant();
        return _priceKeywords.Any(keyword => lowerQuestion.Contains(keyword.ToLowerInvariant()));
    }

    private string[] ExtractKeywords(string question)
    {
        // Simple keyword extraction - in production, use more sophisticated NLP
        var stopWords = new HashSet<string> { "là", "của", "và", "có", "the", "is", "are", "a", "an" };

        return question
            .Split(new[] { ' ', ',', '.', '?', '!' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(word => word.Length > 2 && !stopWords.Contains(word.ToLowerInvariant()))
            .ToArray();
    }
}
