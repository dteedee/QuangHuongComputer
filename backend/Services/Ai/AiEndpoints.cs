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

            var response = await aiService.AskAsync(request.Message);
            return Results.Ok(new { response });
        });

        // NOTE: /recommendations/* handled by RecommendationEndpoints
        // NOTE: /search handled by SemanticSearchEndpoints
    }
}

public record ChatRequest(string Message);
