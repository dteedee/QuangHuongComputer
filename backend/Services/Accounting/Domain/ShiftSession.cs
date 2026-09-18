using BuildingBlocks.SharedKernel;

namespace Accounting.Domain;

/// <summary>
/// Ca thu ngân. Mỗi thu ngân chỉ có MỘT ca mở tại một cửa hàng ở một thời điểm.
///
/// W2-14: bản cũ tính <c>CashVariance = ClosingBalance - OpeningBalance</c> — tức là bỏ qua
/// toàn bộ giao dịch trong ca, nên một ca bán được 3 triệu tiền mặt luôn bị báo "thừa quỹ 3 triệu".
/// Nay: <c>ExpectedCash = OpeningBalance + Σthu - Σchi</c> và <c>Variance = ActualCash - ExpectedCash</c>,
/// cả hai đều được LƯU tại thời điểm chốt ca kèm lý do và người duyệt.
/// </summary>
public class ShiftSession : AggregateRoot<Guid>
{
    public Guid CashierId { get; private set; }
    public Guid WarehouseId { get; private set; }
    public DateTime OpenedAt { get; private set; }
    public DateTime? ClosedAt { get; private set; }
    public decimal OpeningBalance { get; private set; }

    /// <summary>Tiền mặt đếm thực tế khi chốt ca.</summary>
    public decimal? ClosingBalance { get; private set; }

    /// <summary>Tiền mặt LẼ RA phải có trong két, chốt lại tại thời điểm đóng ca.</summary>
    public decimal? ExpectedCash { get; private set; }

    /// <summary>Chênh lệch = thực tế − lẽ ra. Âm là thiếu quỹ.</summary>
    public decimal? Variance { get; private set; }

    public string? VarianceReason { get; private set; }

    /// <summary>Người duyệt chênh lệch — BẮT BUỘC là người khác thu ngân (kiểm soát hai người).</summary>
    public Guid? VarianceApprovedBy { get; private set; }
    public DateTime? VarianceApprovedAt { get; private set; }

    public ShiftStatus Status { get; private set; }

    public TimeSpan? Duration => ClosedAt.HasValue ? ClosedAt.Value - OpenedAt : null;

    /// <summary>CŨ — giữ tên cho code đọc báo cáo; bằng <see cref="Variance"/>.</summary>
    public decimal? CashVariance => Variance;

    private readonly List<ShiftTransaction> _transactions = new();
    public IReadOnlyCollection<ShiftTransaction> Transactions => _transactions.AsReadOnly();

    /// <summary>Tổng tiền mặt THU trong ca.</summary>
    public decimal CashIn => _transactions.Where(t => t.Type == TransactionType.Credit).Sum(t => t.Amount);

    /// <summary>Tổng tiền mặt CHI trong ca.</summary>
    public decimal CashOut => _transactions.Where(t => t.Type == TransactionType.Debit).Sum(t => t.Amount);

    /// <summary>Số tiền lẽ ra phải có trong két NGAY BÂY GIỜ (ca đang mở).</summary>
    public decimal CurrentExpectedCash => OpeningBalance + CashIn - CashOut;

    protected ShiftSession() { }

    public static ShiftSession Open(Guid cashierId, Guid warehouseId, decimal openingBalance, DateTime openedAt)
    {
        if (openingBalance < 0)
            throw new ArgumentException("Số dư đầu ca không được âm.", nameof(openingBalance));

        var shift = new ShiftSession
        {
            Id = Guid.NewGuid(),
            CashierId = cashierId,
            WarehouseId = warehouseId,
            OpenedAt = openedAt,
            OpeningBalance = openingBalance,
            Status = ShiftStatus.Open
        };

        shift.RaiseDomainEvent(new ShiftOpenedEvent(shift.Id, cashierId, warehouseId, openingBalance));
        return shift;
    }

