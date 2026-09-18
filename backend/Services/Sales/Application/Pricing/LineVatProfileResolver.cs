using BuildingBlocks.SharedKernel;
using BuildingBlocks.TaxEngine;
using BuildingBlocks.Time;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Sales.Application.Pricing;

/// <summary>
/// D01 §2 — trả lời "dòng hàng này chịu thuế suất bao nhiêu, vào ngày nào", cho cả một giỏ/đơn
/// trong MỘT lần truy vấn.
///
/// Nguồn thuế suất LUẬT ĐỊNH là <c>Categories.VatRate</c> + <c>Categories.VatReductionEligible</c>,
/// join qua <c>Products.CategoryId</c> (khoá ngoại đơn, không có bảng nhiều-nhiều → join xác định).
/// Mức giảm tạm thời KHÔNG lấy từ dữ liệu sản phẩm mà từ cửa sổ giảm thuế trong SystemConfig,
/// và được áp bằng hàm thuần <see cref="VatRateResolver.Resolve(decimal, bool, DateOnly, VatReductionWindow)"/>.
///
/// Ngày so sánh là <c>IBusinessClock.TodayVn</c>, KHÔNG phải <c>DateTime.UtcNow</c>: một đơn đặt
/// lúc 23:30 đêm 31/12 giờ VN vẫn là ngày 31/12, còn UTC đã sang hôm sau — lệch đúng một ngày
/// hiệu lực thuế suất.
/// </summary>
public class LineVatProfileResolver
{
    private readonly CatalogDbContext _catalogDb;
    private readonly ITaxSettingsProvider _taxSettings;
    private readonly IBusinessClock _clock;
    private readonly ILogger<LineVatProfileResolver> _logger;

    public LineVatProfileResolver(
        CatalogDbContext catalogDb,
        ITaxSettingsProvider taxSettings,
        IBusinessClock clock,
        ILogger<LineVatProfileResolver> logger)
    {
        _catalogDb = catalogDb;
        _taxSettings = taxSettings;
        _clock = clock;
        _logger = logger;
    }

    /// <summary>
    /// Giải hồ sơ thuế cho một tập sản phẩm tại một ngày giao dịch.
    /// Sản phẩm không tra được danh mục rơi về mức chuẩn luật định + được giảm (giống 14 danh mục
    /// hiện có), và được ghi log — im lặng tính sai thuế nguy hiểm hơn nhiều so với một dòng log.
    /// </summary>
    public async Task<VatProfileSet> ResolveAsync(
        IReadOnlyCollection<Guid> productIds,
        DateOnly? businessDateVn = null,
        CancellationToken ct = default)
    {
        var date = businessDateVn ?? _clock.TodayVn;

        TaxSettings? settings = null;
        try
        {
            settings = await _taxSettings.GetAsync(ct);
        }
        catch (Exception ex)
        {
            // Cấu hình hỏng KHÔNG được làm hỏng phép tính tiền — rơi về hằng số luật định.
            _logger.LogWarning(ex, "Không đọc được TaxSettings, dùng cửa sổ giảm thuế luật định");
        }

        var window = VatReductionWindow.FromSettings(settings, out var problems);
        foreach (var problem in problems)
            _logger.LogWarning("Cấu hình thuế: {Problem}", problem);

        var map = new Dictionary<Guid, VatProfile>();
        if (productIds.Count > 0)
        {
            var rows = await _catalogDb.Products
                .AsNoTracking()
                .Where(p => productIds.Contains(p.Id))
                .Join(_catalogDb.Categories.AsNoTracking(),
                    p => p.CategoryId,
                    c => c.Id,
                    (p, c) => new { p.Id, p.UnitName, c.VatRate, c.VatReductionEligible })
                .ToListAsync(ct);

            foreach (var row in rows)
            {
                var effective = VatRateResolver.Resolve(row.VatRate, row.VatReductionEligible, date, window);
                map[row.Id] = new VatProfile(row.VatRate, row.VatReductionEligible, effective, row.UnitName);
            }
        }

        var missing = productIds.Where(id => !map.ContainsKey(id)).ToList();
        if (missing.Count > 0)
        {
            _logger.LogWarning(
                "{Count} sản phẩm không tra được danh mục để lấy thuế suất, dùng mức chuẩn luật định: {Ids}",
                missing.Count, string.Join(",", missing.Take(10)));
        }

        var fallbackStatutory = window.StandardRate;
        var fallback = new VatProfile(
            fallbackStatutory,
            true,
            VatRateResolver.Resolve(fallbackStatutory, true, date, window),
            "Chiếc");

        return new VatProfileSet(map, fallback, date, window);
    }
}

/// <summary>Hồ sơ thuế của một dòng hàng tại một ngày.</summary>
/// <param name="StatutoryRate">Thuế suất luật định của danh mục (<c>Categories.VatRate</c>).</param>
/// <param name="ReductionEligible">Có thuộc diện giảm 2 điểm theo NQ 204/2025 không.</param>
/// <param name="EffectiveRate">Thuế suất áp dụng thực tế tại ngày giao dịch.</param>
/// <param name="UnitName">Đơn vị tính in trên hoá đơn.</param>
public readonly record struct VatProfile(
    decimal StatutoryRate,
    bool ReductionEligible,
    decimal EffectiveRate,
    string? UnitName);

/// <summary>Kết quả tra thuế suất cho cả giỏ/đơn, kèm ngày và cửa sổ giảm đã dùng.</summary>
public sealed record VatProfileSet(
    IReadOnlyDictionary<Guid, VatProfile> ByProduct,
    VatProfile Fallback,
    DateOnly BusinessDateVn,
    VatReductionWindow Window)
{
    public VatProfile For(Guid productId)
        => ByProduct.TryGetValue(productId, out var profile) ? profile : Fallback;

    /// <summary>Thuế suất của PHÍ VẬN CHUYỂN: nhóm chuẩn, thuộc diện được giảm (D01 §"Giả định").</summary>
    public decimal ShippingRate => VatRateResolver.Resolve(
        Window.StandardRate, reductionEligible: true, BusinessDateVn, Window);
}
