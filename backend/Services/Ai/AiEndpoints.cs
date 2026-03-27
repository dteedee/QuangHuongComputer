using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using Ai.Application;
using System.Text.Json;

namespace Ai;

public static class AiEndpoints
{
    public static void MapAiEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ai");

        // 1. Chatbot Endpoint
        group.MapPost("/chat", async ([FromBody] ChatRequest request, IAiService aiService) =>
        {
            if (string.IsNullOrWhiteSpace(request.Message))
            {
                return Results.BadRequest(new { error = "Message cannot be empty" });
            }

            var response = await aiService.AskAsync(request.Message);
            return Results.Ok(new { response });
        });

        // 2. Collaborative Filtering Recommendations (Mocked AI Logic for Phase 4.2)
        group.MapGet("/recommendations/{productId:guid}", (Guid productId) =>
        {
            // In a real system, this would query a matrix factorization model or neo4j DB
            // "Customers who bought this also bought..."
            var mockRecommendations = new[]
            {
                new { Id = Guid.NewGuid(), Name = "Bàn phím cơ Logitech G Pro X", Price = 2500000, SimilarityScore = 0.95 },
                new { Id = Guid.NewGuid(), Name = "Chuột Logitech G502 Hero", Price = 1100000, SimilarityScore = 0.88 },
                new { Id = Guid.NewGuid(), Name = "Tai nghe Razer BlackShark V2", Price = 1800000, SimilarityScore = 0.82 }
            };

            return Results.Ok(new { recommendations = mockRecommendations, baseProductId = productId });
        });

        // 3. Natural Language Search
        group.MapPost("/search", async ([FromBody] ChatRequest request, IAiService aiService) =>
        {
            // For now, this leverages the RAG mechanism in AskAsync to find semantic matches
            var response = await aiService.AskAsync(request.Message);
            return Results.Ok(new { intelligentResult = response });
        });
    }
}

public record ChatRequest(string Message);
