namespace BuildingBlocks.SharedKernel;

/// <summary>
/// Base entity with audit fields and domain events support
/// </summary>
public abstract class Entity<TId> : IHasDomainEvents
{
    private readonly List<IDomainEvent> _domainEvents = new();
    
    public TId Id { get; protected set; } = default!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    protected void RaiseDomainEvent(IDomainEvent domainEvent)
    {
        _domainEvents.Add(domainEvent);
    }

    public void ClearDomainEvents()
    {
        _domainEvents.Clear();
    }
}

/// <summary>
/// Base aggregate root - entry point for aggregate
/// </summary>
public abstract class AggregateRoot<TId> : Entity<TId>
{
    public int Version { get; protected set; }
}
