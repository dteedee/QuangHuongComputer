namespace Omnichannel.Domain;

using BuildingBlocks.SharedKernel;

public class ChannelProduct : Entity<Guid>
{
    public Guid InternalProductId { get; private set; }
    public Guid ChannelConnectionId { get; private set; }
    public string ExternalProductId { get; private set; } // ID on Shopee/Lazada
    public string? ExternalVariantId { get; private set; }
    public string ExternalSku { get; private set; }
    public decimal OverridePrice { get; private set; } // If we want different prices on marketplaces
    public bool IsSyncEnabled { get; private set; }
    public DateTime? LastSyncAt { get; private set; }
    public string? LastSyncError { get; private set; }

    protected ChannelProduct() { }

    public ChannelProduct(Guid internalProductId, Guid channelConnectionId, string externalProductId, string externalSku, decimal overridePrice = 0, string? externalVariantId = null)
    {
        Id = Guid.NewGuid();
        InternalProductId = internalProductId;
        ChannelConnectionId = channelConnectionId;
        ExternalProductId = externalProductId;
        ExternalSku = externalSku;
        OverridePrice = overridePrice;
        ExternalVariantId = externalVariantId;
        IsSyncEnabled = true;
    }

    public void MarkSynced()
    {
        LastSyncAt = DateTime.UtcNow;
        LastSyncError = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkSyncFailed(string error)
    {
        LastSyncAt = DateTime.UtcNow;
        LastSyncError = error;
        UpdatedAt = DateTime.UtcNow;
    }
}
