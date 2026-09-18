using Microsoft.Extensions.Logging;
using Payments.Application.Configuration;
using Payments.Domain;

namespace Payments.Application.Providers;

/// <summary>
/// D04 R2 — cửa duy nhất để lấy một <see cref="IPaymentProvider"/>.
///
/// Hai điều kiện, cả hai phải đúng, không có nhánh thứ ba:
///   1. có MỘT cài đặt chiến lược cho provider đó (đăng ký qua assembly scan), và
///   2. <see cref="PaymentConfigGuard"/> xác nhận đủ khoá THẬT.
/// Thiếu một trong hai ⇒ <c>null</c> ⇒ endpoint trả 400 `PAYMENT_METHOD_UNAVAILABLE`.
/// Không tồn tại đường nào trả về URL giả, kể cả cho enum thêm sau này.
/// </summary>
public sealed class PaymentProviderRegistry
{
    private readonly IReadOnlyDictionary<PaymentProvider, IPaymentProvider> _providers;
    private readonly PaymentConfigGuard _guard;
    private readonly ILogger<PaymentProviderRegistry> _logger;

    public PaymentProviderRegistry(
        IEnumerable<IPaymentProvider> providers,
        PaymentConfigGuard guard,
        ILogger<PaymentProviderRegistry> logger)
    {
        _guard = guard;
        _logger = logger;

        var map = new Dictionary<PaymentProvider, IPaymentProvider>();
        foreach (var provider in providers)
        {
            if (map.TryAdd(provider.Provider, provider)) continue;
            _logger.LogError(
                "Hai cài đặt IPaymentProvider cùng nhận {Provider}: {A} và {B} — giữ cài đặt đầu tiên",
                provider.Provider, map[provider.Provider].GetType().Name, provider.GetType().Name);
        }
        _providers = map;
    }

    /// <summary>Có chiến lược cho provider này không (chưa xét cấu hình).</summary>
    public bool HasStrategy(PaymentProvider provider) => _providers.ContainsKey(provider);

    /// <summary>Provider dùng được ngay bây giờ, hoặc null kèm lý do đã ghi log.</summary>
    public IPaymentProvider? Resolve(PaymentProvider provider)
    {
        if (!_guard.IsAvailable(provider))
        {
            _logger.LogWarning("Provider {Provider} chưa cấu hình đủ khoá — từ chối", provider);
            return null;
        }
        if (!_providers.TryGetValue(provider, out var strategy))
        {
            _logger.LogWarning("Provider {Provider} đã cấu hình nhưng chưa có IPaymentProvider nào cài đặt", provider);
            return null;
        }
        return strategy;
    }

    /// <summary>
    /// Phương thức hiện cho khách chọn: đủ khoá VÀ (có chiến lược HOẶC là phương thức dẫn hướng).
    /// Một cổng có khoá thật nhưng chưa có code (VNPay trước W2-21) KHÔNG được hiện ra — hiện ra
    /// là hứa với khách một thứ `/initiate` sẽ từ chối.
    /// </summary>
    public IReadOnlyList<PaymentMethodAvailability> PublicMethods()
        => _guard.AvailableMethods()
            .Where(m => !m.IsDirect || _providers.ContainsKey(m.Provider))
            .OrderBy(m => m.SortOrder)
            .ToList();
}
