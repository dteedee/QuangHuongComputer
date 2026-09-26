namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

public class ProductReview : Entity<Guid>
{
    public const int MaxReplyLength = 2000;
    public const int MaxProsConsLength = 500;

    public Guid ProductId { get; private set; }
    public string CustomerId { get; private set; } = string.Empty;
    public int Rating { get; private set; } // 1-5
    public string? Title { get; private set; }
    public string Comment { get; private set; } = string.Empty;
    public bool IsVerifiedPurchase { get; private set; }
    public bool IsApproved { get; private set; }
    public int HelpfulCount { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public string? ApprovedBy { get; private set; }

    /// <summary>
    /// JSON ảnh khách gửi kèm — CHỈ ảnh đã qua <c>POST /api/catalog/reviews/photos</c> (magic bytes +
    /// mã hoá lại WebP) và nằm trong kho media của cửa hàng. Xem <see cref="ReviewPhotoPolicy"/>.
    /// </summary>
    public string? ImageUrls { get; private set; }
    public string? VideoUrl { get; private set; } // Single video URL

    /// <summary>Ưu điểm / nhược điểm (tuỳ chọn) khách tự ghi.</summary>
    public string? Pros { get; private set; }
    public string? Cons { get; private set; }

    /// <summary>"Phản hồi từ Quang Hưởng" — chỉ nhân viên có quyền Catalog.Manage ghi được.</summary>
    public string? ReplyText { get; private set; }
    /// <summary>Id nhân viên phản hồi — nội bộ, KHÔNG trả ra API công khai.</summary>
    public string? RepliedBy { get; private set; }
    public DateTime? RepliedAt { get; private set; }

    public bool HasReply => !string.IsNullOrWhiteSpace(ReplyText);

    public ProductReview(
        Guid productId,
        string customerId,
        int rating,
        string comment,
        string? title = null,
        bool isVerifiedPurchase = false,
        string? imageUrls = null,
        string? videoUrl = null,
        string? pros = null,
        string? cons = null)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        CustomerId = customerId;
        Rating = rating;
        Comment = comment;
        Title = title;
        IsVerifiedPurchase = isVerifiedPurchase;
        IsApproved = false; // Requires moderation
        HelpfulCount = 0;
        ImageUrls = imageUrls;
        VideoUrl = videoUrl;
        Pros = Normalize(pros, MaxProsConsLength, nameof(pros));
        Cons = Normalize(cons, MaxProsConsLength, nameof(cons));
    }

    protected ProductReview() { }

    public void Approve(string approvedBy)
    {
        IsApproved = true;
        ApprovedAt = DateTime.UtcNow;
        ApprovedBy = approvedBy;
    }

    public void MarkHelpful()
    {
        HelpfulCount++;
    }

    public void UpdateReview(string? title, string comment, int rating)
    {
        if (!string.IsNullOrWhiteSpace(title)) Title = title;
        Comment = comment;
        Rating = rating;
    }

    /// <summary>Tạo phản hồi lần đầu. Đã có phản hồi thì phải dùng <see cref="EditReply"/>.</summary>
    public void Reply(string text, string staffId, DateTime utcNow)
    {
        if (HasReply) throw new InvalidOperationException("Đánh giá này đã có phản hồi, hãy sửa phản hồi hiện có.");
        SetReply(text, staffId, utcNow);
    }

    public void EditReply(string text, string staffId, DateTime utcNow)
    {
        if (!HasReply) throw new InvalidOperationException("Đánh giá này chưa có phản hồi để sửa.");
        SetReply(text, staffId, utcNow);
    }

    public void DeleteReply()
    {
        if (!HasReply) throw new InvalidOperationException("Đánh giá này chưa có phản hồi để xoá.");
        ReplyText = null;
        RepliedBy = null;
        RepliedAt = null;
        UpdatedAt = DateTime.UtcNow;
    }

    private void SetReply(string text, string staffId, DateTime utcNow)
    {
        if (string.IsNullOrWhiteSpace(staffId)) throw new ArgumentException("Thiếu người phản hồi", nameof(staffId));
        ReplyText = Normalize(text, MaxReplyLength, nameof(text))
            ?? throw new ArgumentException("Nội dung phản hồi là bắt buộc", nameof(text));
        RepliedBy = staffId;
        RepliedAt = utcNow;
        UpdatedAt = utcNow;
    }

    private static string? Normalize(string? value, int max, string field)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        if (trimmed.Length > max) throw new ArgumentException($"Tối đa {max} ký tự", field);
        return trimmed;
    }
}
