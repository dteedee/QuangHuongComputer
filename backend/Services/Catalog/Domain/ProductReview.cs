namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

public class ProductReview : Entity<Guid>
{
    public Guid ProductId { get; private set; }
    public string CustomerId { get; private set; }
    public int Rating { get; private set; } // 1-5
    public string? Title { get; private set; }
    public string Comment { get; private set; }
    public bool IsVerifiedPurchase { get; private set; }
    public bool IsApproved { get; private set; }
    public int HelpfulCount { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public string? ApprovedBy { get; private set; }
    
    public ProductReview(
        Guid productId,
        string customerId,
        int rating,
        string comment,
        string? title = null,
        bool isVerifiedPurchase = false)
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
}
