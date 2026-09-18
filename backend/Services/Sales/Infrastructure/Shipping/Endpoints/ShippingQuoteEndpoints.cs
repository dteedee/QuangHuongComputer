using BuildingBlocks.Configuration;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Sales.Infrastructure.Shipping.FeeCalculation;

namespace Sales.Infrastructure.Shipping.Endpoints;

/// <summary>
/// <c>POST /api/sales/shipping/quote</c> — NGUỒN DUY NHẤT phí ship phía server (phase-49 bước 1).
/// Client KHÔNG được gửi phí ship; luôn gửi <c>netSubtotal</c> (tiền hàng sau giảm, server-computed)
/// và server tính lại từ <see cref="IShippingFeeCalculator"/>.
///
/// <see cref="IShippingFeeCalculator"/> dựng trực tiếp từ <see cref="IAppSettings"/>/<see cref="IConfiguration"/>
/// (đã có sẵn qua DI toàn cục) thay vì đăng ký DI riêng — <c>Sales/DependencyInjection.cs</c> nằm
/// ngoài ownership glob của track này. Xem ghi chú tương tự ở <c>ShippingAddressEndpoints</c>.
/// </summary>
internal static class ShippingQuoteEndpoints
{
    public static void Map(RouteGroupBuilder group)
    {
        group.MapPost("/quote", async (
            ShippingQuoteRequest req, IAppSettings settings, IConfiguration config,
            ILoggerFactory lf, CancellationToken ct) =>
        {
            var calculator = new ShippingFeeCalculator(settings, config, lf.CreateLogger<ShippingFeeCalculator>());
            var quote = await calculator.QuoteAsync(new ShippingFeeQuoteRequest(
                NetSubtotal: req.NetSubtotal < 0 ? 0 : req.NetSubtotal,
                IsPickup: req.IsPickup,
                ProvinceCode: req.ProvinceCode,
                WardCode: req.WardCode,
                WeightGrams: req.WeightGrams is > 0 ? req.WeightGrams.Value : 500), ct);

            return Results.Ok(new
            {
                fee = quote.Fee,
                isFreeShipping = quote.IsFreeShipping,
                source = quote.Source,
                estimatedDeliveryDays = quote.EstimatedDeliveryDays,
            });
        }).AllowAnonymous();
    }

    /// <summary>
    /// Compat shim cho route CŨ đã bị xoá <c>POST /api/shipping/calculate-fee</c> (adversarial
    /// verification W2-11, 2026-09-18). Frontend LIVE (<c>components/shipping-fee-calculator.tsx</c>,
    /// gắn trong <c>checkout/shipping-address-form.tsx</c>) vẫn gọi route này — xoá thẳng khiến màn
    /// hình checkout đang chạy trên :5174 của owner hiện lỗi amber "Không thể tính phí vận chuyển"
    /// cho MỌI khách. FE đó còn dùng model 3 cấp quận/huyện cũ (<c>toDistrictId</c>) nên KHÔNG map
    /// được sang mã xã/phường 2025 hai cấp — trả phí phẳng/free-threshold từ
    /// <see cref="IShippingFeeCalculator"/> mà bỏ qua district/ward (không đoán mapping GHN, D12 §7),
    /// coi <c>netSubtotal = 0</c> nên fee thực tế trả về LUÔN là <c>Shipping:FlatFee</c> (không tính
    /// được miễn phí theo ngưỡng vì route cũ không gửi giá trị đơn hàng). Chỉ để tránh banner lỗi
    /// trên trang đang phục vụ khách thật; W3-2 phải thay hẳn component này bằng
    /// <c>POST /quote</c> + chọn tỉnh/xã hai cấp thật (IR#44, cập nhật ghi chú trong
    /// integration-requests-w2.md).
    /// </summary>
    public static void MapLegacyCalculateFee(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/shipping/calculate-fee", async (
            LegacyShippingFeeRequest req, IAppSettings settings, IConfiguration config,
            ILoggerFactory lf, CancellationToken ct) =>
        {
            var calculator = new ShippingFeeCalculator(settings, config, lf.CreateLogger<ShippingFeeCalculator>());
            var quote = await calculator.QuoteAsync(new ShippingFeeQuoteRequest(
                NetSubtotal: 0,
                IsPickup: false,
                WeightGrams: req.Weight > 0 ? req.Weight : 500), ct);

            return Results.Ok(new { fee = quote.Fee, expectedDeliveryDays = quote.EstimatedDeliveryDays ?? "2-4 ngày" });
        }).AllowAnonymous();
    }
}

public record ShippingQuoteRequest(
    decimal NetSubtotal,
    bool IsPickup = false,
    string? ProvinceCode = null,
    string? WardCode = null,
    int? WeightGrams = null);

/// <summary>Shape cũ trước W2-11 (giữ nguyên tên field JSON để FE cũ không cần đổi gì).</summary>
public record LegacyShippingFeeRequest(int ToDistrictId, string ToWardCode, int Weight = 500);
