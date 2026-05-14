using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;
using Catalog.Infrastructure;
using Sales.Domain;

namespace Ai.Infrastructure;

public class RecommendationEngine
{
    private readonly SalesDbContext _salesDb;
    private readonly CatalogDbContext _catalogDb;

    public RecommendationEngine(SalesDbContext salesDb, CatalogDbContext catalogDb)
    {
        _salesDb = salesDb;
        _catalogDb = catalogDb;
    }

    // Collaborative filtering: products bought together
    public async Task<List<RecommendedProduct>> GetCollaborativeRecommendations(Guid productId, int limit = 8)
    {
        return await _salesDb.Orders
            .Where(o => o.Status != OrderStatus.Cancelled)
            .Where(o => o.Items.Any(i => i.ProductId == productId))
            .SelectMany(o => o.Items)
            .Where(i => i.ProductId != productId)
            .GroupBy(i => new { i.ProductId, i.ProductName })
            .Select(g => new RecommendedProduct
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.ProductName,
                Score = g.Count(),
                Strategy = "collaborative"
            })
            .OrderByDescending(r => r.Score)
            .Take(limit)
            .ToListAsync();
    }

    // Content-based: same category + brand, similar price range
    public async Task<List<RecommendedProduct>> GetContentBasedRecommendations(Guid productId, int limit = 8)
    {
        var product = await _catalogDb.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == productId);
        if (product == null) return new();

        var priceRange = product.Price * 0.3m;
        return await _catalogDb.Products
            .AsNoTracking()
            .Where(p => p.IsActive && p.Id != productId)
            .Where(p => p.CategoryId == product.CategoryId || p.BrandId == product.BrandId)
            .Where(p => p.Price >= product.Price - priceRange && p.Price <= product.Price + priceRange)
            .OrderBy(p => Math.Abs(p.Price - product.Price))
            .Take(limit)
            .Select(p => new RecommendedProduct
            {
                ProductId = p.Id,
                ProductName = p.Name,
                Price = p.Price,
                ImageUrl = p.ImageUrl,
                Slug = p.Slug,
                Score = 1.0 - (double)Math.Abs(p.Price - product.Price) / (double)product.Price,
                Strategy = "content"
            })
            .ToListAsync();
    }

    // Trending: most ordered in last 30 days
    public async Task<List<RecommendedProduct>> GetTrendingProducts(int limit = 10)
    {
        var since = DateTime.UtcNow.AddDays(-30);
        return await _salesDb.Orders
            .Where(o => o.OrderDate >= since && o.Status != OrderStatus.Cancelled)
            .SelectMany(o => o.Items)
            .GroupBy(i => new { i.ProductId, i.ProductName })
            .Select(g => new RecommendedProduct
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.ProductName,
                Score = g.Sum(i => i.Quantity),
                Strategy = "trending"
            })
            .OrderByDescending(r => r.Score)
            .Take(limit)
            .ToListAsync();
    }
}

public class RecommendedProduct
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public string? Slug { get; set; }
    public double Score { get; set; }
    public string Strategy { get; set; } = "";
}
