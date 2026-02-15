using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

public class WishlistItem : Entity<Guid>
{
    public string UserId { get; private set; } = string.Empty;
    public Guid ProductId { get; private set; }
    public DateTime AddedAt { get; private set; }

    protected WishlistItem() { }

    public WishlistItem(string userId, Guid productId)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        ProductId = productId;
        AddedAt = DateTime.UtcNow;
        CreatedAt = DateTime.UtcNow;
    }
}
