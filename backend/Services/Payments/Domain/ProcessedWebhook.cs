using BuildingBlocks.SharedKernel;

namespace Payments.Domain;

/// <summary>
/// Phase 04 — Chống xử lý webhook lặp.
/// (Provider, TransactionId) là unique — nhận webhook lần 2 cùng transaction → return 200 idempotent.
/// Ghi trong CÙNG transaction với đổi trạng thái PaymentIntent để đảm bảo atomic.
/// </summary>
public class ProcessedWebhook : Entity<Guid>
{
    public string Provider { get; private set; } = string.Empty; // VNPay | MoMo | ZaloPay | SePay | Manual
    public string TransactionId { get; private set; } = string.Empty;
    public Guid? OrderId { get; private set; }
    public Guid? PaymentIntentId { get; private set; }
    public DateTime ProcessedAt { get; private set; }
    public string? Result { get; private set; }   // Success | Failed | Ignored

    protected ProcessedWebhook() { }

    public static ProcessedWebhook Record(
        string provider,
        string transactionId,
        string result,
        Guid? orderId = null,
        Guid? paymentIntentId = null)
    {
        if (string.IsNullOrWhiteSpace(provider))
            throw new ArgumentException("provider bắt buộc", nameof(provider));
        if (string.IsNullOrWhiteSpace(transactionId))
            throw new ArgumentException("transactionId bắt buộc", nameof(transactionId));

        return new ProcessedWebhook
        {
            Id = Guid.NewGuid(),
            Provider = provider,
            TransactionId = transactionId,
            OrderId = orderId,
            PaymentIntentId = paymentIntentId,
            ProcessedAt = DateTime.UtcNow,
            Result = result,
            CreatedAt = DateTime.UtcNow
        };
    }
}
