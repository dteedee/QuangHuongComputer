namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

/// <summary>
/// Một lượt "hữu ích" của một user cho một đánh giá - unique (ReviewId, UserId) chặn spam-click.
/// `ProductReview.HelpfulCount` vẫn là bộ đếm chính thức (ghi khi tạo dòng này lần đầu);
/// bảng này chỉ tồn tại để biết user đã vote chưa.
/// </summary>
public class ProductReviewHelpfulVote : Entity<Guid>
{
    public Guid ReviewId { get; private set; }
    public string UserId { get; private set; } = string.Empty;

    protected ProductReviewHelpfulVote() { }

    public ProductReviewHelpfulVote(Guid reviewId, string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId không được rỗng", nameof(userId));
        Id = Guid.NewGuid();
        ReviewId = reviewId;
        UserId = userId;
    }
}
