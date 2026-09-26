using Catalog.Domain;

namespace Catalog.Application.Reviews;

/// <summary>Phản hồi của cửa hàng dưới một đánh giá — KHÔNG lộ id nhân viên ra ngoài.</summary>
public sealed record ReviewReplyView(string Text, DateTime? RepliedAt);

/// <summary>Hình dạng đánh giá trả cho storefront (và trang quản trị, kèm thêm vài trường nội bộ).</summary>
public sealed record ReviewView(
    Guid Id,
    Guid ProductId,
    string CustomerId,
    int Rating,
    string? Title,
    string Comment,
    string? Pros,
    string? Cons,
    bool IsVerifiedPurchase,
    bool IsApproved,
    int HelpfulCount,
    IReadOnlyList<ReviewPhoto> Images,
    string? VideoUrl,
    DateTime CreatedAt,
    ReviewReplyView? Reply);

public sealed record AdminReviewView(ReviewView Review, string? ProductName, string? RepliedBy);

public static class ReviewResponseMapper
{
    public static ReviewView ToView(ProductReview r) => new(
        r.Id, r.ProductId, r.CustomerId, r.Rating, r.Title, r.Comment, r.Pros, r.Cons,
        r.IsVerifiedPurchase, r.IsApproved, r.HelpfulCount,
        ReviewPhotoPolicy.Parse(r.ImageUrls), r.VideoUrl, r.CreatedAt,
        r.HasReply ? new ReviewReplyView(r.ReplyText!, r.RepliedAt) : null);
}
