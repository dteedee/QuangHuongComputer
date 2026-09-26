using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Payments.Application.Configuration;
using Payments.Application.Providers;
using Payments.Domain;
using Payments.Infrastructure;
using BuildingBlocks.Endpoints;

namespace Payments.Application;

/// <summary>
/// Lõi của `POST /api/payments/initiate` — dùng chung cho khách đăng nhập và khách vãng lai,
/// nên KHÔNG có đường nào bỏ qua một bước kiểm nào.
///
/// Thứ tự cố định (W0-10 giữ nguyên, W2-4 bổ sung bước 5-6):
///  1. phương thức phải đang bật VÀ có chiến lược → nếu không: 400 PAYMENT_METHOD_UNAVAILABLE;
///  2. đơn hàng tra từ server qua <see cref="IOrderPaymentInfoProvider"/>;
///  3. quyền truy cập do người gọi quyết định trước khi vào đây (chủ đơn / nhân viên / token khách);
///  4. đơn chưa huỷ, chưa thanh toán, tổng tiền &gt; 0;
///  5. trần COD (D04 mục 3) — chỉ áp dụng khi CÒN phương thức khác để khách chọn;
///  6. `amount = order.TotalAmount`; `model.Amount` của client bị BỎ QUA hoàn toàn;
///  7. tái sử dụng intent Pending của cùng (đơn, provider).
/// </summary>
public sealed class PaymentInitiationService
{
    private readonly PaymentsDbContext _db;
    private readonly IOrderPaymentInfoProvider _orders;
    private readonly PaymentProviderRegistry _registry;
    private readonly PaymentSettings _settings;
    private readonly IConfiguration _config;
    private readonly ILogger<PaymentInitiationService> _logger;

    public PaymentInitiationService(
        PaymentsDbContext db,
        IOrderPaymentInfoProvider orders,
        PaymentProviderRegistry registry,
        PaymentSettings settings,
        IConfiguration config,
        ILogger<PaymentInitiationService> logger)
    {
        _db = db;
        _orders = orders;
        _registry = registry;
        _settings = settings;
        _config = config;
        _logger = logger;
    }

    /// <summary>Đơn hàng theo góc nhìn server — người gọi dùng để tự quyết định quyền truy cập.</summary>
    public Task<OrderPaymentInfo?> GetOrderAsync(Guid orderId, CancellationToken ct) => _orders.GetAsync(orderId, ct);

    public IPaymentProvider RequireProvider(PaymentProvider provider)
    {
        if (PaymentMethodSpec.All.TryGetValue(provider, out var spec) && !spec.IsDirect)
            throw PaymentDomainException.MethodNotDirect();

        return _registry.Resolve(provider) ?? throw PaymentDomainException.MethodUnavailable();
    }

    public async Task<PaymentInitiationResult> InitiateAsync(
        IPaymentProvider strategy,
        OrderPaymentInfo order,
        string? bankCode,
        HttpContext httpContext,
        CancellationToken ct)
    {
        if (order.IsCancelled) throw PaymentDomainException.OrderCancelled();
        if (order.IsPaid) throw PaymentDomainException.OrderAlreadyPaid();
        if (order.TotalAmount <= 0) throw PaymentDomainException.InvalidOrderAmount();

        EnforceCodCeiling(strategy.Provider, order.TotalAmount);

        var amount = order.TotalAmount;

        var payment = await _db.PaymentIntents.FirstOrDefaultAsync(
            p => p.OrderId == order.OrderId && p.Provider == strategy.Provider && p.Status == PaymentStatus.Pending,
            ct);

        var reused = payment is not null;
        if (payment is null)
        {
            // Khoá chống trùng = (đơn, cổng, lần thử). Phần "lần thử" là bắt buộc: cột
            // IdempotencyKey là UNIQUE, nên một khoá thuần (đơn, cổng) sẽ nổ 23505 ngay lần thứ hai
            // khách quay lại sau một intent đã Failed/Cancelled.
            var attempt = await _db.PaymentIntents.CountAsync(
                p => p.OrderId == order.OrderId && p.Provider == strategy.Provider, ct);
            payment = PaymentIntent.Create(
                order.OrderId, amount, "VND", strategy.Provider,
                $"{order.OrderId:N}:{(int)strategy.Provider}:{attempt}");
            _db.PaymentIntents.Add(payment);
        }
        else if (payment.Amount != amount)
        {
            payment.ReviseAmount(amount);
        }

        PaymentInstruction instruction;
        try
        {
            instruction = await strategy.CreateAsync(
                new PaymentCreationContext(
                    Intent: payment,
                    Amount: amount,
                    OrderReference: order.OrderId.ToString("N")[..8].ToUpperInvariant(),
                    BankCode: bankCode,
                    BaseUrl: BaseUrl(httpContext),
                    FrontendUrl: FrontendUrl(),
                    ClientIpAddress: httpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1"),
                ct);
        }
        catch (InvalidOperationException ex)
        {
            // Cấu hình cổng sai (ví dụ BIN không phải 6 chữ số) là lỗi vận hành, không phải lỗi khách.
            _logger.LogError(ex, "Không dựng được lệnh thanh toán cho provider {Provider}", strategy.Provider);
            throw PaymentDomainException.ProviderConfiguration(ClientSafeError.Message(ex));
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Initiate {Provider} cho đơn {OrderId}: intent {IntentId}, số tiền {Amount} (tái dùng: {Reused})",
            strategy.Provider, order.OrderId, payment.Id, amount, reused);

        return new PaymentInitiationResult(payment, amount, reused, instruction);
    }

    /// <summary>
    /// D04 mục 3 — trần COD mặc định 0 (TẮT) và chỉ áp dụng khi còn ít nhất một phương thức
    /// trực tiếp khác đang bật. Chặn COD khi không còn cách trả nào khác = khách không mua được.
    /// </summary>
    private void EnforceCodCeiling(PaymentProvider provider, decimal amount)
    {
        if (provider != PaymentProvider.COD) return;

        var limit = _settings.CodMaxOrderAmount;
        if (limit <= 0 || amount <= limit) return;

        var hasAlternative = _registry.PublicMethods()
            .Any(m => m.IsDirect && m.Provider != PaymentProvider.COD);
        if (!hasAlternative) return;

        throw PaymentDomainException.CodLimitExceeded(limit);
    }

    private string BaseUrl(HttpContext ctx)
        => _config["BaseUrl"] ?? $"{ctx.Request.Scheme}://{ctx.Request.Host}";

    private string FrontendUrl()
        => _config["Frontend:Url"] ?? _config["Cors:AllowedOrigins:0"] ?? "http://localhost:3000";
}

public sealed record PaymentInitiationResult(
    PaymentIntent Intent,
    decimal Amount,
    bool Reused,
    PaymentInstruction Instruction);
