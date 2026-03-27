namespace Omnichannel.Domain;

using BuildingBlocks.SharedKernel;

public class ChannelConnection : Entity<Guid>
{
    public string PlatformName { get; private set; } // e.g. "Shopee", "Lazada", "TikTok"
    public string ShopId { get; private set; } // External Shop ID
    public string ShopName { get; private set; }
    public string AccessToken { get; private set; }
    public string RefreshToken { get; private set; }
    public DateTime TokenExpiresAt { get; private set; }
    public bool IsActive { get; private set; }
    public bool SyncOrders { get; private set; }
    public bool SyncInventory { get; private set; }
    public bool SyncProducts { get; private set; }

    protected ChannelConnection() { }

    public ChannelConnection(string platformName, string shopId, string shopName, string accessToken, string refreshToken, DateTime tokenExpiresAt)
    {
        Id = Guid.NewGuid();
        PlatformName = platformName;
        ShopId = shopId;
        ShopName = shopName;
        AccessToken = accessToken;
        RefreshToken = refreshToken;
        TokenExpiresAt = tokenExpiresAt;
        IsActive = true;
        SyncOrders = true;
        SyncInventory = true;
        SyncProducts = false; // Default off, requires careful mapping
    }

    public void UpdateTokens(string accessToken, string refreshToken, DateTime expiresAt)
    {
        AccessToken = accessToken;
        RefreshToken = refreshToken;
        TokenExpiresAt = expiresAt;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateSyncSettings(bool syncOrders, bool syncInventory, bool syncProducts)
    {
        SyncOrders = syncOrders;
        SyncInventory = syncInventory;
        SyncProducts = syncProducts;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }
}
