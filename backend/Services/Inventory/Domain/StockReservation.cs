using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Stock Reservation - Holds inventory for pending orders
/// Prevents overselling while order is being processed
/// </summary>
public class StockReservation : Entity<Guid>
{
    public Guid InventoryItemId { get; private set; }
    public Guid ProductId { get; private set; }
    public int Quantity { get; private set; }
    public string ReferenceId { get; private set; } = string.Empty; // OrderId
    public string ReferenceType { get; private set; } = string.Empty; // "Order", "WorkOrder"
    public ReservationStatus Status { get; private set; }
    public DateTime ReservedAt { get; private set; }
    public DateTime? ReleasedAt { get; private set; }
    public DateTime? FulfilledAt { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public string? Notes { get; private set; }

    protected StockReservation() { }

    public StockReservation(
        Guid inventoryItemId,
        Guid productId,
        int quantity,
        string referenceId,
        string referenceType,
        int expirationHours = 24,
        string? notes = null)
    {
        Id = Guid.NewGuid();
        InventoryItemId = inventoryItemId;
        ProductId = productId;
        Quantity = quantity;
        ReferenceId = referenceId;
        ReferenceType = referenceType;
        Status = ReservationStatus.Active;
        ReservedAt = DateTime.UtcNow;
        ExpiresAt = DateTime.UtcNow.AddHours(expirationHours);
        Notes = notes;
        CreatedAt = DateTime.UtcNow;
    }

    public void Release(string reason)
    {
        if (Status != ReservationStatus.Active)
            throw new InvalidOperationException($"Cannot release reservation in status {Status}");

        Status = ReservationStatus.Released;
        ReleasedAt = DateTime.UtcNow;
        Notes = $"{Notes} | Released: {reason}";
        UpdatedAt = DateTime.UtcNow;
    }

    public void Fulfill()
    {
        if (Status != ReservationStatus.Active)
            throw new InvalidOperationException($"Cannot fulfill reservation in status {Status}");

        Status = ReservationStatus.Fulfilled;
        FulfilledAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Expire()
    {
        if (Status != ReservationStatus.Active)
            return;

        Status = ReservationStatus.Expired;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsExpired() => DateTime.UtcNow > ExpiresAt && Status == ReservationStatus.Active;
}

public enum ReservationStatus
{
    Active,     // Currently holding stock
    Fulfilled,  // Stock shipped/issued
    Released,   // Manually released (order cancelled)
    Expired     // Reservation expired (auto-release)
}
