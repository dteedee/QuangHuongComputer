using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Payments.Application.Configuration;
using Payments.Domain;
using Payments.Infrastructure;
using Payments.Infrastructure.VNPay;

namespace Payments.Application.Providers.VnPay;

/// <summary>
/// W2-21 — cổng VNPay (ATM nội địa / thẻ quốc tế / VNPAY-QR), D04 mục 2 tầng 2.
///
/// **Đăng ký hoàn toàn bằng assembly scan** của W2-4 — track này không sửa `DependencyInjection.cs`.
/// Hệ quả: khi chưa có `TmnCode`/`HashSecret` THẬT, <see cref="PaymentConfigGuard"/> trả "không khả
/// dụng" nên <see cref="PaymentProviderRegistry.Resolve"/> trả null ⇒ `vnpay` vắng trong
/// `/api/payments/methods`, `/initiate` trả 400 PAYMENT_METHOD_UNAVAILABLE, route IPN trả 503.
/// Code "ngủ" và không tốn gì cho tới khi chủ đầu tư ký hợp đồng VNPay.
///
/// Constructor KHÔNG được ném khi thiếu cấu hình: registry khởi tạo MỌI provider để lập bảng, một
/// exception ở đây sẽ làm chết cả COD lẫn chuyển khoản.
/// </summary>
public sealed class VnPayProvider : IPaymentProvider
{
    private readonly PaymentsDbContext _db;
    private readonly IConfiguration _config;
    private readonly PaymentConfigGuard _guard;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<VnPayProvider> _logger;

    public VnPayProvider(
        PaymentsDbContext db,
        IConfiguration config,
        PaymentConfigGuard guard,
        IHttpClientFactory httpClientFactory,
        ILogger<VnPayProvider> logger)
    {
        _db = db;
        _config = config;
        _guard = guard;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public PaymentProvider Provider => PaymentProvider.VnPay;

    /// <summary>VNPay có API `refund` thật (02/03) — lỗi thì rơi về phiếu hoàn thủ công.</summary>
    public bool SupportsGatewayRefund => true;

    public Task<PaymentInstruction> CreateAsync(PaymentCreationContext context, CancellationToken ct = default)
    {
        var options = Options();
        if (!options.IsConfigured)
        {
            // Chỉ xảy ra khi cấu hình bị rút giữa chừng: thà 503 còn hơn một URL không ký được.
            _logger.LogError("VNPay: CreateAsync được gọi khi {Key} chưa cấu hình", VnPayOptions.TmnCodeKey);
            throw new InvalidOperationException("Cổng VNPay chưa được cấu hình.");
        }

        var built = VnPayPaymentUrlBuilder.Build(options, context, DateTimeOffset.UtcNow);

        // `vnp_TxnRef` là khoá duy nhất để IPN/`querydr`/`refund` tìm lại giao dịch này.
        context.Intent.SetExternalId(built.TxnRef, null);
        context.Intent.SetExpiry(built.ExpiresAtUtc);

        _logger.LogInformation(
            "VNPay: tạo lệnh thanh toán cho intent {IntentId}, hết hạn {ExpiresAt:o}",
            context.Intent.Id, built.ExpiresAtUtc);

        return Task.FromResult(PaymentInstruction.Redirect(built.Url));
    }

    public async Task<GatewayRefundResult> RefundAsync(
        PaymentIntent intent, decimal amount, string reason, CancellationToken ct = default)
    {
        var options = Options();
        if (!options.IsConfigured) return GatewayRefundResult.Failed("Cổng VNPay chưa được cấu hình");

        var transactionNo = await ResolveTransactionNoAsync(intent, ct);
        return await Client(options).RefundAsync(intent, amount, transactionNo, ct);
    }

    public async Task<GatewayQueryResult> QueryAsync(PaymentIntent intent, CancellationToken ct = default)
    {
        var options = Options();
        if (!options.IsConfigured) return GatewayQueryResult.Unknown();
        return await Client(options).QueryAsync(intent, ct);
    }

    /// <summary>
    /// `vnp_TransactionNo` của lần thu được lưu trong khoá chống lặp của IPN
    /// (<c>{vnp_TxnRef}:{vnp_TransactionNo}</c>, xem <see cref="VnPayIpnProcessor.BuildDedupeKey"/>).
    /// Không tìm thấy thì để trống — VNPay vẫn tra được theo `vnp_TxnRef` + `vnp_TransactionDate`.
    /// </summary>
    private async Task<string?> ResolveTransactionNoAsync(PaymentIntent intent, CancellationToken ct)
    {
        var key = await _db.ProcessedWebhooks.AsNoTracking()
            .Where(w => w.Provider == VnPayIpnProcessor.ProviderTag)
            .Where(w => w.PaymentIntentId == intent.Id && w.Result == "Success")
            .OrderByDescending(w => w.ProcessedAt)
            .Select(w => w.TransactionId)
            .FirstOrDefaultAsync(ct);

        if (string.IsNullOrWhiteSpace(key)) return null;
        var separator = key.LastIndexOf(':');
        if (separator < 0 || separator == key.Length - 1) return null;

        var transactionNo = key[(separator + 1)..];
        return transactionNo is "0" or "" ? null : transactionNo;
    }

    private VnPayOptions Options() => VnPayOptions.From(_config, _guard);

    private VnPayMerchantApiClient Client(VnPayOptions options) => new(
        _httpClientFactory.CreateClient(VnPayMerchantApiClient.HttpClientName), options, _logger);
}
