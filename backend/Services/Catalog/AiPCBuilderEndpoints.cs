using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;

namespace Catalog;

public static class AiPCBuilderEndpoints
{
    // Budget allocation by component type (must sum to 1.0)
    private static readonly Dictionary<string, double> BudgetAllocation = new()
    {
        { "GPU",  0.35 },
        { "CPU",  0.25 },
        { "RAM",  0.10 },
        { "SSD",  0.10 },
        { "PSU",  0.10 },
        { "Case", 0.10 },
    };

    // Vietnamese category name keywords mapped to component type
    private static readonly Dictionary<string, string[]> CategoryKeywords = new()
    {
        { "GPU",  new[] { "vga", "card màn hình", "gpu", "card đồ họa" } },
        { "CPU",  new[] { "cpu", "vi xử lý", "processor", "intel core", "amd ryzen" } },
        { "RAM",  new[] { "ram", "bộ nhớ", "memory" } },
        { "SSD",  new[] { "ssd", "hdd", "ổ cứng", "nvme", "storage" } },
        { "PSU",  new[] { "psu", "nguồn", "power supply" } },
        { "Case", new[] { "case", "vỏ máy", "chassis" } },
    };

    public static void MapAiPCBuilderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog/pc-builder");

        // POST /api/catalog/pc-builder/ai-suggest
        group.MapPost("/ai-suggest", async ([FromBody] AiPcSuggestRequest request, CatalogDbContext db) =>
        {
            if (request.Budget <= 0)
                return Results.BadRequest(new { error = "Budget must be greater than 0" });

            var useCaseLower = (request.UseCase ?? "").ToLower();

            // Adjust GPU/CPU ratio for gaming vs workstation
            var allocation = new Dictionary<string, double>(BudgetAllocation);
            if (useCaseLower.Contains("gaming") || useCaseLower.Contains("game"))
            {
                allocation["GPU"] = 0.40;
                allocation["CPU"] = 0.20;
            }
            else if (useCaseLower.Contains("render") || useCaseLower.Contains("design") || useCaseLower.Contains("workstation"))
            {
                allocation["GPU"] = 0.30;
                allocation["CPU"] = 0.30;
            }

            // Load all active products with categories (single query)
            var allProducts = await db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Where(p => p.IsActive && p.StockQuantity > 0)
                .ToListAsync();

            var components = new List<object>();
            decimal totalPrice = 0;

            foreach (var (componentType, ratio) in allocation)
            {
                var componentBudget = request.Budget * (decimal)ratio;
                var keywords = CategoryKeywords[componentType];

                // Match products whose category name contains any keyword
                var candidates = allProducts
                    .Where(p => p.Category != null &&
                        keywords.Any(k => p.Category.Name.ToLower().Contains(k)))
                    .ToList();

                if (!candidates.Any()) continue;

                // Pick best product within budget; if none, pick cheapest
                var best = candidates
                    .Where(p => p.Price <= componentBudget)
                    .OrderByDescending(p => p.Price)
                    .FirstOrDefault()
                    ?? candidates.OrderBy(p => p.Price).First();

                components.Add(new
                {
                    ComponentType = componentType,
                    ProductId = best.Id,
                    ProductName = best.Name,
                    Price = best.Price,
                    ImageUrl = best.ImageUrl,
                    Slug = best.Slug,
                    BudgetAllocated = componentBudget,
                    WithinBudget = best.Price <= componentBudget
                });

                totalPrice += best.Price;
            }

            return Results.Ok(new
            {
                Budget = request.Budget,
                UseCase = request.UseCase,
                TotalPrice = totalPrice,
                WithinBudget = totalPrice <= request.Budget,
                Components = components
            });
        });
    }
}

public record AiPcSuggestRequest(decimal Budget, string? UseCase);
