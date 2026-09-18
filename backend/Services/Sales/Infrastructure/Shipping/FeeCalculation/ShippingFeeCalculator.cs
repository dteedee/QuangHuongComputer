using BuildingBlocks.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Sales.Application.Pricing;

namespace Sales.Infrastructure.Shipping.FeeCalculation;

/// <summary>
/// Free trên ngưỡng, còn lại phí phẳng — đọc qua <see cref="IAppSettings"/> (bảng
/// <c>SystemConfig.Configurations</c>, sửa được từ trang admin, có cache 60s) thay vì
/// <see cref="IConfiguration"/> tĩnh. Đây LÀ khoảng trống D12/phase-49 chỉ ra: trước track này,
/// <c>Sales.Application.Pricing.ShippingFeePolicy</c> (W0-4, file KHÔNG thuộc ownership của track
/// này — <c>Application/Pricing/**</c> là của W2-3) đọc <c>IConfiguration</c>, nên sửa ngưỡng free-
/// ship ở màn hình admin không đổi gì lúc checkout. Track này KHÔNG sửa được file đó trực tiếp;
/// đã ghi integration request để W2-3 đổi <c>CheckoutOrchestrator</c> sang gọi
/// <see cref="IShippingFeeCalculator"/> này (endpoint <c>/api/sales/shipping/quote</c> đã dùng nó).
///
/// GHN fee API: CHỈ gọi khi <c>Shipping:GHN:Token</c> có cấu hình VÀ có province+ward — nhưng vì
/// GHN dùng district_id nội bộ riêng của họ (không phải mã hành chính 2025 hai cấp của nhà nước) và
/// không có sandbox credentials ở dev để verify mapping, bản này KHÔNG đoán một phép ánh xạ chưa
/// kiểm chứng (D12 §7: never fabricate). Best-effort hook để lại làm sẵn: nếu tương lai có bảng ánh
/// xạ ward-code -> GHN district_id thật, chỉ cần điền vào <see cref="TryGetLiveGhnFeeAsync"/>.
/// </summary>
public sealed class ShippingFeeCalculator : IShippingFeeCalculator
{
    private readonly IAppSettings _settings;
    private readonly IConfiguration _config;
    private readonly ILogger<ShippingFeeCalculator> _logger;

    public ShippingFeeCalculator(IAppSettings settings, IConfiguration config, ILogger<ShippingFeeCalculator> logger)
    {
        _settings = settings;
        _config = config;
        _logger = logger;
    }

    public async Task<ShippingFeeQuoteResult> QuoteAsync(ShippingFeeQuoteRequest request, CancellationToken ct = default)
    {
        if (request.IsPickup)
            return new ShippingFeeQuoteResult(0m, IsFreeShipping: true, Source: "pickup");

        var threshold = _settings.GetDecimal("Shipping:FreeThreshold", ShippingFeePolicy.DefaultFreeThreshold);
        var flat = _settings.GetDecimal("Shipping:FlatFee", ShippingFeePolicy.DefaultFlatFee);
        var netSubtotal = request.NetSubtotal < 0 ? 0m : request.NetSubtotal;

        if (netSubtotal >= threshold)
            return new ShippingFeeQuoteResult(0m, IsFreeShipping: true, Source: "free_threshold");

        var live = await TryGetLiveGhnFeeAsync(request, ct);
        if (live is not null)
            return new ShippingFeeQuoteResult(live.Value.Fee, IsFreeShipping: false, Source: "ghn_live", live.Value.EtaDays);

        return new ShippingFeeQuoteResult(flat, IsFreeShipping: false, Source: "flat");
    }

    /// <summary>
    /// Trả null bất cứ khi nào không thể lấy phí GHN thật — KHÔNG BAO GIỜ ném lỗi chặn quote/checkout
    /// vì GHN downtime hay chưa cấu hình. Hiện luôn trả null (xem ghi chú class) tới khi có bảng ánh
    /// xạ ward-code 2025 -> GHN district_id đã kiểm chứng.
    /// </summary>
    private Task<(decimal Fee, string? EtaDays)?> TryGetLiveGhnFeeAsync(ShippingFeeQuoteRequest request, CancellationToken ct)
    {
        var ghnToken = _config["Shipping:GHN:Token"];
        if (string.IsNullOrWhiteSpace(ghnToken))
        {
            return Task.FromResult<(decimal, string?)?>(null);
        }

        _logger.LogDebug(
            "GHN token đã cấu hình nhưng chưa có bảng ánh xạ mã xã/phường 2025 -> district_id GHN; " +
            "dùng phí phẳng thay vì đoán API GHN (province={Province}, ward={Ward}).",
            request.ProvinceCode, request.WardCode);
        return Task.FromResult<(decimal, string?)?>(null);
    }
}
