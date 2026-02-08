using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

public class OrderHistory : Entity<Guid>
{
    public Guid OrderId { get; private set; }
    public OrderStatus FromStatus { get; private set; }
    public OrderStatus ToStatus { get; private set; }
    public string? Notes { get; private set; }
    public string? ChangedBy { get; private set; }
    public DateTime ChangedAt { get; private set; }
    
    public OrderHistory(
        Guid orderId,
        OrderStatus fromStatus,
        OrderStatus toStatus,
        string? changedBy = null,
        string? notes = null)
    {
        Id = Guid.NewGuid();
        OrderId = orderId;
        FromStatus = fromStatus;
        ToStatus = toStatus;
        ChangedBy = changedBy;
        Notes = notes;
        ChangedAt = DateTime.UtcNow;
    }

    protected OrderHistory() { }
}
