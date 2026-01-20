using BuildingBlocks.SharedKernel;

namespace Accounting.Domain;

/// <summary>
/// Represents a cashier shift session for tracking cash handling and daily operations.
/// Only one shift can be open per cashier/warehouse/day.
/// </summary>
public class ShiftSession : AggregateRoot<Guid>
{
    public Guid CashierId { get; private set; }
    public Guid WarehouseId { get; private set; }
    public DateTime OpenedAt { get; private set; }
    public DateTime? ClosedAt { get; private set; }
    public decimal OpeningBalance { get; private set; }
    public decimal? ClosingBalance { get; private set; }
    public ShiftStatus Status { get; private set; }

    // Calculated fields
    public decimal? CashVariance => ClosingBalance.HasValue
        ? ClosingBalance.Value - OpeningBalance
        : null;

    public TimeSpan? Duration => ClosedAt.HasValue
        ? ClosedAt.Value - OpenedAt
        : null;

    private readonly List<ShiftTransaction> _transactions = new();
    public IReadOnlyCollection<ShiftTransaction> Transactions => _transactions.AsReadOnly();

    protected ShiftSession() { }

    /// <summary>
    /// Opens a new shift session. Validation for uniqueness should be done at application layer.
    /// </summary>
    public static ShiftSession Open(
        Guid cashierId,
        Guid warehouseId,
        decimal openingBalance)
    {
        if (openingBalance < 0)
            throw new ArgumentException("Opening balance cannot be negative", nameof(openingBalance));

        var shift = new ShiftSession
        {
            Id = Guid.NewGuid(),
            CashierId = cashierId,
            WarehouseId = warehouseId,
            OpenedAt = DateTime.UtcNow,
            OpeningBalance = openingBalance,
            Status = ShiftStatus.Open
        };

        shift.RaiseDomainEvent(new ShiftOpenedEvent(shift.Id, cashierId, warehouseId, openingBalance));
        return shift;
    }

    /// <summary>
    /// Closes the shift with actual cash counted.
    /// </summary>
    public void Close(decimal actualCash)
    {
        if (Status != ShiftStatus.Open)
            throw new InvalidOperationException("Only open shifts can be closed");

        if (actualCash < 0)
            throw new ArgumentException("Actual cash cannot be negative", nameof(actualCash));

        Status = ShiftStatus.Closed;
        ClosedAt = DateTime.UtcNow;
        ClosingBalance = actualCash;

        var variance = CashVariance ?? 0;
        RaiseDomainEvent(new ShiftClosedEvent(
            Id,
            CashierId,
            WarehouseId,
            OpeningBalance,
            ClosingBalance.Value,
            variance,
            Duration!.Value));
    }

    /// <summary>
    /// Records a cash transaction during the shift.
    /// </summary>
    public void RecordTransaction(
        string description,
        decimal amount,
        TransactionType type,
        string? reference = null)
    {
        if (Status != ShiftStatus.Open)
            throw new InvalidOperationException("Cannot record transactions on a closed shift");

        var transaction = new ShiftTransaction(description, amount, type, reference);
        _transactions.Add(transaction);
    }

    /// <summary>
    /// Validates if this shift conflicts with another shift (same day, cashier, warehouse).
    /// </summary>
    public bool ConflictsWith(ShiftSession other)
    {
        if (Id == other.Id) return false;

        return CashierId == other.CashierId
            && WarehouseId == other.WarehouseId
            && OpenedAt.Date == other.OpenedAt.Date;
    }
}

/// <summary>
/// Represents a cash transaction during a shift.
/// </summary>
public class ShiftTransaction
{
    public Guid Id { get; private set; }
    public string Description { get; private set; }
    public decimal Amount { get; private set; }
    public TransactionType Type { get; private set; }
    public DateTime Timestamp { get; private set; }
    public string? Reference { get; private set; }

    public ShiftTransaction(string description, decimal amount, TransactionType type, string? reference = null)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Description cannot be empty", nameof(description));

        if (amount <= 0)
            throw new ArgumentException("Amount must be positive", nameof(amount));

        Id = Guid.NewGuid();
        Description = description;
        Amount = amount;
        Type = type;
        Timestamp = DateTime.UtcNow;
        Reference = reference;
    }

    protected ShiftTransaction() { }
}

public enum ShiftStatus
{
    Open,
    Closed
}

// Domain Events
public record ShiftOpenedEvent(
    Guid ShiftId,
    Guid CashierId,
    Guid WarehouseId,
    decimal OpeningBalance) : DomainEvent;

public record ShiftClosedEvent(
    Guid ShiftId,
    Guid CashierId,
    Guid WarehouseId,
    decimal OpeningBalance,
    decimal ClosingBalance,
    decimal Variance,
    TimeSpan Duration) : DomainEvent;
