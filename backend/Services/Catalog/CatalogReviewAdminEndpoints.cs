using BuildingBlocks.Security;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Caching;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Application.Reviews;

namespace Catalog;

/// <summary>Mặt quản trị của đánh giá: duyệt/từ chối (kèm tính lại rating - bước 5), sentiment, hàng chờ.</summary>
public static class CatalogReviewAdminEndpoints
{
    public static void MapCatalogReviewAdminEndpoints(this IEndpointRouteBuilder group)
    {
        var reviewsAdmin = group.MapGroup("/reviews/admin").RequirePermission(Permissions.Catalog.Manage);

        reviewsAdmin.MapPost("/{reviewId:guid}/approve", async (Guid reviewId, CatalogDbContext db, ICacheService cache, HttpContext context, CancellationToken ct) =>
        {
            var review = await db.ProductReviews.FindAsync(new object?[] { reviewId }, ct);
            if (review == null) return Results.NotFound();

            var approverUserId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "Admin";
            review.Approve(approverUserId);
            await db.SaveChangesAsync(ct);

            // Bước 5: rating/review count phải "become real" ngay khi review được duyệt.
            await CatalogProductHelpers.RecalculateReviewStatsAsync(db, review.ProductId, ct);
            // Adversarial-verify fix: recalculation above only updates the DB row - the public
            // GET /products/{id} response is served from cache for up to 30 min otherwise. Confirmed
            // live: without this, the API kept answering the pre-approval averageRating/reviewCount
            // indefinitely even though the DB was already correct.
            await CatalogProductHelpers.InvalidateProductCachesAsync(cache, review.ProductId);

            return Results.Ok(new { message = "Đã duyệt đánh giá thành công" });
        });

        reviewsAdmin.MapGet("/sentiment-analysis", async (CatalogDbContext db) =>
        {
            var totalReviews = await db.ProductReviews.CountAsync();
            if (totalReviews == 0)
                return Results.Ok(new { Positive = 0, Neutral = 0, Negative = 0, TopKeywords = Array.Empty<string>() });

            var positive = await db.ProductReviews.CountAsync(r => r.Rating >= 4);
            var neutral = await db.ProductReviews.CountAsync(r => r.Rating == 3);
            var negative = await db.ProductReviews.CountAsync(r => r.Rating <= 2);

            var reviewTexts = await db.ProductReviews
                .Where(r => r.IsApproved)
                .Select(r => (r.Title ?? string.Empty) + " " + (r.Comment ?? string.Empty))
                .ToListAsync();
            var topKeywords = ReviewKeywordExtractor.ExtractTopKeywords(reviewTexts, take: 6);

            return Results.Ok(new
            {
                PositivePercent = Math.Round((double)positive / totalReviews * 100, 1),
                NeutralPercent = Math.Round((double)neutral / totalReviews * 100, 1),
                NegativePercent = Math.Round((double)negative / totalReviews * 100, 1),
                TotalReviews = totalReviews,
                TopKeywords = topKeywords
            });
        });

        reviewsAdmin.MapGet("/pending", async (CatalogDbContext db) =>
        {
            var pendingReviews = await db.ProductReviews
                .AsNoTracking()
                .Where(r => !r.IsApproved)
                .Join(db.Products.IgnoreQueryFilters(),
                    review => review.ProductId, product => product.Id,
                    (review, product) => new
                    {
                        review.Id, review.ProductId, ProductName = product.Name, review.CustomerId,
                        review.Rating, review.Title, review.Comment, review.IsVerifiedPurchase, review.CreatedAt
                    })
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Results.Ok(pendingReviews);
        });

        reviewsAdmin.MapDelete("/{reviewId:guid}", async (Guid reviewId, CatalogDbContext db, ICacheService cache, HttpContext context, CancellationToken ct) =>
        {
            var review = await db.ProductReviews.FindAsync(new object?[] { reviewId }, ct);
            if (review == null) return Results.NotFound(new { message = "Không tìm thấy đánh giá" });

            var productId = review.ProductId;
            var wasApproved = review.IsApproved;
            db.ProductReviews.Remove(review);
            await db.SaveChangesAsync(ct);

            // Bước 5: xoá/từ chối 1 review ĐÃ DUYỆT cũng phải kéo rating về đúng - trước đây chỉ
            // approve mới ảnh hưởng số liệu, review đã duyệt rồi bị gỡ thì rating cũ vẫn đứng yên.
            if (wasApproved)
            {
                await CatalogProductHelpers.RecalculateReviewStatsAsync(db, productId, ct);
                // Adversarial-verify fix: same stale-cache gap as approve above.
                await CatalogProductHelpers.InvalidateProductCachesAsync(cache, productId);
            }

            await context.LogAuditAsync("Delete", "ProductReview", reviewId.ToString(), "Rejected review");
            return Results.Ok(new { message = "Đã từ chối đánh giá thành công" });
        });
    }
}
