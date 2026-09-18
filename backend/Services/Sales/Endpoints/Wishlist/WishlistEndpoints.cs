using System.Security.Claims;
using System.Text.Json;
using BuildingBlocks.Security;
using BuildingBlocks.SharedKernel;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Sales.Domain;
using Sales.Infrastructure;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using Content.Infrastructure;
using Content.Domain;
using Sales.Application.Pricing;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace Sales.Endpoints.Wishlist;

/// <summary>
/// Danh sách yêu thích — trích nguyên văn bởi W2-3. Thuộc W2-3.
/// </summary>
internal static class WishlistEndpoints
{
    public static void MapWishlistEndpoints(RouteGroupBuilder group, RouteGroupBuilder adminGroup)
    {
        // ==================== WISHLIST ENDPOINTS ====================

        group.MapGet("/wishlist", async (SalesDbContext db, CatalogDbContext catalogDb, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var wishlistItems = await db.WishlistItems
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.AddedAt)
                .ToListAsync();

            if (wishlistItems.Count == 0)
                return Results.Ok(new { items = new List<object>() });

            var productIds = wishlistItems.Select(w => w.ProductId).ToList();
            var products = await catalogDb.Products
                .Where(p => productIds.Contains(p.Id) && p.IsActive)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Price,
                    p.OldPrice,
                    p.ImageUrl,
                    p.StockQuantity,
                    p.Sku
                })
                .ToDictionaryAsync(p => p.Id);

            var result = wishlistItems
                .Where(w => products.ContainsKey(w.ProductId))
                .Select(w => new
                {
                    id = w.Id,
                    productId = w.ProductId,
                    addedAt = w.AddedAt,
                    product = products.TryGetValue(w.ProductId, out var p) ? p : null
                })
                .ToList();

            return Results.Ok(new { items = result });
        });

        group.MapPost("/wishlist/{productId:guid}", async (Guid productId, SalesDbContext db, CatalogDbContext catalogDb, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // Check if product exists
            var productExists = await catalogDb.Products.AnyAsync(p => p.Id == productId && p.IsActive);
            if (!productExists)
                return Results.NotFound(new { message = "Sản phẩm không tồn tại" });

            // Check if already in wishlist
            var existing = await db.WishlistItems
                .FirstOrDefaultAsync(w => w.UserId == userId && w.ProductId == productId);

            if (existing != null)
                return Results.Ok(new { message = "Sản phẩm đã có trong danh sách yêu thích", id = existing.Id });

            var wishlistItem = new WishlistItem(userId, productId);
            db.WishlistItems.Add(wishlistItem);
            await db.SaveChangesAsync();

            return Results.Created($"/api/sales/wishlist/{wishlistItem.Id}", new
            {
                message = "Đã thêm vào danh sách yêu thích",
                id = wishlistItem.Id
            });
        });

        group.MapDelete("/wishlist/{productId:guid}", async (Guid productId, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var wishlistItem = await db.WishlistItems
                .FirstOrDefaultAsync(w => w.UserId == userId && w.ProductId == productId);

            if (wishlistItem == null)
                return Results.NotFound(new { message = "Sản phẩm không có trong danh sách yêu thích" });

            db.WishlistItems.Remove(wishlistItem);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã xóa khỏi danh sách yêu thích" });
        });

        group.MapGet("/wishlist/check/{productId:guid}", async (Guid productId, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Ok(new { inWishlist = false });

            var exists = await db.WishlistItems
                .AnyAsync(w => w.UserId == userId && w.ProductId == productId);

            return Results.Ok(new { inWishlist = exists });
        });

    }
}
