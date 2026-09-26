using BuildingBlocks.Configuration;
using BuildingBlocks.TaxEngine;
using BuildingBlocks.Time;
using Microsoft.Extensions.Logging;

namespace Repair.Application.Quotes;

/// <summary>
/// Thuế suất GTGT áp cho báo giá sửa chữa tại ngày lập (giờ VN). Sửa chữa (kể cả linh kiện thay
/// kèm) là MỘT dịch vụ ⇒ một thuế suất cho cả phiếu: mức chuẩn luật định trong SystemConfig, giảm
/// theo cửa sổ NQ 204/2025 khi <c>Repair.VatReductionEligible</c> = true (mặc định true — chủ cửa
/// hàng xác nhận lại với kế toán; tắt được mà không deploy). Cấu hình hỏng ⇒ hằng số luật định.
/// </summary>
public sealed class RepairVatRateProvider
{
    public const string ReductionEligibleKey = "Repair.VatReductionEligible";

    private readonly ITaxSettingsProvider? _taxSettings;
    private readonly IAppSettings _settings;
    private readonly IBusinessClock _clock;
    private readonly ILogger<RepairVatRateProvider> _logger;

    public RepairVatRateProvider(IAppSettings settings, IBusinessClock clock, ILogger<RepairVatRateProvider> logger,
        ITaxSettingsProvider? taxSettings = null)
    {
        _settings = settings;
        _clock = clock;
        _logger = logger;
        _taxSettings = taxSettings;
    }

    public async Task<decimal> CurrentRateAsync(CancellationToken ct = default)
    {
        var window = VatReductionWindow.Legal;
        if (_taxSettings is not null)
        {
            try { window = VatReductionWindow.FromSettings(await _taxSettings.GetAsync(ct), out _); }
            catch (Exception ex) { _logger.LogWarning(ex, "Không đọc được cấu hình thuế GTGT — dùng hằng số luật định."); }
        }

        var eligible = _settings.GetBool(ReductionEligibleKey, true);
        return VatRateResolver.Resolve(window.StandardRate, eligible, _clock.TodayVn, window);
    }
}
