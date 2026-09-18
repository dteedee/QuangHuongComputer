using BuildingBlocks.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Domain;
using BuildingBlocks.Validation;

namespace Catalog;

/// <summary>
/// Mặt CÔNG KHAI của đánh giá sản phẩm: xem, tạo, "hữu ích", thống kê sao.
/// Mặt admin (duyệt/từ chối/sentiment) -> `CatalogReviewAdminEndpoints.cs` (giữ file dưới 200 dòng).
/// </summary>
public static class CatalogReviewEndpoints
{
    public static void MapCatalogReviewEndpoints(this IEndpointRouteBuilder group)
    {
        // Todo "hide unapproved reviews": approvedOnly=false chỉ có hiệu lực với staff - khách
        // vãng lai gửi cờ này bị bỏ qua im lặng (không lộ có bao nhiêu review đang chờ duyệt).
        group.MapGet("/products/{productId:guid}/reviews", async (Guid productId, CatalogDbContext db, HttpContext http, bool? approvedOnly = true) =>
        {
            // Chỉ staff mới được yêu cầu approvedOnly=false; khách vãng lai luôn chỉ thấy đã duyệt.
            var showUnapproved = approvedOnly == false && http.IsStaff();

            var query = db.ProductReviews.AsNoTracking().Where(r => r.ProductId == productId);
            if (!showUnapproved) query = query.Where(r => r.IsApproved);

            var reviews = await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id, r.ProductId, r.CustomerId, r.Rating, r.Title, r.Comment,
                    r.IsVerifiedPurchase, r.IsApproved, r.HelpfulCount, r.ImageUrls, r.VideoUrl, r.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(reviews);
        });

        group.MapPost("/products/{productId:guid}/reviews", async (
            Guid productId, CreateProductReviewDto dto, CatalogDbContext db, HttpContext context) =>
        {
            var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var productExists = await db.Products.AnyAsync(p => p.Id == productId);
            if (!productExists) return Results.NotFound(new { message = "Sản phẩm không tồn tại" });

            var existingReview = await db.ProductReviews
                .FirstOrDefaultAsync(r => r.ProductId == productId && r.CustomerId == userId);
            if (existingReview != null) return Results.BadRequest(new { message = "Bạn đã đánh giá sản phẩm này rồi" });

            var isVerifiedPurchase = context.Request.Headers["X-Verified-Purchase"].FirstOrDefault() == "true";
            var review = new ProductReview(productId, userId, dto.Rating, dto.Comment, dto.Title,
                isVerifiedPurchase, dto.ImageUrls, dto.VideoUrl);

            db.ProductReviews.Add(review);
            await db.SaveChangesAsync();

            return Results.Created($"/api/catalog/products/{productId}/reviews/{review.Id}", new
            {
                review.Id, isVerifiedPurchase, message = "Đánh giá của bạn đang chờ duyệt"
            });
        }).RequireAuthorization(SecurityPolicies.Authenticated).WithValidation<CreateProductReviewDto>();

        // Todo "one vote per user": yêu cầu đăng nhập + chặn vote lần 2 (unique index là chốt cuối).
        group.MapPost("/reviews/{reviewId:guid}/helpful", async (Guid reviewId, CatalogDbContext db, HttpContext context) =>
        {
            var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var review = await db.ProductReviews.FindAsync(reviewId);
            if (review == null) return Results.NotFound(new { message = "Đánh giá không tồn tại" });

            var alreadyVoted = await db.ProductReviewHelpfulVotes.AnyAsync(v => v.ReviewId == reviewId && v.UserId == userId);
            if (alreadyVoted)
                return Results.Conflict(new { message = "Bạn đã đánh dấu đánh giá này là hữu ích rồi", helpfulCount = review.HelpfulCount });

            db.ProductReviewHelpfulVotes.Add(new ProductReviewHelpfulVote(reviewId, userId));
            review.MarkHelpful();
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã đánh dấu đánh giá là hữu ích", helpfulCount = review.HelpfulCount });
        }).RequireAuthorization(SecurityPolicies.Authenticated);

        group.MapGet("/products/{productId:guid}/reviews/stats", async (Guid productId, CatalogDbContext db) =>
        {
            var ratings = await db.ProductReviews.AsNoTracking()
                .Where(r => r.ProductId == productId && r.IsApproved)
                .Select(r => r.Rating)
                .ToListAsync();

            var totalReviews = ratings.Count;
            var averageRating = totalReviews > 0 ? ratings.Average() : 0;
            var ratingCounts = Enumerable.Range(1, 5).ToDictionary(star => star, star => ratings.Count(r => r == star));

            return Results.Ok(new { totalReviews, averageRating = Math.Round(averageRating, 1), ratingCounts });
        });

        group.MapCatalogReviewAdminEndpoints();
    }
}
