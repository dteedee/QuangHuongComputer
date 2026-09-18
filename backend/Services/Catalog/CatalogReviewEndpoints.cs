using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Domain;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Validation;
using Catalog.Application.Reviews;

namespace Catalog;

/// <summary>
/// Endpoint đánh giá sản phẩm. Tách khỏi `CatalogEndpoints.cs`; hành vi giữ nguyên
/// (W0-5 chỉ sửa tìm kiếm / taxonomy / partial update, không đụng nghiệp vụ review).
/// Xác minh "đã mua hàng" vẫn do ApiGateway làm (header X-Verified-Purchase).
/// </summary>
public static class CatalogReviewEndpoints
{
    public static void MapCatalogReviewEndpoints(this IEndpointRouteBuilder group)
    {
        // Get reviews for a product
        group.MapGet("/products/{productId:guid}/reviews", async (Guid productId, CatalogDbContext db, bool? approvedOnly = true) =>
        {
            var query = db.ProductReviews
                .AsNoTracking()
                .Where(r => r.ProductId == productId);

            if (approvedOnly == true)
                query = query.Where(r => r.IsApproved);

            var reviews = await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.ProductId,
                    r.CustomerId,
                    r.Rating,
                    r.Title,
                    r.Comment,
                    r.IsVerifiedPurchase,
                    r.IsApproved,
                    r.HelpfulCount,
                    r.ImageUrls,
                    r.VideoUrl,
                    r.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(reviews);
        });

        // Create a new review (Requires authentication)
        group.MapPost("/products/{productId:guid}/reviews", async (
            Guid productId,
            CreateProductReviewDto dto,
            CatalogDbContext db,
            HttpContext context) =>
        {
            var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // Rating/Comment đã được validate bởi FluentValidation (WithValidation<CreateProductReviewDto>).
            var productExists = await db.Products.AnyAsync(p => p.Id == productId);
            if (!productExists)
                return Results.NotFound(new { message = "Sản phẩm không tồn tại" });

            var existingReview = await db.ProductReviews
                .FirstOrDefaultAsync(r => r.ProductId == productId && r.CustomerId == userId);

            if (existingReview != null)
                return Results.BadRequest(new { message = "Bạn đã đánh giá sản phẩm này rồi" });

            // Verified purchase status set by ApiGateway middleware.
            var isVerifiedPurchase = context.Request.Headers["X-Verified-Purchase"].FirstOrDefault() == "true";

            var review = new ProductReview(
                productId: productId,
                customerId: userId,
                rating: dto.Rating,
                comment: dto.Comment,
                title: dto.Title,
                isVerifiedPurchase: isVerifiedPurchase,
                imageUrls: dto.ImageUrls,
                videoUrl: dto.VideoUrl
            );

            db.ProductReviews.Add(review);
            await db.SaveChangesAsync();

            return Results.Created($"/api/catalog/products/{productId}/reviews/{review.Id}", new
            {
                review.Id,
                isVerifiedPurchase,
                message = "Đánh giá của bạn đang chờ duyệt"
            });
        }).RequireAuthorization().WithValidation<CreateProductReviewDto>();

        // Mark review as helpful (Public endpoint)
        group.MapPost("/reviews/{reviewId:guid}/helpful", async (Guid reviewId, CatalogDbContext db) =>
        {
            var review = await db.ProductReviews.FindAsync(reviewId);
            if (review == null)
                return Results.NotFound(new { message = "Đánh giá không tồn tại" });

            review.MarkHelpful();
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã đánh dấu đánh giá là hữu ích", helpfulCount = review.HelpfulCount });
        });

        // Rating statistics for a product
        group.MapGet("/products/{productId:guid}/reviews/stats", async (Guid productId, CatalogDbContext db) =>
        {
            var ratings = await db.ProductReviews
                .AsNoTracking()
                .Where(r => r.ProductId == productId && r.IsApproved)
                .Select(r => r.Rating)
                .ToListAsync();

            var totalReviews = ratings.Count;
            var averageRating = totalReviews > 0 ? ratings.Average() : 0;

            var ratingCounts = Enumerable.Range(1, 5)
                .ToDictionary(star => star, star => ratings.Count(r => r == star));

            return Results.Ok(new
            {
                totalReviews,
                averageRating = Math.Round(averageRating, 1),
                ratingCounts
            });
        });

        MapReviewAdmin(group);
    }

    private static void MapReviewAdmin(IEndpointRouteBuilder group)
    {
        var reviewsAdmin = group.MapGroup("/reviews/admin")
            .RequireAuthorization(policy => policy.RequireRole("Admin"));

        reviewsAdmin.MapPost("/{reviewId:guid}/approve", async (Guid reviewId, CatalogDbContext db, HttpContext context) =>
        {
            var review = await db.ProductReviews.FindAsync(reviewId);
            if (review == null) return Results.NotFound();

            var approverUserId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "Admin";
            review.Approve(approverUserId);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã duyệt đánh giá thành công" });
        });

        reviewsAdmin.MapGet("/sentiment-analysis", async (CatalogDbContext db) =>
        {
            var totalReviews = await db.ProductReviews.CountAsync();
            if (totalReviews == 0)
                return Results.Ok(new { Positive = 0, Neutral = 0, Negative = 0, TopKeywords = Array.Empty<string>() });

            // Sentiment tính từ Rating thật (>=4 tích cực, ==3 trung lập, <=2 tiêu cực)
            var positive = await db.ProductReviews.CountAsync(r => r.Rating >= 4);
            var neutral = await db.ProductReviews.CountAsync(r => r.Rating == 3);
            var negative = await db.ProductReviews.CountAsync(r => r.Rating <= 2);

            // Từ khoá nổi bật: tần suất từ thật trong Title/Comment của review đã duyệt
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
                    review => review.ProductId,
                    product => product.Id,
                    (review, product) => new
                    {
                        review.Id,
                        review.ProductId,
                        ProductName = product.Name,
                        review.CustomerId,
                        review.Rating,
                        review.Title,
                        review.Comment,
                        review.IsVerifiedPurchase,
                        review.CreatedAt
                    })
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Results.Ok(pendingReviews);
        });

        reviewsAdmin.MapDelete("/{reviewId:guid}", async (Guid reviewId, CatalogDbContext db, HttpContext context) =>
        {
            var review = await db.ProductReviews.FindAsync(reviewId);
            if (review == null)
                return Results.NotFound(new { message = "Không tìm thấy đánh giá" });

            db.ProductReviews.Remove(review);
            await db.SaveChangesAsync();

            await context.LogAuditAsync("Delete", "ProductReview", reviewId.ToString(), "Rejected review");

            return Results.Ok(new { message = "Đã từ chối đánh giá thành công" });
        });
    }
}
