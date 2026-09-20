using BuildingBlocks.Configuration;
using Microsoft.Extensions.Configuration;

namespace Sales.Application.Pricing;

/// <summary>
/// W0-4 — NGUỒN DUY NHẤT tính phí vận chuyển phía server.
///
/// Trước đây công thức "≥ 500.000đ thì miễn phí, ngược lại 30.000đ" nằm rải rác 3 nơi
/// (guest-checkout, checkout đã đăng nhập, CartContext.tsx) và checkout còn tin
/// <c>ShippingFee</c> do client gửi lên → khách tự set phí ship = 0.
/// Giờ mọi luồng gọi <see cref="Calculate"/>; client KHÔNG còn quyền quyết định phí ship.
///
/// THỨ TỰ ƯU TIÊN NGUỒN SỐ (sửa 2026-09-20):
///   1. Bảng cấu hình admin (<c>SystemConfig.Configurations</c>) qua <see cref="IAppSettings"/>:
///      khoá <c>FREESHIP_THRESHOLD</c> và <c>SHIPPING_COST</c>.
///   2. appsettings: <c>"Shipping": { "FreeThreshold": 500000, "FlatFee": 30000 }</c>.
///   3. Hằng số mặc định dưới đây.
///
/// Vì sao đổi: hai khoá ở mục (1) hiện ra trong trang cấu hình admin VÀ được đẩy xuống storefront
/// qua <c>/api/system-config/public</c> (thanh "mua thêm X để miễn phí giao hàng" đọc chính nó),
/// nhưng KHÔNG nơi nào phía server đọc chúng. Admin đổi ngưỡng ⇒ chỉ đổi lời quảng cáo trên web,
/// còn tiền thu của khách vẫn theo appsettings. Đó là hai nguồn sự thật cho cùng một chính sách.
/// </summary>
public static class ShippingFeePolicy
{
    public const decimal DefaultFreeThreshold = 500_000m;
    public const decimal DefaultFlatFee = 30_000m;

    /// <summary>Khoá trong bảng cấu hình admin — trùng tên với khoá đẩy xuống storefront.</summary>
    public const string FreeThresholdSettingKey = "FREESHIP_THRESHOLD";
    public const string FlatFeeSettingKey = "SHIPPING_COST";

    /// <summary>Đọc ngưỡng freeship + phí phẳng từ config, fallback về hằng số mặc định.</summary>
    public static (decimal FreeThreshold, decimal FlatFee) Read(IConfiguration? config)
        => Read(null, config);

    /// <summary>
    /// Đọc ngưỡng freeship + phí phẳng theo thứ tự ưu tiên ở phần mô tả class.
    /// </summary>
    public static (decimal FreeThreshold, decimal FlatFee) Read(IAppSettings? settings, IConfiguration? config)
    {
        var threshold = ReadDecimal(config, "Shipping:FreeThreshold", DefaultFreeThreshold);
        var flat = ReadDecimal(config, "Shipping:FlatFee", DefaultFlatFee);

        if (settings is not null)
        {
            // Fallback truyền vào chính là giá trị từ appsettings: khoá admin thiếu/không parse được
            // thì rơi về appsettings chứ không nhảy thẳng xuống hằng số.
            threshold = settings.GetDecimal(FreeThresholdSettingKey, threshold);
            flat = settings.GetDecimal(FlatFeeSettingKey, flat);
        }

        if (threshold < 0) threshold = DefaultFreeThreshold;
        if (flat < 0) flat = DefaultFlatFee;
        return (threshold, flat);
    }

    /// <summary>
    /// Phí ship cho một đơn: nhận tại cửa hàng → 0; tiền hàng sau giảm ≥ ngưỡng → 0; còn lại → phí phẳng.
    /// </summary>
    /// <param name="netSubtotal">Tiền hàng SAU giảm giá (đã gồm VAT).</param>
    /// <param name="isPickup">Khách nhận tại cửa hàng.</param>
    public static decimal Calculate(decimal netSubtotal, bool isPickup, IConfiguration? config = null)
        => Calculate(netSubtotal, isPickup, null, config);

    /// <summary>Bản đầy đủ — ưu tiên cấu hình admin sửa được trong back office.</summary>
    public static decimal Calculate(
        decimal netSubtotal, bool isPickup, IAppSettings? settings, IConfiguration? config)
    {
        if (isPickup) return 0m;

        var (threshold, flat) = Read(settings, config);
        if (netSubtotal < 0) netSubtotal = 0m;
        return netSubtotal >= threshold ? 0m : flat;
    }

    private static decimal ReadDecimal(IConfiguration? config, string key, decimal fallback)
    {
        var raw = config?[key];
        if (string.IsNullOrWhiteSpace(raw)) return fallback;
        return decimal.TryParse(raw, out var parsed) && parsed >= 0 ? parsed : fallback;
    }
}
