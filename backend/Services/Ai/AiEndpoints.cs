using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using Ai.Application;
namespace Ai;

public static class AiEndpoints
{
    public static void MapAiEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ai");

        // Chatbot endpoint
        group.MapPost("/chat", async ([FromBody] ChatRequest request, IAiService aiService) =>
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                return Results.BadRequest(new { error = "Message cannot be empty" });
            if (request.Message.Length > AiGuardrails.MaxQuestionLength)
                return Results.BadRequest(new { error = $"Message exceeds {AiGuardrails.MaxQuestionLength} characters" });

            var response = await aiService.AskAsync(request.Message);
            return Results.Ok(new { response });
            // W1-10: chatbot storefront cho khách vãng lai.
            // Cần rule POST /api/ai/chat trong PublicEndpointAllowList + rate limit (IR W1, xem W0 #110).
        }).AllowAnonymous()
          // W2-15: applies IR W0 #4 - "ai" policy exists since W0 but nothing attached it yet.
          .RequireRateLimiting("ai");

        // NOTE: /recommendations/* handled by RecommendationEndpoints
        // NOTE: /search handled by SemanticSearchEndpoints
    }
}

public record ChatRequest(string Message);
