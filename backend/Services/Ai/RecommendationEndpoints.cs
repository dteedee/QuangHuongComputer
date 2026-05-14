using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Ai.Infrastructure;
using Sales.Infrastructure;

namespace Ai;

public static class RecommendationEndpoints
{
    public static void MapRecommendationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ai/recommendations");

        // Hybrid: collaborative + content-based
        group.MapGet("/{productId:guid}", async (Guid productId, RecommendationEngine engine) =>
        {
            var collaborative = await engine.GetCollaborativeRecommendations(productId, 4);
            var contentBased = await engine.GetContentBasedRecommendations(productId, 4);

            // Merge: collaborative first, fill remaining with content-based (no duplicates)
            var seen = new HashSet<Guid>(collaborative.Select(r => r.ProductId));
            var merged = collaborative
                .Concat(contentBased.Where(r => !seen.Contains(r.ProductId)))
                .Take(8)
                .ToList();

            return Results.Ok(new { recommendations = merged, baseProductId = productId });
        });

        // Trending products (public)
        group.MapGet("/trending", async (RecommendationEngine engine) =>
        {
            var trending = await engine.GetTrendingProducts(10);
            return Results.Ok(new { products = trending });
        });

        // Personalized: based on user's recent orders
        group.MapGet("/personalized", async (
            ClaimsPrincipal user,
            RecommendationEngine engine,
            SalesDbContext salesDb) =>
        {
            if (user.Identity?.IsAuthenticated != true)
                return Results.Unauthorized();

            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            // Get products from user's recent orders
            var since = DateTime.UtcNow.AddDays(-90);
            var recentProductIds = await salesDb.Orders
                .Where(o => o.CustomerId == userId && o.OrderDate >= since)
                .SelectMany(o => o.Items)
                .Select(i => i.ProductId)
                .Distinct()
                .Take(5)
                .ToListAsync();

            if (!recentProductIds.Any())
            {
                var trending = await engine.GetTrendingProducts(8);
                return Results.Ok(new { products = trending, strategy = "trending_fallback" });
            }

            var allRecs = new List<RecommendedProduct>();
            foreach (var pid in recentProductIds)
            {
                var recs = await engine.GetCollaborativeRecommendations(pid, 4);
                allRecs.AddRange(recs);
            }

            var purchased = new HashSet<Guid>(recentProductIds);
            var personalized = allRecs
                .Where(r => !purchased.Contains(r.ProductId))
                .GroupBy(r => r.ProductId)
                .Select(g => new RecommendedProduct
                {
                    ProductId = g.Key,
                    ProductName = g.First().ProductName,
                    Price = g.First().Price,
                    ImageUrl = g.First().ImageUrl,
                    Slug = g.First().Slug,
                    Score = g.Sum(r => r.Score),
                    Strategy = "personalized"
                })
                .OrderByDescending(r => r.Score)
                .Take(8)
                .ToList();

            return Results.Ok(new { products = personalized, strategy = "personalized" });
        });
    }
}
