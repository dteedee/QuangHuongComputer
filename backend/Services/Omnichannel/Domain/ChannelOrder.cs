namespace Omnichannel.Domain;

using BuildingBlocks.SharedKernel;

public class ChannelOrder : Entity<Guid>
{
    public Guid InternalOrderId { get; private set; } // Nullable initially until synced
    public Guid ChannelConnectionId { get; private set; }
    public string ExternalOrderId { get; private set; }
    public string ExternalOrderStatus { get; private set; }
    public string RawOrderDataJson { get; private set; } // Full snapshot for audit/replay
    public bool IsSyncedToSales { get; private set; }
    public DateTime? SyncedAt { get; private set; }
    public string? SyncError { get; private set; }

    protected ChannelOrder() { }

    public ChannelOrder(Guid channelConnectionId, string externalOrderId, string externalOrderStatus, string rawOrderDataJson, Guid? internalOrderId = null)
    {
        Id = Guid.NewGuid();
        ChannelConnectionId = channelConnectionId;
        ExternalOrderId = externalOrderId;
        ExternalOrderStatus = externalOrderStatus;
        RawOrderDataJson = rawOrderDataJson;
        
        if (internalOrderId.HasValue)
        {
            SetInternalOrder(internalOrderId.Value);
        }
    }

    public void SetInternalOrder(Guid internalOrderId)
    {
        InternalOrderId = internalOrderId;
        IsSyncedToSales = true;
        SyncedAt = DateTime.UtcNow;
        SyncError = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkSyncFailed(string error)
    {
        IsSyncedToSales = false;
        SyncError = error;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateExternalStatus(string newStatus)
    {
        ExternalOrderStatus = newStatus;
        UpdatedAt = DateTime.UtcNow;
    }
}
