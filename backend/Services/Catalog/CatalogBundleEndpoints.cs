using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Domain;

namespace Catalog;

public static class CatalogBundleEndpoints
{
    public static void MapCatalogBundleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog/bundles");

        group.MapGet("/", async (CatalogDbContext db) =>
        {
            var now = DateTime.UtcNow;
            var bundles = await db.ProductBundles
                .Include(b => b.Items)
                .AsNoTracking()
                .Where(b => b.ValidFrom == null || b.ValidFrom <= now)
                .Where(b => b.ValidTo == null || b.ValidTo >= now)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            var productIds = bundles.SelectMany(b => b.Items.Select(i => i.ProductId)).Distinct().ToList();
            var products = await db.Products
                .AsNoTracking()
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            var result = bundles.Select(b => new
            {
                b.Id,
                b.Name,
                b.Description,
                b.TotalPrice,
                b.OriginalPrice,
                b.ImageUrl,
                b.ValidFrom,
                b.ValidTo,
                Items = b.Items.Select(i => new
                {
                    i.Id,
                    i.ProductId,
                    i.IsMainItem,
                    i.Quantity,
                    i.OriginalUnitPrice,
                    i.DiscountPercentage,
                    i.DiscountedUnitPrice,
                    ProductName = products.ContainsKey(i.ProductId) ? products[i.ProductId].Name : "Unknown",
                    ProductImage = products.ContainsKey(i.ProductId) ? products[i.ProductId].ImageUrl : null,
                    ProductSku = products.ContainsKey(i.ProductId) ? products[i.ProductId].Sku : null
                })
            });

            return Results.Ok(result);
        });

        group.MapGet("/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var b = await db.ProductBundles
                .Include(x => x.Items)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (b == null) return Results.NotFound();

            var productIds = b.Items.Select(i => i.ProductId).Distinct().ToList();
            var products = await db.Products
                .AsNoTracking()
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            var result = new
            {
                b.Id,
                b.Name,
                b.Description,
                b.TotalPrice,
                b.OriginalPrice,
                b.ImageUrl,
                b.ValidFrom,
                b.ValidTo,
                Items = b.Items.Select(i => new
                {
                    i.Id,
                    i.ProductId,
                    i.IsMainItem,
                    i.Quantity,
                    i.OriginalUnitPrice,
                    i.DiscountPercentage,
                    i.DiscountedUnitPrice,
                    ProductName = products.ContainsKey(i.ProductId) ? products[i.ProductId].Name : "Unknown",
                    ProductImage = products.ContainsKey(i.ProductId) ? products[i.ProductId].ImageUrl : null,
                    ProductSku = products.ContainsKey(i.ProductId) ? products[i.ProductId].Sku : null
                })
            };

            return Results.Ok(result);
        });

        group.MapGet("/product/{productId:guid}", async (Guid productId, CatalogDbContext db) =>
        {
            var now = DateTime.UtcNow;

            // Find all active bundles that contain this product
            var bundleIds = await db.ProductBundleItems
                .Where(i => i.ProductId == productId)
                .Select(i => i.BundleId)
                .Distinct()
                .ToListAsync();

            if (!bundleIds.Any()) return Results.Ok(new List<object>());

            var bundles = await db.ProductBundles
                .Include(b => b.Items)
                .AsNoTracking()
                .Where(b => bundleIds.Contains(b.Id))
                .Where(b => b.ValidFrom == null || b.ValidFrom <= now)
                .Where(b => b.ValidTo == null || b.ValidTo >= now)
                .ToListAsync();

            var allProductIds = bundles.SelectMany(b => b.Items.Select(i => i.ProductId)).Distinct().ToList();
            var products = await db.Products
                .AsNoTracking()
                .Where(p => allProductIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            var result = bundles.Select(b => new
            {
                b.Id,
                b.Name,
                b.Description,
                b.TotalPrice,
                b.OriginalPrice,
                b.ImageUrl,
                b.ValidFrom,
                b.ValidTo,
                Items = b.Items.Select(i => new
                {
                    i.Id,
                    i.ProductId,
                    i.IsMainItem,
                    i.Quantity,
                    i.OriginalUnitPrice,
                    i.DiscountPercentage,
                    i.DiscountedUnitPrice,
                    ProductName = products.ContainsKey(i.ProductId) ? products[i.ProductId].Name : "Unknown",
                    ProductImage = products.ContainsKey(i.ProductId) ? products[i.ProductId].ImageUrl : null,
                    ProductSku = products.ContainsKey(i.ProductId) ? products[i.ProductId].Sku : null
                })
            });

            return Results.Ok(result);
        });

        // Admin Endpoints
        group.MapPost("/", async (CreateBundleRequest request, CatalogDbContext db) =>
        {
            var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
            var products = await db.Products
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            var bundle = new ProductBundle(
                request.Name,
                request.Description ?? "",
                request.TotalPrice,
                request.OriginalPrice,
                request.ImageUrl,
                request.ValidFrom,
                request.ValidTo
            );

            foreach (var item in request.Items)
            {
                if (products.TryGetValue(item.ProductId, out var product))
                {
                    bundle.AddItem(item.ProductId, item.IsMainItem, item.Quantity, product.Price, item.DiscountPercentage);
                }
            }

            db.ProductBundles.Add(bundle);
            await db.SaveChangesAsync();

            return Results.Created($"/api/catalog/bundles/{bundle.Id}", bundle.Id);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));
    }
}

public record CreateBundleRequest(
    string Name,
    string? Description,
    decimal TotalPrice,
    decimal OriginalPrice,
    string? ImageUrl,
    DateTime? ValidFrom,
    DateTime? ValidTo,
    List<CreateBundleItemRequest> Items);

public record CreateBundleItemRequest(
    Guid ProductId,
    bool IsMainItem,
    int Quantity,
    decimal DiscountPercentage);
