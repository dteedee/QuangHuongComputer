using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using Ai.Application;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
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
        group.MapGet("/recommendations/{productId:guid}", async (Guid productId, Ai.Infrastructure.AiDbContext db) =>
        {
            var recommendations = new List<object>();
            var connection = db.Database.GetDbConnection();
            
            bool wasClosed = connection.State == System.Data.ConnectionState.Closed;
            if (wasClosed) await connection.OpenAsync();
            try
            {
                using var command = connection.CreateCommand();
                command.CommandText = @"
                    SELECT ""Id"", ""Name"", ""Price"", ""ImageUrl""
                    FROM public.""Products""
                    WHERE ""CategoryId"" = (SELECT ""CategoryId"" FROM public.""Products"" WHERE ""Id"" = @productId LIMIT 1)
                    AND ""Id"" != @productId
                    AND ""IsActive"" = true
                    ORDER BY random()
                    LIMIT 4;
                ";
                
                var param = command.CreateParameter();
                param.ParameterName = "@productId";
                param.Value = productId;
                command.Parameters.Add(param);

                using var reader = await command.ExecuteReaderAsync();
                var random = new Random();
                while (await reader.ReadAsync())
                {
                    recommendations.Add(new
                    {
                        id = reader.GetGuid(0),
                        name = reader.GetString(1),
                        price = reader.GetDecimal(2),
                        imageUrl = reader.IsDBNull(3) ? null : reader.GetString(3),
                        similarityScore = Math.Round(0.80 + (random.NextDouble() * 0.15), 2)
                    });
                }
            }
            finally
            {
                if (wasClosed) await connection.CloseAsync();
            }

            return Results.Ok(new { recommendations, baseProductId = productId });
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
