using BuildingBlocks.SharedKernel;

namespace Payments.Domain;

/// <summary>
/// Một lần "định thu tiền" cho một đơn hàng. Enum + domain event nằm ở <see cref="PaymentEnums"/>.
///
/// Luật tiền (W0-10 + D04 mục 4, KHÔNG thương lượng):
///  - <see cref="Amount"/> LUÔN lấy từ đơn hàng ở server, không bao giờ từ client;
///  - <see cref="PaymentStatus.Succeeded"/> là trạng thái cuối — chỉ đi tiếp sang hoàn tiền;
///  - hoàn tiền cộng dồn vào <see cref="AmountRefunded"/> và không vượt quá <see cref="Amount"/>.
/// </summary>
public class PaymentIntent : AggregateRoot<Guid>
{
    public Guid OrderId { get; private set; }
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = "VND";
    public PaymentProvider Provider { get; private set; }
    public PaymentStatus Status { get; private set; }
    public string? ExternalId { get; private set; }
    public string? ClientSecret { get; private set; }
    public string? FailureReason { get; private set; }

    /// <summary>Khoá chống thu hai lần cho cùng một (đơn, cổng).</summary>
    public string IdempotencyKey { get; private set; } = string.Empty;

    /// <summary>
    /// D04 mục 2 tầng 0b — nội dung chuyển khoản bắt buộc: `QH` + 8 ký tự A-Z0-9 duy nhất/intent.
    /// Là thứ DUY NHẤT (cùng số tiền) cho phép khớp tự động một khoản tiền vào.
    /// </summary>
    public string? PaymentCode { get; private set; }

    /// <summary>D04 mục 4 — hết hạn giữ đơn chờ chuyển khoản (`Payment:BankTransfer:HoldHours`).</summary>
    public DateTime? ExpiresAt { get; private set; }

    /// <summary>Tổng đã hoàn cho khách.</summary>
    public decimal AmountRefunded { get; private set; }

    /// <summary>Mã tham chiếu ngân hàng khi kế toán xác nhận tay (`Payments.Reconcile`).</summary>
    public string? ReconciliationReference { get; private set; }

    public DateTime? ConfirmedAt { get; private set; }

    /// <summary>D04 mục 4 — tiền mặt COD đã thu của khách nhưng chưa nộp quỹ.</summary>
    public CodSettlementStatus Settlement { get; private set; }

    protected PaymentIntent() { }

    public static PaymentIntent Create(
        Guid orderId,
        decimal amount,
        string currency,
        PaymentProvider provider,
        string idempotencyKey)
    {
        return new PaymentIntent
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            Amount = amount,
            Currency = currency,
            Provider = provider,
            IdempotencyKey = idempotencyKey,
            Status = PaymentStatus.Pending,
            Settlement = CodSettlementStatus.NotApplicable,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void SetExternalId(string externalId, string? clientSecret)
    {
        ExternalId = externalId;
        ClientSecret = clientSecret;
    }

    /// <summary>Gán mã thanh toán (nội dung CK). Chỉ gán một lần — đổi mã là mất khả năng đối soát.</summary>
    public void SetPaymentCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code)) throw new ArgumentException("Mã thanh toán rỗng", nameof(code));
        PaymentCode ??= code.Trim().ToUpperInvariant();
    }

    public void SetExpiry(DateTime expiresAtUtc) => ExpiresAt = expiresAtUtc;

    /// <summary>
    /// W0-10: số tiền LUÔN lấy từ đơn hàng (server), không bao giờ từ client.
    /// Chỉ chỉnh được khi intent còn Pending — dùng khi tái sử dụng intent cho đơn đã đổi tổng tiền.
    /// </summary>
    public void ReviseAmount(decimal amount)
    {
        if (Status != PaymentStatus.Pending)
            throw new InvalidOperationException($"Không đổi được số tiền của intent ở trạng thái {Status}");
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Số tiền phải lớn hơn 0");
        Amount = amount;
    }

    public void Succeed()
    {
        if (Status == PaymentStatus.Succeeded) return; // Idempotent
        if (Status is PaymentStatus.Refunded or PaymentStatus.PartiallyRefunded)
            throw new InvalidOperationException("Không thể Succeed một intent đã hoàn tiền");

        Status = PaymentStatus.Succeeded;
        ConfirmedAt = DateTime.UtcNow;
        RaiseDomainEvent(new PaymentSucceededDomainEvent(Id, OrderId, Amount));
    }

    /// <summary>
    /// Kế toán xác nhận đã nhận chuyển khoản (`Payments.Reconcile`) kèm mã tham chiếu ngân hàng.
    /// Mã tham chiếu là bằng chứng đối soát — bắt buộc, không được để trống.
    /// </summary>
    public void ConfirmManually(string bankReference)
    {
        if (string.IsNullOrWhiteSpace(bankReference))
            throw new ArgumentException("Thiếu mã tham chiếu ngân hàng", nameof(bankReference));
        ReconciliationReference = bankReference.Trim();
        Succeed();
    }

    /// <summary>
    /// W0-10: <see cref="PaymentStatus.Succeeded"/> là TRẠNG THÁI CUỐI.
    /// Một callback lỗi/timeout đến sau KHÔNG được phép "gỡ" một khoản đã thu.
    /// </summary>
    public void Fail(string reason)
    {
        if (Status is PaymentStatus.Succeeded or PaymentStatus.Refunded or PaymentStatus.PartiallyRefunded) return;

        Status = PaymentStatus.Failed;
        FailureReason = reason;
        RaiseDomainEvent(new PaymentFailedDomainEvent(Id, OrderId, reason));
    }

    /// <summary>
    /// D04 mục 4 — quá cửa sổ giữ đơn mà chưa có tiền về: huỷ intent (đơn hàng do Sales huỷ qua sự kiện).
    /// Không bao giờ chạm vào một intent đã thu được tiền.
    /// </summary>
    public bool Expire(string reason)
    {
        if (Status != PaymentStatus.Pending) return false;
        Status = PaymentStatus.Cancelled;
        FailureReason = reason;
        RaiseDomainEvent(new PaymentFailedDomainEvent(Id, OrderId, reason));
        return true;
    }

    /// <summary>Ghi nhận một khoản hoàn ĐÃ TRẢ cho khách. Trả về true nếu đã hoàn hết.</summary>
    public bool RegisterRefund(decimal amount)
    {
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Số tiền hoàn phải lớn hơn 0");
        if (Status is not (PaymentStatus.Succeeded or PaymentStatus.PartiallyRefunded))
            throw new InvalidOperationException($"Chỉ hoàn được khoản đã thu (trạng thái hiện tại: {Status})");
        if (AmountRefunded + amount > Amount)
            throw new InvalidOperationException("Tổng hoàn vượt quá số tiền đã thu");

        AmountRefunded += amount;
        var full = AmountRefunded >= Amount;
        Status = full ? PaymentStatus.Refunded : PaymentStatus.PartiallyRefunded;
        RaiseDomainEvent(new PaymentRefundedDomainEvent(Id, OrderId, amount, full));
        return full;
    }

    public void MarkCodAwaitingRemittance()
    {
        if (Provider != PaymentProvider.COD) return;
        if (Settlement == CodSettlementStatus.NotApplicable) Settlement = CodSettlementStatus.AwaitingRemittance;
    }

    /// <summary>Kế toán tick "đã nhận tiền đối soát" theo đợt (D04 mục 4, hàng COD).</summary>
    public void MarkCodRemitted() => Settlement = CodSettlementStatus.Remitted;
}
