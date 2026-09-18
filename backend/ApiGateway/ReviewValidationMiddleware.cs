using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;
using Sales.Domain;

namespace ApiGateway;

/// <summary>
/// Middleware to validate that users have purchased a product before allowing them to review it.
/// This is placed at the ApiGateway level to avoid circular dependency between Catalog and Sales.
///
/// W0-3 hardening (the endpoint contract is unchanged — CatalogReviewEndpoints still reads
/// <c>X-Verified-Purchase</c>; only who may set it changed):
///  1. The inbound header is stripped from EVERY request before anything else runs, so a client
///     can never hand itself a verified badge.
///  2. The route is matched on a normalised path (trailing slash trimmed, case-insensitive regex)
///     instead of <c>StartsWithSegments</c> + <c>EndsWith("/reviews")</c>, which
///     <c>/api/catalog/products/{id}/reviews/</c> walked straight past.
///  3. The header is only ever written from the server-side Sales lookup below.
/// </summary>
public class ReviewValidationMiddleware
{
    /// <summary>The one header the downstream review endpoint trusts. Server-set only.</summary>
    public const string VerifiedPurchaseHeader = "X-Verified-Purchase";

    /// <summary>POST /api/catalog/products/{guid}/reviews — nothing else, whatever the casing.</summary>
    private static readonly Regex ReviewRoute = new(
        @"^/api/catalog/products/([^/]+)/reviews$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private readonly RequestDelegate _next;

    public ReviewValidationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, SalesDbContext salesDb)
    {
        // (1) Never trust an inbound value — on every request, every route, every method.
        context.Request.Headers.Remove(VerifiedPurchaseHeader);

        if (HttpMethods.IsPost(context.Request.Method) &&
            TryMatchReviewRoute(context.Request.Path.Value, out var productId))
        {
            var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var userGuid))
            {
                // (3) The only writer of the header: a server-side order lookup.
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

                context.Request.Headers[VerifiedPurchaseHeader] = "true";
            }
        }

        await _next(context);
    }

    /// <summary>
    /// (2) Normalised match. Routing in ASP.NET Core ignores a trailing slash and is
    /// case-insensitive, so the guard has to be too or the endpoint is reachable unguarded.
    /// </summary>
    internal static bool TryMatchReviewRoute(string? rawPath, out Guid productId)
    {
        productId = Guid.Empty;
        if (string.IsNullOrEmpty(rawPath)) return false;

        var normalised = rawPath.TrimEnd('/');
        if (normalised.Length == 0) return false;

        var match = ReviewRoute.Match(normalised);
        return match.Success && Guid.TryParse(match.Groups[1].Value, out productId);
    }
}

public static class ReviewValidationMiddlewareExtensions
{
    public static IApplicationBuilder UseReviewValidation(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ReviewValidationMiddleware>();
    }
}