    public void Close(decimal actualCash, DateTime closedAt, string? varianceReason = null)
    {
        if (Status != ShiftStatus.Open)
            throw new InvalidOperationException("Chỉ ca đang mở mới chốt được.");
        if (actualCash < 0)
            throw new ArgumentException("Tiền mặt đếm được không được âm.", nameof(actualCash));

        var expected = CurrentExpectedCash;
        var variance = actualCash - expected;

        if (variance != 0 && string.IsNullOrWhiteSpace(varianceReason))
            throw new InvalidOperationException("Ca có chênh lệch quỹ thì bắt buộc phải ghi lý do.");

        Status = ShiftStatus.Closed;
        ClosedAt = closedAt;
        ClosingBalance = actualCash;
        ExpectedCash = expected;
        Variance = variance;
        VarianceReason = varianceReason;

        RaiseDomainEvent(new ShiftClosedEvent(
            Id, CashierId, WarehouseId, OpeningBalance, actualCash, expected, variance, Duration!.Value));
    }

    /// <summary>Duyệt chênh lệch quỹ. Người duyệt phải khác thu ngân của ca.</summary>
    public void ApproveVariance(Guid approverId, DateTime at)
    {
        if (Status != ShiftStatus.Closed)
            throw new InvalidOperationException("Chỉ duyệt được chênh lệch của ca đã chốt.");
        if (approverId == CashierId)
            throw new InvalidOperationException("Thu ngân không được tự duyệt chênh lệch quỹ của chính mình.");

        VarianceApprovedBy = approverId;
        VarianceApprovedAt = at;
    }

    public ShiftTransaction RecordTransaction(
        string description,
        decimal amount,
        TransactionType type,
        DateTime at,
        ShiftTransactionSource source = ShiftTransactionSource.Manual,
        string? reference = null)
    {
        if (Status != ShiftStatus.Open)
            throw new InvalidOperationException("Không ghi được giao dịch vào ca đã chốt.");

        var transaction = new ShiftTransaction(description, amount, type, at, source, reference);
        _transactions.Add(transaction);
        return transaction;
    }

    /// <summary>Đã ghi giao dịch mang tham chiếu này chưa (chống trùng khi sự kiện POS phát lại).</summary>
    public bool HasTransactionWithReference(string reference)
        => _transactions.Any(t => t.Reference == reference);
}

/// <summary>Một khoản tiền mặt vào/ra trong ca.</summary>
public class ShiftTransaction
{
    public Guid Id { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public TransactionType Type { get; private set; }
    public DateTime Timestamp { get; private set; }

    /// <summary>Nguồn phát sinh: ghi tay, bán hàng POS, hoàn tiền POS, nộp quỹ...</summary>
    public ShiftTransactionSource Source { get; private set; }

    public string? Reference { get; private set; }

    public ShiftTransaction(
        string description,
        decimal amount,
        TransactionType type,
        DateTime at,
        ShiftTransactionSource source = ShiftTransactionSource.Manual,
        string? reference = null)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Nội dung giao dịch không được để trống.", nameof(description));
        if (amount <= 0)
            throw new ArgumentException("Số tiền phải lớn hơn 0.", nameof(amount));

        Id = Guid.NewGuid();
        Description = description;
        Amount = amount;
        Type = type;
        Timestamp = at;
        Source = source;
        Reference = reference;
    }

    protected ShiftTransaction() { }
}

public enum ShiftStatus { Open, Closed }

public enum ShiftTransactionSource
{
    Manual,
    PosSale,
    PosRefund,
    Deposit,
    CashDrop,
    ExpensePayout
}

public record ShiftOpenedEvent(Guid ShiftId, Guid CashierId, Guid WarehouseId, decimal OpeningBalance) : DomainEvent;

public record ShiftClosedEvent(
    Guid ShiftId,
    Guid CashierId,
    Guid WarehouseId,
    decimal OpeningBalance,
    decimal ClosingBalance,
    decimal ExpectedCash,
    decimal Variance,
    TimeSpan Duration) : DomainEvent;
