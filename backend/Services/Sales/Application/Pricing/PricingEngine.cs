using BuildingBlocks.SharedKernel;
using Catalog.Infrastructure;
using Content.Domain;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;

namespace Sales.Application.Pricing;

/// <summary>
/// Động cơ tính giá thật (Phase 04-A) — thay <c>StubPricingEngine</c>.
/// - Lấy tất cả Promotion Active + IsAutomatic OR Code khớp appliedCodes.
/// - Sắp theo Priority DESC.
/// - Áp lần lượt (dừng nếu gặp IsExclusive áp thành công).
/// - Thứ tự công thức: subtotal → order/line discount → tax(subtotal-discount) → ship − shipDiscount.
/// KHÔNG mutate Cart — caller (CheckoutOrchestrator) tự áp FreeGifts qua Cart.AddGiftItem().
/// </summary>
public class PricingEngine : IPricingEngine
{
    private readonly ContentDbContext _contentDb;
    private readonly CatalogDbContext _catalogDb;
    private readonly PromotionEvaluator _evaluator;

    public PricingEngine(
        ContentDbContext contentDb,
        CatalogDbContext catalogDb,
        PromotionEvaluator evaluator)
    {
        _contentDb = contentDb;
        _catalogDb = catalogDb;
        _evaluator = evaluator;
    }

    public async Task<PricingResult> CalculateAsync(
        Cart cart,
        CustomerContext? customerContext,
        IReadOnlyCollection<string>? appliedCodes,
        CancellationToken ct = default)
    {
        var customer = customerContext ?? new CustomerContext(
            CustomerId: cart.CustomerId,
            CustomerGroup: null,
            PreviousOrderCount: 0,
            IsFirstOrder: false);

        var lines = await BuildLineSnapshotsAsync(cart, ct);
        var ctx = new PricingContext(lines, customer);
        var subtotal = ctx.Subtotal;
        var shippingFee = cart.ShippingAmount;
        var taxRate = cart.TaxRate;
        var codes = (appliedCodes ?? Array.Empty<string>())
            .Select(c => c.Trim().ToUpperInvariant())
            .ToHashSet();

        if (lines.Count == 0)
            return BuildResult(subtotal, 0, 0, 0, taxRate, shippingFee,
                Array.Empty<FreeGift>(), Array.Empty<AppliedPromotion>());

        var promotions = await LoadCandidatePromotionsAsync(ctx.EvaluatedAt, codes, ct);

        var applied = new List<AppliedPromotion>();
        var allGifts = new List<FreeGift>();
        decimal lineDiscountTotal = 0m;
        decimal orderDiscount = 0m;
        decimal shippingDiscount = 0m;

        foreach (var promo in promotions.OrderByDescending(p => p.Priority))
        {
            var eval = _evaluator.Evaluate(promo, ctx);
            if (!eval.IsApplicable) continue;

            lineDiscountTotal += eval.LineDiscountAmount + eval.LineBreakdown.Sum(l => l.Amount);
            orderDiscount += eval.OrderDiscountAmount;
            shippingDiscount += eval.ShippingDiscountAmount;
            allGifts.AddRange(eval.FreeGifts);

            applied.Add(new AppliedPromotion(
                PromotionId: promo.Id,
                Code: promo.Code ?? string.Empty,
                Name: promo.Name,
                DiscountType: promo.DiscountType.ToString(),
                DiscountAmount: eval.TotalDiscount,
                AppliesTo: DescribeApplication(promo)));

            if (promo.IsExclusive) break;
        }

        // Clamp shipping discount ≤ shippingFee.
        var effectiveShipDiscount = Math.Min(shippingDiscount, shippingFee);

        return BuildResult(subtotal, lineDiscountTotal, orderDiscount, effectiveShipDiscount,
            taxRate, shippingFee, allGifts, applied);
    }

    private static PricingResult BuildResult(
        decimal subtotal,
        decimal lineDiscountTotal,
        decimal orderDiscount,
        decimal shippingDiscount,
        decimal taxRate,
        decimal shippingFee,
        IReadOnlyList<FreeGift> gifts,
        IReadOnlyList<AppliedPromotion> applied)
    {
        var discountedSubtotal = subtotal - orderDiscount - lineDiscountTotal;
        if (discountedSubtotal < 0) discountedSubtotal = 0;
        var tax = decimal.Round(discountedSubtotal * taxRate, 2);
        var total = discountedSubtotal + tax + (shippingFee - shippingDiscount);

        return new PricingResult(
            Subtotal: subtotal,
            LineDiscountTotal: lineDiscountTotal,
            OrderDiscount: orderDiscount,
            ShippingDiscount: shippingDiscount,
            FreeGifts: gifts,
            AppliedPromotions: applied,
            TaxAmount: tax,
            ShippingFee: shippingFee,
            Total: total);
    }

    private static string DescribeApplication(Promotion p) => p.DiscountType switch
    {
        PromotionDiscountType.FreeShip => "Shipping",
        PromotionDiscountType.BuyXGetY => "Gift",
        _ => "Order",
    };

    /// <summary>
    /// Xây snapshot line với CategoryId/BrandId lookup từ Catalog để rule evaluate được.
    /// Bỏ qua dòng gift để không tính vào subtotal (giá đã 0 rồi nhưng vẫn loại tường minh).
    /// </summary>
    private async Task<IReadOnlyList<CartLineSnapshot>> BuildLineSnapshotsAsync(
        Cart cart,
        CancellationToken ct)
    {
        if (cart.Items.Count == 0) return Array.Empty<CartLineSnapshot>();

        var productIds = cart.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _catalogDb.Products
            .AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.CategoryId, p.BrandId })
            .ToListAsync(ct);
        var productMap = products.ToDictionary(p => p.Id, p => (p.CategoryId, p.BrandId));

        var result = new List<CartLineSnapshot>(cart.Items.Count);
        foreach (var item in cart.Items)
        {
            productMap.TryGetValue(item.ProductId, out var meta);
            result.Add(new CartLineSnapshot(
                ProductId: item.ProductId,
                VariantId: item.VariantId,
                ProductName: item.ProductName,
                UnitPrice: item.Price,
                Quantity: item.Quantity,
                CategoryId: meta.CategoryId == default ? null : meta.CategoryId,
                BrandId: meta.BrandId == default ? null : meta.BrandId,
                IsGift: item.IsGift));
        }
        return result;
    }

    private async Task<List<Promotion>> LoadCandidatePromotionsAsync(
        DateTime now,
        HashSet<string> codes,
        CancellationToken ct)
    {
        var query = _contentDb.Promotions
            .Include(p => p.Conditions)
            .Include(p => p.Rewards)
            .Where(p => p.Status == PromotionStatus.Active
                && p.StartAt <= now
                && (p.EndAt == null || p.EndAt >= now))
            .Where(p => p.IsAutomatic || (p.Code != null && codes.Contains(p.Code)));

        return await query.ToListAsync(ct);
    }
}
