using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Payments.Application;
using Payments.Application.Configuration;
using Payments.Domain;
using Payments.Infrastructure.SePay;

namespace Payments.Infrastructure.Reconciliation;

/// <summary>
/// D04 mục 4 — job đối soát chạy mỗi giờ. Hai việc, cả hai đều chỉ liên quan tới intent CÒN TREO:
///
///  1. **Hết hạn giữ đơn.** Intent chuyển khoản quá `Payment:BankTransfer:HoldHours` mà chưa có tiền
///     về thì bị huỷ và phát <see cref="PaymentFailedEvent"/> để Sales huỷ đơn + nhả tồn.
///     Không có bước này thì mỗi lần khách bấm "chuyển khoản" rồi bỏ đi là một lần hàng bị giữ vĩnh viễn.
///  2. **Kéo sổ phụ SePay** cho intent treo quá `Payment:Reconciliation:StaleAfterMinutes` (15 phút).
///     Khớp ĐÚNG mã thanh toán + đúng số tiền thì xác nhận; mọi khoản khác chỉ được ghi vào bảng
///     `SePayTransactions` để vào hàng "Chưa gán" — **KHÔNG BAO GIỜ tự xác nhận theo số tiền** (D04).
///
/// Chưa cấu hình `Payment:SePay:ApiToken` thì việc 2 không chạy và job nói rõ điều đó trong log,
/// thay vì âm thầm không làm gì.
/// </summary>
public sealed class PaymentReconciliationJob : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PaymentReconciliationJob> _logger;

    public PaymentReconciliationJob(IServiceScopeFactory scopeFactory, ILogger<PaymentReconciliationJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Để API khởi động xong hẳn trước khi đụng vào DB.
        await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken).ConfigureAwait(false);

        while (!stoppingToken.IsCancellationRequested)
        {
            var interval = TimeSpan.FromMinutes(60);
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var settings = scope.ServiceProvider.GetRequiredService<PaymentSettings>();
                interval = TimeSpan.FromMinutes(settings.ReconcileIntervalMinutes);

                await ExpireStaleHoldsAsync(scope.ServiceProvider, stoppingToken);
                await PullSePayLedgerAsync(scope.ServiceProvider, settings, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                // Một vòng lỗi không được giết job: lần sau vẫn phải chạy.
                _logger.LogError(ex, "Vòng đối soát thanh toán thất bại");
            }

            try { await Task.Delay(interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task ExpireStaleHoldsAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<PaymentsDbContext>();
        var bus = services.GetRequiredService<IPublishEndpoint>();
        var now = DateTime.UtcNow;

        var expired = await db.PaymentIntents
            .Where(p => p.Status == PaymentStatus.Pending)
            .Where(p => p.ExpiresAt != null && p.ExpiresAt < now)
            .Take(200)
            .ToListAsync(ct);

        if (expired.Count == 0) return;

        foreach (var intent in expired)
            intent.Expire("Hết hạn giữ đơn chờ chuyển khoản");

        await db.SaveChangesAsync(ct);

        foreach (var intent in expired)
            await bus.Publish(new PaymentFailedEvent(
                intent.Id, intent.OrderId, "Hết hạn giữ đơn chờ chuyển khoản", now), ct);

        _logger.LogInformation("Đối soát: {Count} intent chuyển khoản hết hạn đã bị huỷ", expired.Count);
    }

    private async Task PullSePayLedgerAsync(IServiceProvider services, PaymentSettings settings, CancellationToken ct)
    {
        var client = services.GetRequiredService<SePayTransactionListClient>();
        if (!client.IsConfigured)
        {
            _logger.LogInformation(
                "Đối soát SePay: BỎ QUA ({Key} chưa cấu hình)", PaymentConfigKeys.SePayApiToken);
            return;
        }

        var db = services.GetRequiredService<PaymentsDbContext>();
        var handler = services.GetRequiredService<PaymentWebhookHandler>();
        var now = DateTime.UtcNow;
        var staleBefore = now.AddMinutes(-settings.ReconcileAfterMinutes);

        var pending = await db.PaymentIntents
            .Where(p => p.Status == PaymentStatus.Pending && p.Provider == PaymentProvider.SePay)
            .Where(p => p.CreatedAt < staleBefore)
            .ToListAsync(ct);

        if (pending.Count == 0) return;

        var since = pending.Min(p => p.CreatedAt).AddMinutes(-5);
        var rows = await client.ListAsync(since, 500, ct);
        if (rows.Count == 0) return;

        var known = await db.SePayTransactions
            .Where(t => t.TransactionDate >= since)
            .Select(t => t.ReferenceCode)
            .ToListAsync(ct);
        var knownRefs = new HashSet<string>(known.Where(r => r is not null)!, StringComparer.Ordinal);

        var confirmed = 0;
        var unassigned = 0;

        foreach (var row in rows.Where(r => r.AmountIn > 0))
        {
            if (row.ReferenceNumber is not null && knownRefs.Contains(row.ReferenceNumber)) continue;

            var matched = SePayPaymentMatcher.Match(
                pending, row.AmountIn, row.TransactionContent, row.Code, row.TransactionContent);

            db.SePayTransactions.Add(new SePayTransaction
            {
                Gateway = row.BankBrandName ?? "SePay",
                TransactionDate = row.ParsedDate,
                AccountNumber = row.AccountNumber,
                Content = row.TransactionContent ?? string.Empty,
                TransferType = "in",
                TransferAmount = row.AmountIn,
                Code = row.Code,
                ReferenceCode = row.ReferenceNumber,
                Description = "Kéo từ sổ phụ SePay (đối soát)",
                IsProcessed = matched is not null,
                RelatedOrderId = matched?.OrderId,
                ProcessingError = matched is null
                    ? "Chưa gán: không khớp mã thanh toán + số tiền"
                    : null,
                IsActive = true
            });
            await db.SaveChangesAsync(ct);

            if (matched is null) { unassigned++; continue; }

            await handler.ProcessAsync(
                provider: "SePay",
                transactionId: row.Id,
                paymentIntentId: matched.Id,
                success: true,
                failureReason: null,
                gatewayAmount: row.AmountIn,
                ct: ct);
            confirmed++;
        }

        _logger.LogInformation(
            "Đối soát SePay: {Confirmed} khoản khớp mã + tiền đã xác nhận, {Unassigned} khoản vào hàng Chưa gán",
            confirmed, unassigned);
    }
}
