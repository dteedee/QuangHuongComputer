using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;
using Sales.Domain;

namespace ApiGateway;

/// <summary>
/// Middleware to validate that users have purchased a product before allowing them to review it.
/// This is placed at the ApiGateway level to avoid circular dependency between Catalog and Sales.
/// </summary>
public class ReviewValidationMiddleware
{
    private readonly RequestDelegate _next;

    public ReviewValidationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, SalesDbContext salesDb)
    {
        // Only intercept POST requests to create reviews
        if (context.Request.Method == "POST" &&
            context.Request.Path.StartsWithSegments("/api/catalog/products") &&
            context.Request.Path.Value?.EndsWith("/reviews") == true)
        {
            // Extract productId from path: /api/catalog/products/{productId}/reviews
            var pathParts = context.Request.Path.Value.Split('/');
            if (pathParts.Length >= 5 && Guid.TryParse(pathParts[4], out var productId))
            {
                var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var userGuid))
                {
                    // Check if user has purchased this product
                    var hasPurchased = await salesDb.Orders
                        .Include(o => o.Items)
                        .AnyAsync(o => o.CustomerId == userGuid
                            && (o.Status == OrderStatus.Completed ||
                                o.Status == OrderStatus.Delivered ||
                                o.Status == OrderStatus.Paid)
                            && o.Items.Any(i => i.ProductId == productId));

                    if (!hasPurchased)
                    {
                        context.Response.StatusCode = 403;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsJsonAsync(new
                        {
                            message = "Bạn cần mua sản phẩm này trước khi đánh giá"
                        });
                        return;
                    }

                    // Set header to indicate verified purchase for the downstream endpoint
                    context.Request.Headers["X-Verified-Purchase"] = "true";
                }
            }
        }

        await _next(context);
    }
}

public static class ReviewValidationMiddlewareExtensions
{
    public static IApplicationBuilder UseReviewValidation(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ReviewValidationMiddleware>();
    }
}
