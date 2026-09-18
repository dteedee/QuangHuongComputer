using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Payments.Application;
using Payments.Application.Configuration;
using Payments.Application.Providers;
using Payments.Application.Providers.VnPay;
using Payments.Domain;

namespace Payments.Infrastructure.VNPay;

/// <summary>
/// W2-21 bước 5 — đối soát VNPay bằng `querydr`.
///
/// Vì sao cần: `vnp_ExpireDate` mặc định 15 phút và IPN có thể mất (mạng, deploy, 503). Một intent
/// còn Pending quá `Payment:VNPay:QueryAfterMinutes` (mặc định **20 phút**, D04 mục 4) được hỏi
/// thẳng cổng. Không có bước này thì một khoản khách ĐÃ TRẢ có thể nằm mãi ở Pending rồi bị job
/// hết hạn của W2-4 huỷ — tiền đã thu mà đơn bị huỷ.
///
/// Không bao giờ tự xác nhận theo số tiền: chỉ ghi nhận khi `querydr` nói đã thu VÀ số tiền khớp
/// (kiểm trong <see cref="VnPayMerchantApiClient.QueryAsync"/>), rồi đi qua đúng
/// <see cref="PaymentWebhookHandler"/> như IPN — nên khoá chống lặp giống hệt IPN và một IPN đến
/// muộn sau đó không cộng tiền lần hai.
///
/// VNPay chưa cấu hình ⇒ job nói rõ "BỎ QUA" một lần rồi ngủ, không gọi mạng lần nào.
/// </summary>
public sealed class VnPayReconciliationJob : BackgroundService
{
    private const int BatchSize = 50;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<VnPayReconciliationJob> _logger;

    public VnPayReconciliationJob(IServiceScopeFactory scopeFactory, ILogger<VnPayReconciliationJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(3), stoppingToken).ConfigureAwait(false);

        var announcedDisabled = false;

        while (!stoppingToken.IsCancellationRequested)
        {
            var interval = TimeSpan.FromMinutes(15);
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
                var guard = scope.ServiceProvider.GetRequiredService<PaymentConfigGuard>();
                var options = VnPayOptions.From(config, guard);
                interval = TimeSpan.FromMinutes(Math.Max(5, options.QueryAfterMinutes / 2));

                if (!guard.IsAvailable(PaymentProvider.VnPay))
                {
                    if (!announcedDisabled)
                    {
                        _logger.LogInformation("Đối soát VNPay: BỎ QUA (cổng chưa cấu hình khoá thật)");
                        announcedDisabled = true;
                    }
                }
                else
                {
                    announcedDisabled = false;
                    await RunOnceAsync(scope.ServiceProvider, options, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                // Một vòng lỗi không được giết job — lần sau vẫn phải chạy.
                _logger.LogError(ex, "Vòng đối soát VNPay thất bại");
            }

            try { await Task.Delay(interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    /// <summary>Một vòng đối soát. Tách ra để test gọi trực tiếp mà không cần dựng host.</summary>
    public async Task<VnPayReconciliationOutcome> RunOnceAsync(
        IServiceProvider services, VnPayOptions options, CancellationToken ct)
    {
        var db = services.GetRequiredService<PaymentsDbContext>();
        var registry = services.GetRequiredService<PaymentProviderRegistry>();
        var handler = services.GetRequiredService<PaymentWebhookHandler>();

        var provider = registry.Resolve(PaymentProvider.VnPay);
        if (provider is null) return VnPayReconciliationOutcome.Empty;

        var staleBefore = DateTime.UtcNow.AddMinutes(-options.QueryAfterMinutes);
        var pending = await db.PaymentIntents
            .Where(p => p.Status == PaymentStatus.Pending && p.Provider == PaymentProvider.VnPay)
            .Where(p => p.CreatedAt < staleBefore && p.ExternalId != null)
            .OrderBy(p => p.CreatedAt)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (pending.Count == 0) return VnPayReconciliationOutcome.Empty;

        var confirmed = 0;
        var stillPending = 0;

        foreach (var intent in pending)
        {
            var result = await provider.QueryAsync(intent, ct);
            if (!result.Known || !result.Succeeded || result.Amount is null)
            {
                stillPending++;
                continue;
            }

            // Cùng đường ghi với IPN ⇒ cùng khoá chống lặp ⇒ IPN đến muộn không cộng tiền lần hai.
            // `QueryAsync` trả về chính `vnp_TxnRef` khi cổng KHÔNG gửi `vnp_TransactionNo`; IPN trong
            // cùng tình huống dùng "0". Nếu để nguyên, hai đường sẽ sinh hai khoá khác nhau cho cùng
            // một giao dịch ⇒ IPN muộn lại chạy qua handler lần nữa (Succeed idempotent nhưng
            // PaymentSucceededEvent bị publish hai lần). Chuẩn hoá về đúng khoá của IPN.
            var transactionNo = string.Equals(result.Reference, intent.ExternalId, StringComparison.Ordinal)
                ? null
                : result.Reference;
            await handler.ProcessAsync(
                provider: VnPayIpnProcessor.ProviderTag,
                transactionId: VnPayIpnProcessor.BuildDedupeKey(intent.ExternalId!, transactionNo),
                paymentIntentId: intent.Id,
                success: true,
                failureReason: null,
                gatewayAmount: result.Amount,
                ct: ct);
            confirmed++;
        }

        _logger.LogInformation(
            "Đối soát VNPay: {Confirmed} intent được cổng xác nhận, {Pending} vẫn treo (trên {Total} đã hỏi)",
            confirmed, stillPending, pending.Count);

        return new VnPayReconciliationOutcome(pending.Count, confirmed, stillPending);
    }
}

public sealed record VnPayReconciliationOutcome(int Queried, int Confirmed, int StillPending)
{
    public static readonly VnPayReconciliationOutcome Empty = new(0, 0, 0);
}
