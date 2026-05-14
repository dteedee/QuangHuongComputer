using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;

namespace Ai;

public static class SemanticSearchEndpoints
{
    public static void MapSemanticSearchEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ai");

        // POST /api/ai/search — semantic search with ILIKE fallback (pgvector future)
        group.MapPost("/search", async ([FromBody] SemanticSearchRequest request, CatalogDbContext catalogDb) =>
        {
            if (string.IsNullOrWhiteSpace(request.Query))
                return Results.BadRequest(new { error = "Query cannot be empty" });

            var terms = request.Query.Trim().ToLower()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Distinct()
                .Take(5)
                .ToArray();

            var query = catalogDb.Products
                .AsNoTracking()
                .Where(p => p.IsActive)
                .Include(p => p.Category)
                .Include(p => p.Brand);

            // Build OR conditions for each term across name, description, brand/category
            // EF Core translates this to ILIKE on PostgreSQL
            var results = await query
                .Where(p =>
                    terms.Any(t => EF.Functions.ILike(p.Name, $"%{t}%")) ||
                    terms.Any(t => EF.Functions.ILike(p.Description, $"%{t}%")) ||
                    terms.Any(t => p.Category != null && EF.Functions.ILike(p.Category.Name, $"%{t}%")) ||
                    terms.Any(t => p.Brand != null && EF.Functions.ILike(p.Brand.Name, $"%{t}%"))
                )
                .OrderByDescending(p => p.SoldCount)
                .Take(20)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Price,
                    p.OldPrice,
                    p.ImageUrl,
                    p.Slug,
                    CategoryName = p.Category != null ? p.Category.Name : null,
                    BrandName = p.Brand != null ? p.Brand.Name : null,
                    RelevanceScore = terms.Count(t =>
                        p.Name.ToLower().Contains(t) ||
                        (p.Description != null && p.Description.ToLower().Contains(t))
                    )
                })
                .ToListAsync();

            // Sort by relevance score descending
            var sorted = results
                .OrderByDescending(r => r.RelevanceScore)
                .ThenByDescending(r => r.RelevanceScore)
                .ToList();

            return Results.Ok(new { results = sorted, query = request.Query, total = sorted.Count });
        });
    }
}

public record SemanticSearchRequest(string Query);
