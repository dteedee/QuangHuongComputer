using BuildingBlocks.Database;
using BuildingBlocks.SharedKernel;
using BuildingBlocks.TaxEngine;
using BuildingBlocks.Time;
using Catalog.Application.PriceHistory;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.BulkOps;

/// <summary>
/// Implementation Steps #6. VAT-aware formulas per Key Insights: "selling prices include VAT and
/// costs exclude it, so pricing from cost must multiply by (1 + rate) and the below-cost guard must
/// compare price / (1 + rate) with the cost". The rate is resolved per product's OWN category
/// (`VatRateResolver`, D01) - a mixed-category run can therefore round two products to the same
/// 15% markup at different gross prices, which is correct, not a bug.
///
/// Cost source (Key Insights: "InventoryItem.AverageCost when above zero, otherwise
/// Products.CostPrice"): this track only has `Products.CostPrice` - Catalog has no cross-module
/// contract to Inventory (api-conventions.md §9, "a module never references another module") and
/// none existed to reuse, so the AverageCost half is filed as an integration request instead of a
/// raw cross-context SQL read that would violate that rule. See track report.
/// </summary>
public sealed class BulkPriceChangeService
{
    public const int MaxProducts = 5_000;

    private readonly CatalogDbContext _db;
    private readonly PriceChangeContext _priceChangeContext;
    private readonly ITaxSettingsProvider _taxSettings;
    private readonly IBusinessClock _clock;

    public BulkPriceChangeService(
        CatalogDbContext db, PriceChangeContext priceChangeContext, ITaxSettingsProvider taxSettings, IBusinessClock clock)
    {
        _db = db;
        _priceChangeContext = priceChangeContext;
        _taxSettings = taxSettings;
        _clock = clock;
    }

    public async Task<BulkPriceChangeReport> PreviewAsync(BulkPriceChangeRequest request, CancellationToken ct)
        => await BuildAsync(request, apply: false, actorId: null, ct);

    public async Task<BulkPriceChangeReport> ApplyAsync(BulkPriceChangeRequest request, string? actorId, CancellationToken ct)
        => await BuildAsync(request, apply: true, actorId, ct);

    private async Task<BulkPriceChangeReport> BuildAsync(BulkPriceChangeRequest request, bool apply, string? actorId, CancellationToken ct)
    {
        var report = new BulkPriceChangeReport();
        if (request.Basis is not ("sellingPrice" or "cost"))
        {
            report.Error = "basis phải là 'sellingPrice' hoặc 'cost'.";
            return report;
        }
        if (request.AdjustmentType is not ("percent" or "amount"))
        {
            report.Error = "adjustmentType phải là 'percent' hoặc 'amount'.";
            return report;
        }

        var query = _db.Products.Include(p => p.Category).AsQueryable();
        if (request.CategoryId is not null) query = query.Where(p => p.CategoryId == request.CategoryId);
        if (request.BrandId is not null) query = query.Where(p => p.BrandId == request.BrandId);
        if (request.ProductIds is { Count: > 0 }) query = query.Where(p => request.ProductIds.Contains(p.Id));

        var products = await query.ToListAsync(ct);
        report.MatchedCount = products.Count;
        if (products.Count == 0) return report;
        if (products.Count > MaxProducts)
        {
            report.Error = $"Phạm vi khớp {products.Count} sản phẩm, vượt giới hạn {MaxProducts}/lần chạy. Hãy lọc hẹp hơn.";
            return report;
        }

        var window = VatReductionWindow.FromSettings(await _taxSettings.GetAsync(ct), out _);
        var today = _clock.TodayVn;

        foreach (var product in products)
        {
            var rate = VatRateResolver.Resolve(
                product.Category?.VatRate ?? TaxRates.VatStatutoryStandard,
                product.Category?.VatReductionEligible ?? true, today, window);

            var newPrice = ComputeNewPrice(product, request, rate);
            var newNet = rate <= 0m ? newPrice : VietnameseTaxEngine.ExtractVat(newPrice, rate).PriceBeforeVat;
            var belowCost = newNet < product.CostPrice;
            if (belowCost) report.BelowCostBlockedCount++;

            report.Lines.Add(new BulkPriceChangeLine(product.Id, product.Sku, product.Name, product.Price, newPrice, product.CostPrice, newNet, belowCost));

            var blocked = belowCost && !request.AllowBelowCost;
            if (apply && !blocked)
            {
                product.UpdatePrice(newPrice);
                report.AppliedCount++;
            }
        }

        if (apply && report.AppliedCount > 0)
        {
            _priceChangeContext.Source = "BulkPrice";
            _priceChangeContext.ActorId = actorId;
            using var scope = AuditScope.Bulk("Đổi giá hàng loạt", null);
            await _db.SaveChangesAsync(ct);
        }

        return report;
    }

    /// <summary>Cost basis grosses up ((1+rate)) from `CostPrice` per Key Insights; selling-price
    /// basis works directly on the VAT-inclusive `Price`. Both round UP to the nearest 1.000đ
    /// (Requirements).</summary>
    private static decimal ComputeNewPrice(Product product, BulkPriceChangeRequest request, decimal rate)
    {
        var baseValue = request.Basis == "cost" ? product.CostPrice : product.Price;
        var adjusted = request.AdjustmentType == "percent"
            ? baseValue * (1 + request.Value / 100m)
            : baseValue + request.Value;

        var gross = request.Basis == "cost" ? adjusted * (1 + rate) : adjusted;
        return Math.Ceiling(gross / 1000m) * 1000m;
    }
}
