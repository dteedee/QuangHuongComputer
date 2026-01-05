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

    public AiService(AiDbContext db, ILogger<AiService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<string> AskAsync(string question, CancellationToken ct = default)
    {
        // 1. Search for context (RAG - Retrieval)
        var keywords = question.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        
        var relevantEntries = await _db.SearchEntries
            .Where(e => keywords.Any(k => e.Title.Contains(k) || e.Content.Contains(k)))
            .Take(5)
            .ToListAsync(ct);

        if (!relevantEntries.Any())
        {
            return "Tôi xin lỗi, tôi chưa tìm thấy thông tin chính xác về câu hỏi của bạn. Bạn có thể hỏi về các sản phẩm máy tính, dịch vụ sửa chữa hoặc chính sách bảo hành của công ty Quang Hường.";
        }

        // 2. Build Context
        var contextBuilder = new StringBuilder();
        contextBuilder.AppendLine("Dưới đây là thông tin tôi tìm thấy từ hệ thống của Quang Hường Computer:");
        foreach (var entry in relevantEntries)
        {
            contextBuilder.AppendLine($"- {entry.Title}: {entry.Content}");
            if (entry.Price.HasValue) contextBuilder.AppendLine($"  Giá: {entry.Price:N0} VNĐ");
        }

        // 3. Simulate LLM Response (Generation)
        // In a real scenario, you'd send this context + question to OpenAI/Gemini
        return $@"Chào bạn! Dựa trên thông tin tôi có:
{contextBuilder}

Bạn quan tâm đến sản phẩm nào ở trên không? Tôi có thể hỗ trợ bạn đặt lịch sửa chữa hoặc kiểm tra tình trạng bảo hành nếu bạn cung cấp số Serial.";
    }
}
