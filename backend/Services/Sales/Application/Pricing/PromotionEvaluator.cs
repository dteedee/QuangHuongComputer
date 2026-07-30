using System.Text.Json;
using Content.Domain;

namespace Sales.Application.Pricing;

/// <summary>
/// Đánh giá một promotion đơn lẻ trên giỏ hàng.
/// Kiểm tra điều kiện (rule) rồi tính số tiền giảm theo <see cref="PromotionDiscountType"/>.
/// KHÔNG tăng CurrentUsage — việc đó chỉ xảy ra khi đơn đã confirmed.
/// </summary>
public class PromotionEvaluator
{
    private readonly IReadOnlyDictionary<ConditionType, IPromotionRule> _rulesByType;

    public PromotionEvaluator(IEnumerable<IPromotionRule> rules)
    {
        _rulesByType = rules
            .GroupBy(r => r.HandledType)
            .ToDictionary(g => g.Key, g => g.First());
    }

    public PromotionEvaluationResult Evaluate(Promotion promotion, PricingContext ctx)
    {
        if (!promotion.IsRedeemable(ctx.EvaluatedAt))
            return PromotionEvaluationResult.NotApplicable("Promotion không khả dụng");

        // AudienceTag chỉ áp cho đúng nhóm (nếu có).
        if (!string.IsNullOrEmpty(promotion.AudienceTag)
            && !string.Equals(promotion.AudienceTag, ctx.Customer.CustomerGroup, StringComparison.OrdinalIgnoreCase))
            return PromotionEvaluationResult.NotApplicable("Không đúng nhóm khách");

        // Đánh giá từng điều kiện — tất cả phải TRUE (AND).
        foreach (var cond in promotion.Conditions)
        {
            if (!_rulesByType.TryGetValue(cond.Type, out var rule))
                return PromotionEvaluationResult.NotApplicable($"Chưa hỗ trợ rule {cond.Type}");
            if (!rule.Evaluate(cond, ctx))
                return PromotionEvaluationResult.NotApplicable($"Không thoả {cond.Type}");
        }

        return promotion.DiscountType switch
        {
            PromotionDiscountType.Percent => ApplyPercent(promotion, ctx),
            PromotionDiscountType.Fixed => ApplyFixed(promotion, ctx),
            PromotionDiscountType.FreeShip => ApplyFreeShip(promotion),
            PromotionDiscountType.BuyXGetY => ApplyBuyXGetY(promotion),
            PromotionDiscountType.Tiered => ApplyTiered(promotion, ctx),
            _ => PromotionEvaluationResult.NotApplicable("Unknown discount type"),
        };
    }

    private static PromotionEvaluationResult ApplyPercent(Promotion p, PricingContext ctx)
    {
        var raw = decimal.Round(ctx.Subtotal * (p.DiscountValue / 100m), 2);
        if (p.MaxDiscountAmount.HasValue && raw > p.MaxDiscountAmount.Value)
            raw = p.MaxDiscountAmount.Value;
        return Ok(raw, 0, 0);
    }

    private static PromotionEvaluationResult ApplyFixed(Promotion p, PricingContext ctx)
    {
        var amount = Math.Min(p.DiscountValue, ctx.Subtotal);
        return Ok(amount, 0, 0);
    }

    private static PromotionEvaluationResult ApplyFreeShip(Promotion p)
    {
        // ShippingDiscountAmount = trần giảm phí ship. Engine sẽ clamp bằng min(shippingFee, this).
        // DiscountValue <= 0 nghĩa freeship 100%.
        var shipCap = p.DiscountValue > 0 ? p.DiscountValue : decimal.MaxValue;
        return new PromotionEvaluationResult(
            true, 0, 0, shipCap,
            Array.Empty<LineDiscount>(),
            Array.Empty<FreeGift>(),
            null);
    }

    private static PromotionEvaluationResult ApplyBuyXGetY(Promotion p)
    {
        // Quà tặng gắn trong Rewards. Sinh FreeGift, KHÔNG trừ subtotal trực tiếp.
        // FreeGift.ProductId phải có (không thể tặng "ẩn danh").
        var gifts = p.Rewards
            .Where(r => r.ProductId.HasValue)
            .Select(r => new FreeGift(
                r.ProductId!.Value,
                r.VariantId,
                r.Quantity,
                p.Code ?? p.Name))
            .ToList();
        if (gifts.Count == 0)
            return PromotionEvaluationResult.NotApplicable("BuyXGetY nhưng chưa cấu hình Rewards có ProductId");
        return new PromotionEvaluationResult(
            true, 0, 0, 0,
            Array.Empty<LineDiscount>(),
            gifts,
            null);
    }

    /// <summary>
    /// Tiered — bậc thang cấu hình trong Description dưới dạng JSON để không đổi schema:
    /// [{"minQty":1,"percent":0},{"minQty":3,"percent":5},{"minQty":5,"percent":10}]
    /// Đơn giản hoá vòng đời Phase 04-A; sau này tách bảng riêng nếu số tier lớn.
    /// </summary>
    private static PromotionEvaluationResult ApplyTiered(Promotion p, PricingContext ctx)
    {
        var tiers = ParseTiers(p.Description);
        if (tiers.Count == 0)
            return PromotionEvaluationResult.NotApplicable("Tiered nhưng chưa cấu hình bậc");

        var totalQty = ctx.Lines.Where(l => !l.IsGift).Sum(l => l.Quantity);
        var applicable = tiers
            .Where(t => t.MinQty <= totalQty)
            .OrderByDescending(t => t.MinQty)
            .FirstOrDefault();
        if (applicable is null || applicable.Percent <= 0)
            return PromotionEvaluationResult.NotApplicable("Chưa đạt bậc tối thiểu");

        var raw = decimal.Round(ctx.Subtotal * (applicable.Percent / 100m), 2);
        if (p.MaxDiscountAmount.HasValue && raw > p.MaxDiscountAmount.Value)
            raw = p.MaxDiscountAmount.Value;
        return Ok(raw, 0, 0);
    }

    private static PromotionEvaluationResult Ok(decimal orderDiscount, decimal lineDiscount, decimal shipDiscount) =>
        new(true, lineDiscount, orderDiscount, shipDiscount,
            Array.Empty<LineDiscount>(),
            Array.Empty<FreeGift>(),
            null);

    private record TierEntry(int MinQty, decimal Percent);

    private static List<TierEntry> ParseTiers(string? json)
    {
        var list = new List<TierEntry>();
        if (string.IsNullOrWhiteSpace(json)) return list;
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return list;
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                if (el.TryGetProperty("minQty", out var q) && el.TryGetProperty("percent", out var pct))
                    list.Add(new TierEntry(q.GetInt32(), pct.GetDecimal()));
            }
        }
        catch (JsonException) { }
        return list;
    }
}
