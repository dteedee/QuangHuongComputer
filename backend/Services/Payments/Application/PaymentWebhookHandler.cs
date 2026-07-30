using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Payments.Domain;
using Payments.Infrastructure;

namespace Payments.Application;

/// <summary>
/// Phase 04 — Xử lý webhook thanh toán idempotent.
/// - Bảng ProcessedWebhooks (Provider, TransactionId UNIQUE) chống xử lý lặp.
/// - Ghi bản ghi trong CÙNG transaction với đổi trạng thái PaymentIntent.
/// - KHÔNG log payload nhạy cảm (số tiền/orderId thì OK; không log chữ ký, token, PAN...).
/// - Xác thực chữ ký PHẢI được thực hiện tại tầng endpoint trước khi gọi handler.
/// </summary>
public class PaymentWebhookHandler
{
    private readonly PaymentsDbContext _db;
    private readonly IPublishEndpoint _bus;
    private readonly ILogger<PaymentWebhookHandler> _logger;

    public PaymentWebhookHandler(
        PaymentsDbContext db,
        IPublishEndpoint bus,
        ILogger<PaymentWebhookHandler> logger)
    {
        _db = db;
        _bus = bus;
        _logger = logger;
    }

    /// <summary>
    /// Xử lý webhook. Trả về (Processed, PaymentId, OrderId, WasIdempotent).
    /// - WasIdempotent=true: đã xử lý trước đó, không làm gì thêm (endpoint vẫn 200).
    /// - Processed=false: không tìm thấy PaymentIntent khớp (transactionId lạ hoặc mất đồng bộ).
    /// </summary>
    public async Task<WebhookProcessResult> ProcessAsync(
        string provider,
        string transactionId,
        Guid? paymentIntentId,
        bool success,
        string? failureReason,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(provider))
            throw new ArgumentException("provider bắt buộc", nameof(provider));
        if (string.IsNullOrWhiteSpace(transactionId))
            throw new ArgumentException("transactionId bắt buộc", nameof(transactionId));

        // 1) Idempotency check — (Provider, TransactionId) đã xử lý → return sớm.
        var existing = await _db.ProcessedWebhooks
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Provider == provider && w.TransactionId == transactionId, ct);
        if (existing != null)
        {
            _logger.LogInformation(
                "Webhook idempotent hit: {Provider}/{TxnId} đã xử lý lúc {At}",
                provider, transactionId, existing.ProcessedAt);
            return new WebhookProcessResult(
                Processed: true, WasIdempotent: true,
                PaymentIntentId: existing.PaymentIntentId, OrderId: existing.OrderId);
        }

        // 2) Tìm PaymentIntent. Ưu tiên theo paymentIntentId; fallback theo (Provider, ExternalId).
        PaymentIntent? payment = null;
        if (paymentIntentId.HasValue)
        {
            payment = await _db.PaymentIntents
                .FirstOrDefaultAsync(p => p.Id == paymentIntentId.Value, ct);
        }
        payment ??= await _db.PaymentIntents
            .FirstOrDefaultAsync(p => p.ExternalId == transactionId, ct);

        if (payment == null)
        {
            _logger.LogWarning(
                "Webhook không match PaymentIntent: {Provider}/{TxnId}",
                provider, transactionId);
            // Vẫn ghi bản ghi để chặn retry hoài — kết quả Ignored.
            _db.ProcessedWebhooks.Add(ProcessedWebhook.Record(provider, transactionId, "Ignored"));
            await _db.SaveChangesAsync(ct);
            return new WebhookProcessResult(false, false, null, null);
        }

        // 3) Áp trạng thái + ghi ProcessedWebhook trong cùng SaveChanges.
        var resultTag = "Failed";
        if (success)
        {
            payment.Succeed();
            resultTag = "Success";
        }
        else
        {
            payment.Fail(failureReason ?? "Webhook reported failure");
        }

        _db.ProcessedWebhooks.Add(ProcessedWebhook.Record(
            provider: provider,
            transactionId: transactionId,
            result: resultTag,
            orderId: payment.OrderId,
            paymentIntentId: payment.Id));

        await _db.SaveChangesAsync(ct);

        // 4) Publish integration event (best-effort, sau khi commit).
        if (success)
        {
            await _bus.Publish(new PaymentSucceededEvent(
                payment.Id, payment.OrderId, payment.Amount, DateTime.UtcNow), ct);
        }
        else
        {
            await _bus.Publish(new PaymentFailedEvent(
                payment.Id, payment.OrderId,
                failureReason ?? "Unknown failure", DateTime.UtcNow), ct);
        }

        return new WebhookProcessResult(
            Processed: true, WasIdempotent: false,
            PaymentIntentId: payment.Id, OrderId: payment.OrderId);
    }
}

public record WebhookProcessResult(
    bool Processed,
    bool WasIdempotent,
    Guid? PaymentIntentId,
    Guid? OrderId);
