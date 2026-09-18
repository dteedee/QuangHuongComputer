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
/// Cấu hình (appsettings, tuỳ chọn — không có thì dùng mặc định dưới đây):
///   "Shipping": { "FreeThreshold": 500000, "FlatFee": 30000 }
/// </summary>
public static class ShippingFeePolicy
{
    public const decimal DefaultFreeThreshold = 500_000m;
    public const decimal DefaultFlatFee = 30_000m;

    /// <summary>Đọc ngưỡng freeship + phí phẳng từ config, fallback về hằng số mặc định.</summary>
    public static (decimal FreeThreshold, decimal FlatFee) Read(IConfiguration? config)
    {
        var threshold = ReadDecimal(config, "Shipping:FreeThreshold", DefaultFreeThreshold);
        var flat = ReadDecimal(config, "Shipping:FlatFee", DefaultFlatFee);
        return (threshold, flat);
    }

    /// <summary>
    /// Phí ship cho một đơn: nhận tại cửa hàng → 0; tiền hàng sau giảm ≥ ngưỡng → 0; còn lại → phí phẳng.
    /// </summary>
    /// <param name="netSubtotal">Tiền hàng SAU giảm giá (đã gồm VAT).</param>
    /// <param name="isPickup">Khách nhận tại cửa hàng.</param>
    public static decimal Calculate(decimal netSubtotal, bool isPickup, IConfiguration? config = null)
    {
        if (isPickup) return 0m;

        var (threshold, flat) = Read(config);
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
