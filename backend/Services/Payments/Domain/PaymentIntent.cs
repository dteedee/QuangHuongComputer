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

    public void Succeed()
    {
        if (Status == PaymentStatus.Succeeded) return; // Idempotent check handled here ideally
        
        Status = PaymentStatus.Succeeded;
        RaiseDomainEvent(new PaymentSucceededDomainEvent(Id, OrderId, Amount));
    }

    public void Fail(string reason)
    {
        Status = PaymentStatus.Failed;
        FailureReason = reason;
        RaiseDomainEvent(new PaymentFailedDomainEvent(Id, OrderId, reason));
    }
}

public enum PaymentProvider
{
    Stripe,
    VnPay,
    Momo,
    COD,
    SePay
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
