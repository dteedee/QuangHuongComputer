using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Pricing;
using Sales.Domain;

namespace Sales.Application.Quotations;

/// <summary>
/// Dựng danh sách <see cref="SalesQuotationLine"/> từ yêu cầu của client: giá mặc định lấy từ
/// Catalog tại thời điểm tạo/sửa báo giá (Requirements: "per-line editable unit prices").
/// KHÔNG liên quan tới <c>IOrderPriceSource</c> (seam đó chỉ phục vụ lúc CHUYỂN ĐỔI, đọc lại từ
/// CSDL để chống giả giá client — xem <see cref="QuotationOrderPriceSource"/>).
/// </summary>
internal static class QuotationLineFactory
{
    public static async Task<(List<SalesQuotationLine> Lines, string? Error)> BuildAsync(
        CatalogDbContext catalogDb,
        LineVatProfileResolver vatResolver,
        IReadOnlyList<CreateQuotationLineRequest> requests,
        Guid quotationId,
        DateOnly businessDateVn,
        CancellationToken ct)
    {
        if (requests.Count == 0) return (new List<SalesQuotationLine>(), "Báo giá phải có ít nhất một dòng");

        var productIds = requests.Select(r => r.ProductId).Distinct().ToList();
        var variantIds = requests.Where(r => r.VariantId.HasValue).Select(r => r.VariantId!.Value).Distinct().ToList();

        var products = await catalogDb.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Name, p.Sku, p.Price })
            .ToListAsync(ct);
        var productById = products.ToDictionary(p => p.Id, p => p);

        var variants = variantIds.Count == 0
            ? new List<(Guid Id, string Name, string Sku, decimal Price)>()
            : (await catalogDb.ProductVariants.AsNoTracking()
                .Where(v => variantIds.Contains(v.Id))
                .Select(v => new { v.Id, v.Name, v.Sku, v.Price })
                .ToListAsync(ct))
              .Select(v => (v.Id, v.Name, v.Sku, v.Price)).ToList();
        var variantById = variants.ToDictionary(v => v.Id, v => v);

        var vatProfiles = await vatResolver.ResolveAsync(productIds, businessDateVn, ct);

        var lines = new List<SalesQuotationLine>();
        var sequence = 0;
        foreach (var req in requests)
        {
            if (!productById.TryGetValue(req.ProductId, out var product))
                return (lines, $"Sản phẩm không tồn tại: {req.ProductId}");
            if (req.Quantity <= 0)
                return (lines, $"Số lượng dòng '{product.Name}' phải lớn hơn 0");
            if (req.LineDiscount < 0)
                return (lines, $"Giảm giá dòng '{product.Name}' không được âm");

            string? variantName = null, variantSku = null;
            var listPrice = product.Price;
            if (req.VariantId.HasValue)
            {
                if (!variantById.TryGetValue(req.VariantId.Value, out var variant))
                    return (lines, $"Biến thể không tồn tại: {req.VariantId}");
                variantName = variant.Name;
                variantSku = variant.Sku;
                if (variant.Price > 0m) listPrice = variant.Price;
            }

            var unitPrice = req.UnitPriceOverride ?? listPrice;
            if (unitPrice < 0)
                return (lines, $"Đơn giá dòng '{product.Name}' không được âm");
            if (req.LineDiscount > unitPrice * req.Quantity)
                return (lines, $"Giảm giá dòng '{product.Name}' vượt quá thành tiền");

            var profile = vatProfiles.For(req.ProductId);
            var productName = variantName is { Length: > 0 } ? $"{product.Name} ({variantName})" : product.Name;

            lines.Add(new SalesQuotationLine(
                quotationId: quotationId,
                sequence: ++sequence,
                productId: req.ProductId,
                variantId: req.VariantId,
                productName: productName,
                productSku: variantSku ?? product.Sku,
                unitName: profile.UnitName,
                quantity: req.Quantity,
                unitPrice: unitPrice,
                lineDiscount: req.LineDiscount,
                vatStatutoryRate: profile.StatutoryRate,
                vatReductionEligible: profile.ReductionEligible,
                vatRate: profile.EffectiveRate,
                notes: req.Notes));
        }

        return (lines, null);
    }

    /// <summary>Giá niêm yết hiện hành của mỗi dòng — dùng để tính mức giảm % cho hạn mức duyệt.</summary>
    public static async Task<IReadOnlyDictionary<(Guid ProductId, Guid? VariantId), decimal>> LoadListPricesAsync(
        CatalogDbContext catalogDb,
        IReadOnlyList<CreateQuotationLineRequest> requests,
        CancellationToken ct)
    {
        var productIds = requests.Select(r => r.ProductId).Distinct().ToList();
        var variantIds = requests.Where(r => r.VariantId.HasValue).Select(r => r.VariantId!.Value).Distinct().ToList();

        var productPrices = await catalogDb.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Id)).Select(p => new { p.Id, p.Price }).ToListAsync(ct);
        var variantPrices = variantIds.Count == 0
            ? new()
            : await catalogDb.ProductVariants.AsNoTracking()
                .Where(v => variantIds.Contains(v.Id)).Select(v => new { v.Id, v.Price }).ToListAsync(ct);

        var productMap = productPrices.ToDictionary(p => p.Id, p => p.Price);
        var variantMap = variantPrices.Where(v => v.Price > 0m).ToDictionary(v => v.Id, v => v.Price);

        var result = new Dictionary<(Guid, Guid?), decimal>();
        foreach (var req in requests)
        {
            var price = req.VariantId.HasValue && variantMap.TryGetValue(req.VariantId.Value, out var vp)
                ? vp
                : productMap.GetValueOrDefault(req.ProductId);
            result[(req.ProductId, req.VariantId)] = price;
        }
        return result;
    }
}
