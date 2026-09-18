using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Endpoints.Orders;

/// <summary>
/// Thống kê mua hàng + kiểm tra "đã mua sản phẩm này chưa" của KHÁCH — trích từ
/// <see cref="CustomerOrderEndpoints"/> để giữ mỗi file dưới 200 dòng. Chỉ đọc, luôn lọc theo
/// userId lấy từ token.
/// </summary>
internal static class CustomerOrderStatsEndpoints
{
    public static void MapCustomerOrderStatsEndpoints(RouteGroupBuilder group)
    {
        // GET /api/sales/my-stats - Customer's purchase statistics
        group.MapGet("/my-stats", async (SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var orders = await db.Orders
                .Where(o => o.CustomerId == userId)
                .ToListAsync();

            var completedOrders = orders.Where(o => o.Status == OrderStatus.Completed || o.Status == OrderStatus.Delivered).ToList();
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
            var thisYearStart = new DateTime(DateTime.UtcNow.Year, 1, 1);

            var stats = new
            {
                totalOrders = orders.Count,
                completedOrders = completedOrders.Count,
                pendingOrders = orders.Count(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.Confirmed),
                cancelledOrders = orders.Count(o => o.Status == OrderStatus.Cancelled),

                totalSpent = completedOrders.Sum(o => o.TotalAmount),
                monthlySpent = completedOrders.Where(o => o.OrderDate >= thirtyDaysAgo).Sum(o => o.TotalAmount),
                yearlySpent = completedOrders.Where(o => o.OrderDate >= thisYearStart).Sum(o => o.TotalAmount),
                averageOrderValue = completedOrders.Any() ? completedOrders.Average(o => o.TotalAmount) : 0,

                lastOrderDate = orders.OrderByDescending(o => o.OrderDate).FirstOrDefault()?.OrderDate,
                firstOrderDate = orders.OrderBy(o => o.OrderDate).FirstOrDefault()?.OrderDate,

                // Customer tier calculation based on total spent
                customerTier = completedOrders.Sum(o => o.TotalAmount) switch
                {
                    >= 50000000 => "VIP",      // >= 50M VND
                    >= 20000000 => "Gold",     // >= 20M VND
                    >= 10000000 => "Silver",   // >= 10M VND
                    >= 5000000 => "Bronze",    // >= 5M VND
                    _ => "Member"
                },

                // Loyalty points estimation (1000 VND = 1 point)
                loyaltyPoints = (int)(completedOrders.Sum(o => o.TotalAmount) / 1000)
            };

            return Results.Ok(stats);
        });

        // ==================== VERIFIED PURCHASE CHECK ====================

        // Check if user has purchased a specific product
        group.MapGet("/verify-purchase/{productId:guid}", async (Guid productId, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            // Check if user has any completed/delivered order containing this product
            var hasPurchased = await db.Orders
                .Include(o => o.Items)
                .AnyAsync(o => o.CustomerId == userId
                    && (o.Status == OrderStatus.Completed || o.Status == OrderStatus.Delivered || o.Status == OrderStatus.Fulfilled)
                    && o.Items.Any(i => i.ProductId == productId));

            return Results.Ok(new {
                productId,
                hasPurchased,
                message = hasPurchased ? "Bạn đã mua sản phẩm này" : "Bạn chưa mua sản phẩm này"
            });
        });

    }
}
