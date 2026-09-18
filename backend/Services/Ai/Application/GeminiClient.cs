using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace Ai.Application;

/// <summary>Thin wrapper over the Gemini generateContent REST call. Split out of AiService.cs
/// (W2-15 modularization) so the orchestration logic and the HTTP/DTO plumbing are separate
/// files.</summary>
public interface IGeminiClient
{
    Task<string> GenerateAsync(string model, string apiKey, string systemPrompt, string question, CancellationToken ct);
}

public class GeminiClient : IGeminiClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GeminiClient> _logger;

    public GeminiClient(IHttpClientFactory httpClientFactory, ILogger<GeminiClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<string> GenerateAsync(string model, string apiKey, string systemPrompt, string question, CancellationToken ct)
    {
        var requestBody = new GeminiRequest
        {
            Contents = new[]
            {
                new GeminiContent { Parts = new[] { new GeminiPart { Text = question } } }
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
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

        var response = await client.PostAsJsonAsync(url, requestBody, ct);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Gemini API error {StatusCode}: {Error}", response.StatusCode, errorBody);
            throw new InvalidOperationException($"Gemini API returned {response.StatusCode}");
        }

        var result = await response.Content.ReadFromJsonAsync<GeminiResponse>(ct);
        var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

        if (string.IsNullOrEmpty(text))
        {
            throw new InvalidOperationException("Gemini returned empty response");
        }

        return text;
    }
}

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
