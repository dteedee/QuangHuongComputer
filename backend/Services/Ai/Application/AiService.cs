using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Ai.Domain;
using Ai.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _geminiApiKey;
    private readonly string _geminiModel;

    // Safety: Disallowed topics that should not be answered
    private readonly string[] _disallowedTopics = new[]
    {
        "internal", "nội bộ", "employee", "nhân viên", "salary", "lương",
        "confidential", "bí mật", "password", "mật khẩu", "admin", "database"
    };

    public AiService(
        AiDbContext db,
        ILogger<AiService> logger,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _db = db;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _geminiApiKey = configuration["AI:Gemini:ApiKey"] ?? "";
        _geminiModel = configuration["AI:Gemini:Model"] ?? "gemini-2.0-flash";
    }

    public async Task<string> AskAsync(string question, CancellationToken ct = default)
    {
        // Safety Guard: Check for disallowed topics
        if (ContainsDisallowedTopic(question))
        {
            _logger.LogWarning("Blocked question about internal data: {Question}", question);
            return "Tôi xin lỗi, tôi chỉ có thể trả lời các câu hỏi về sản phẩm và dịch vụ công khai của Quang Hường Computer. Vui lòng liên hệ trực tiếp với nhân viên nếu bạn cần hỗ trợ thêm.";
        }

        // 1. RAG: Search for relevant context from database
        var keywords = ExtractKeywords(question);
        var fallbackEntries = new List<FallbackEntry>();
        var contextBuilder = new StringBuilder();

        if (keywords.Any())
        {
            var dbEntries = await _db.SearchEntries
                .Where(e => (e.SourceType == "Product" || e.SourceType == "Post") &&
                            keywords.Any(k => e.Title.Contains(k) || e.Content.Contains(k)))
                .OrderByDescending(e => e.CreatedAt)
                .Take(8)
                .ToListAsync(ct);
            
            foreach (var e in dbEntries)
            {
                fallbackEntries.Add(new FallbackEntry(e.Title, e.Content, e.Price, e.Url));
            }

            // B. Also search live Products in Catalog schema (using raw SQL bypassing EF mapping)
            var conn = _db.Database.GetDbConnection();
            var wasOpen = conn.State == System.Data.ConnectionState.Open;
            if (!wasOpen) await conn.OpenAsync(ct);

            try
            {
                using var cmd = conn.CreateCommand();
                
                var isMostExpensive = question.Contains("đắt nhất", StringComparison.OrdinalIgnoreCase) || question.Contains("cao nhất", StringComparison.OrdinalIgnoreCase);
                var isCheapest = question.Contains("rẻ nhất", StringComparison.OrdinalIgnoreCase) || question.Contains("thấp nhất", StringComparison.OrdinalIgnoreCase);

                string query = "";
                if (isMostExpensive) {
                    query = "SELECT \"Name\", \"Description\", \"Price\", \"Specifications\"::text FROM public.\"Products\" WHERE \"IsActive\" = true ORDER BY \"Price\" DESC LIMIT 5;";
                } else if (isCheapest) {
                    query = "SELECT \"Name\", \"Description\", \"Price\", \"Specifications\"::text FROM public.\"Products\" WHERE \"IsActive\" = true ORDER BY \"Price\" ASC LIMIT 5;";
                } else {
                    // C# In-Memory Semantic Word-Intersection Scoring
                    var normalizedQuestion = question.ToLowerInvariant()
                        .Replace("?", " ").Replace(".", " ").Replace(",", " ");
                    var questionWords = new HashSet<string>(
                        normalizedQuestion.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries)
                    );

                    var allProducts = new List<(Guid Id, string Name)>();
                    cmd.CommandText = "SELECT \"Id\", \"Name\" FROM public.\"Products\" WHERE \"IsActive\" = true;";
                    using (var listReader = await cmd.ExecuteReaderAsync(ct))
                    {
                        while (await listReader.ReadAsync(ct))
                        {
                            allProducts.Add((listReader.GetGuid(0), listReader.GetString(1)));
                        }
                    }

                    var scoredProducts = allProducts.Select(p => 
                    {
                        var nameWords = p.Name.ToLowerInvariant()
                            .Split(new[] { ' ', '-' }, StringSplitOptions.RemoveEmptyEntries);
                        int matchCount = nameWords.Count(nw => questionWords.Contains(nw));
                        
                        // Bonus for exact substring match
                        int bonus = normalizedQuestion.Contains(p.Name.ToLowerInvariant()) ? 10 : 0;
                        
                        return new { p.Id, p.Name, Score = matchCount + bonus };
                    })
                    .Where(x => x.Score > 0)
                    .OrderByDescending(x => x.Score)
                    .Take(3)
                    .ToList();

                    if (scoredProducts.Any())
                    {
                        var idList = string.Join(",", scoredProducts.Select(x => $"'{x.Id}'"));
                        query = $"SELECT \"Name\", \"Description\", \"Price\", \"Specifications\"::text FROM public.\"Products\" WHERE \"Id\" IN ({idList});";
                    }
                }

                if (!string.IsNullOrEmpty(query))
                {
                    cmd.CommandText = query;
                    using var reader = await cmd.ExecuteReaderAsync(ct);
                    bool hasProducts = false;
                    
                    while (await reader.ReadAsync(ct))
                    {
                        if (!hasProducts)
                        {
                            contextBuilder.AppendLine("Dữ liệu cập nhật trực tiếp từ Cửa hàng:");
                            hasProducts = true;
                        }
                        var name = reader.GetString(0);
                        var desc = reader.IsDBNull(1) ? "" : reader.GetString(1);
                        var price = reader.GetDecimal(2);
                        var specs = reader.FieldCount > 3 && !reader.IsDBNull(3) ? reader.GetString(3) : "";
                        
                        if (desc.Length > 250) desc = desc.Substring(0, 250) + "...";
                        if (specs.Length > 250) specs = specs.Substring(0, 250) + "...";
                        
                        contextBuilder.AppendLine($"- Tên: {name}");
                        contextBuilder.AppendLine($"  Giá: {price:N0} VNĐ");
                        contextBuilder.AppendLine($"  Mô tả nhanh: {desc}");
                        if (!string.IsNullOrEmpty(specs))
                            contextBuilder.AppendLine($"  Thông số kỹ thuật: {specs}");

                        // Add to fallbackEntries so fallback string generator has data if Gemini fails
                        if (!fallbackEntries.Any(e => e.Title == name))
                        {
                            fallbackEntries.Add(new FallbackEntry(name, desc, price, null));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to query live Products table");
            }
            finally
            {
                if (!wasOpen) await conn.CloseAsync();
            }
        }

        // 2. Build context from SearchEntries (if any non-Product RAG matched, append it too)
        if (fallbackEntries.Any())
        {
            contextBuilder.AppendLine("Thông tin bổ sung từ bài viết/hệ thống:");
            foreach (var entry in fallbackEntries)
            {
                contextBuilder.AppendLine($"- {entry.Title}: {entry.Content}");
                if (entry.Price.HasValue)
                    contextBuilder.AppendLine($"  Giá: {entry.Price:N0} VNĐ");
                if (!string.IsNullOrEmpty(entry.Url))
                    contextBuilder.AppendLine($"  Link: {entry.Url}");
            }
        }

        // 3. Always call Gemini API if key is available (even without RAG data, LLM can still help)
        if (!string.IsNullOrEmpty(_geminiApiKey))
        {
            try
            {
                return await CallGeminiAsync(question, contextBuilder.ToString(), ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini API call failed, falling back to basic response");
            }
        }

        // 4. Fallback: basic template response (no API key or API error)
        if (!fallbackEntries.Any())
        {
            return "Xin chào! 👋 Tôi là trợ lý AI của Quang Hường Computer. Hiện tại hệ thống AI chưa được kết nối. Vui lòng liên hệ nhân viên để được hỗ trợ trực tiếp.";
        }
        return BuildFallbackResponse(question, fallbackEntries);
    }

    private async Task<string> CallGeminiAsync(string question, string ragContext, CancellationToken ct)
    {
        var systemPrompt = $@"Bạn là trợ lý AI của Quang Hường Computer — cửa hàng bán máy tính, linh kiện, và dịch vụ sửa chữa tại Việt Nam.

QUY TẮC:
1. Trả lời ngắn gọn, thân thiện, bằng tiếng Việt
2. Chỉ trả lời về sản phẩm, dịch vụ, bảo hành của Quang Hường Computer
3. Nếu có dữ liệu sản phẩm bên dưới, hãy dùng thông tin đó để trả lời chính xác
4. Nếu không có dữ liệu, hãy gợi ý khách liên hệ nhân viên hoặc truy cập website
5. KHÔNG bịa giá, KHÔNG bịa thông số. Chỉ dùng dữ liệu được cung cấp
6. Dùng emoji phù hợp để tạo cảm giác thân thiện
7. Nếu khách hỏi về so sánh sản phẩm, hãy so sánh dựa trên dữ liệu có sẵn
8. Cuối câu trả lời, gợi ý 1-2 câu hỏi liên quan mà khách có thể quan tâm

{(string.IsNullOrEmpty(ragContext) ? "Không có dữ liệu sản phẩm cụ thể cho câu hỏi này." : ragContext)}";

        var requestBody = new GeminiRequest
        {
            Contents = new[]
            {
                new GeminiContent
                {
                    Parts = new[] { new GeminiPart { Text = question } }
                }
            },
            SystemInstruction = new GeminiContent
            {
                Parts = new[] { new GeminiPart { Text = systemPrompt } }
            },
            GenerationConfig = new GeminiGenerationConfig
            {
                Temperature = 0.7f,
                MaxOutputTokens = 1024,
                TopP = 0.9f
            }
        };

        var client = _httpClientFactory.CreateClient();
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_geminiModel}:generateContent?key={_geminiApiKey}";

        var response = await client.PostAsJsonAsync(url, requestBody, ct);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Gemini API error {StatusCode}: {Error}", response.StatusCode, errorBody);
            throw new Exception($"Gemini API returned {response.StatusCode}");
        }

        var result = await response.Content.ReadFromJsonAsync<GeminiResponse>(ct);
        var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

        if (string.IsNullOrEmpty(text))
        {
            throw new Exception("Gemini returned empty response");
        }

        return text;
    }

    private string BuildFallbackResponse(string question, List<FallbackEntry> entries)
    {
        if (!entries.Any())
        {
            return "Tôi xin lỗi, tôi chưa tìm thấy thông tin chính xác về câu hỏi của bạn. Bạn có thể hỏi về các sản phẩm máy tính, linh kiện, dịch vụ sửa chữa hoặc chính sách bảo hành của Quang Hường Computer.";
        }

        var response = new StringBuilder();
        response.AppendLine("Chào bạn! 👋");
        response.AppendLine();
        response.AppendLine("Dựa trên thông tin từ hệ thống:");
        response.AppendLine();

        foreach (var entry in entries)
        {
            response.AppendLine($"• **{entry.Title}**");
            response.AppendLine($"  {entry.Content}");
            if (entry.Price.HasValue)
                response.AppendLine($"  💰 Giá: {entry.Price:N0} VNĐ");
            if (!string.IsNullOrEmpty(entry.Url))
                response.AppendLine($"  🔗 Chi tiết: {entry.Url}");
            response.AppendLine();
        }

        response.AppendLine("Bạn có muốn tôi hỗ trợ thêm không?");
        return response.ToString();
    }

    private bool ContainsDisallowedTopic(string question)
    {
        var lowerQuestion = question.ToLowerInvariant();
        return _disallowedTopics.Any(topic => lowerQuestion.Contains(topic.ToLowerInvariant()));
    }

    private string[] ExtractKeywords(string question)
    {
        var stopWords = new HashSet<string> { "là", "của", "và", "có", "the", "is", "are", "a", "an", "cho", "tôi", "với", "này", "đó", "được", "không", "bạn", "như", "thế", "nào", "gì", "sao" };

        return question
            .Split(new[] { ' ', ',', '.', '?', '!' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(word => word.Length > 2 && !stopWords.Contains(word.ToLowerInvariant()))
            .ToArray();
    }
}

public record FallbackEntry(string Title, string Content, decimal? Price, string? Url);

// ============================
// Gemini API DTOs
// ============================

public class GeminiRequest
{
    [JsonPropertyName("contents")]
    public GeminiContent[] Contents { get; set; } = Array.Empty<GeminiContent>();

    [JsonPropertyName("systemInstruction")]
    public GeminiContent? SystemInstruction { get; set; }

    [JsonPropertyName("generationConfig")]
    public GeminiGenerationConfig? GenerationConfig { get; set; }
}

public class GeminiContent
{
    [JsonPropertyName("parts")]
    public GeminiPart[] Parts { get; set; } = Array.Empty<GeminiPart>();
}

public class GeminiPart
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = "";
}

public class GeminiGenerationConfig
{
    [JsonPropertyName("temperature")]
    public float Temperature { get; set; } = 0.7f;

    [JsonPropertyName("maxOutputTokens")]
    public int MaxOutputTokens { get; set; } = 1024;

    [JsonPropertyName("topP")]
    public float TopP { get; set; } = 0.9f;
}

public class GeminiResponse
{
    [JsonPropertyName("candidates")]
    public GeminiCandidate[]? Candidates { get; set; }
}

public class GeminiCandidate
{
    [JsonPropertyName("content")]
    public GeminiContent? Content { get; set; }
}
