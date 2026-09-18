using BuildingBlocks.SharedKernel;

namespace Payments.Domain;

public class PaymentIntent : AggregateRoot<Guid>
{
    public Guid OrderId { get; private set; }
    public decimal Amount { get; private set; }
    public string Currency { get; private set; }
    public PaymentProvider Provider { get; private set; }
    public PaymentStatus Status { get; private set; }
    public string? ExternalId { get; private set; }
    public string? ClientSecret { get; private set; }
    public string? FailureReason { get; private set; }
    
    // Idempotency key to prevent double charging
    public string IdempotencyKey { get; private set; }

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
            CreatedAt = DateTime.UtcNow
        };
    }

    public void SetExternalId(string externalId, string? clientSecret)
    {
        ExternalId = externalId;
        ClientSecret = clientSecret;
    }

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
        if (Status == PaymentStatus.Refunded)
            throw new InvalidOperationException("Không thể Succeed một intent đã hoàn tiền");

        Status = PaymentStatus.Succeeded;
        RaiseDomainEvent(new PaymentSucceededDomainEvent(Id, OrderId, Amount));
    }

    /// <summary>
    /// W0-10: <see cref="PaymentStatus.Succeeded"/> là TRẠNG THÁI CUỐI.
    /// Một callback lỗi/timeout đến sau KHÔNG được phép "gỡ" một khoản đã thu.
    /// </summary>
    public void Fail(string reason)
    {
        if (Status == PaymentStatus.Succeeded || Status == PaymentStatus.Refunded) return;

        Status = PaymentStatus.Failed;
        FailureReason = reason;
        RaiseDomainEvent(new PaymentFailedDomainEvent(Id, OrderId, reason));
    }
}

public enum PaymentProvider
{
    /// <summary>D04: đã xoá code (Stripe không mở tài khoản ở Việt Nam). Giữ số enum cho dữ liệu cũ.</summary>
    [Obsolete("D04: Stripe đã bị gỡ khỏi hệ thống. Giữ giá trị enum để không dịch số các giá trị sau.")]
    Stripe,
    VnPay,
    Momo,
    COD,
    SePay,

    /// <summary>D04: đã xoá code (ZaloPay cần hợp đồng trước khi có khoá test). Giữ số enum.</summary>
    [Obsolete("D04: ZaloPay đã bị gỡ khỏi hệ thống. Giữ giá trị enum để không dịch số các giá trị sau.")]
    ZaloPay
}

public enum PaymentStatus
{
    Pending,
    Succeeded,
    Failed,
    Cancelled,
    Refunded
}

// Events
public record PaymentSucceededDomainEvent(Guid PaymentId, Guid OrderId, decimal Amount) : DomainEvent;
public record PaymentFailedDomainEvent(Guid PaymentId, Guid OrderId, string Reason) : DomainEvent;
