using Content.Domain;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Pricing;
using Sales.Domain;
using BuildingBlocks.Endpoints;

namespace Sales.Application.Checkout;

/// <summary>
/// Bước tính khuyến mãi + coupon của luồng chốt đơn.
///
/// Nguyên tắc (phase-21 bước 7): mọi khoản giảm được TÍNH LẠI từ đầu tại thời điểm chốt đơn,
/// KHÔNG đọc <c>Cart.DiscountAmount</c>. Snapshot của giỏ có thể đã cũ hàng giờ — coupon hết hạn,
/// hết lượt, chương trình đã dừng — và nếu tin nó thì shop bán lỗ đúng bằng phần chênh.
///
/// Bộ đếm lượt dùng (<c>Coupon.UsedCount</c>, <c>Promotion.CurrentUsage</c>) được tăng NGAY TRONG
/// giao dịch chốt đơn, nên coupon giới hạn 1 lượt không thể bị hai request đồng thời dùng hai lần.
/// </summary>
internal static class CheckoutPricingStep
{
    public static async Task<CheckoutPricing> ApplyAsync(
        IPricingEngine pricingEngine,
        ContentDbContext contentDb,
        Cart cart,
        CheckoutRequest req,
        CancellationToken ct)
    {
        // D10 — kênh báo giá: giá đã chốt trên báo giá, KHÔNG áp khuyến mãi/coupon.
        if (req.Channel == CheckoutChannel.Quotation)
        {
            return new CheckoutPricing(
                OrderDiscount: 0m, ShippingDiscount: 0m,
                AppliedPromotionsJson: "[]", CouponCode: null,
                Gifts: Array.Empty<FreeGift>(), Error: null);
        }

        cart.ClearGiftItems();

        var customerContext = req.CustomerId.HasValue
            ? new CustomerContext(req.CustomerId.Value, CustomerGroup: null,
                PreviousOrderCount: 0, IsFirstOrder: false)
            : null;

        var codes = (req.PromotionCodes ?? Array.Empty<string>())
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim().ToUpperInvariant())
            .Distinct()
            .ToArray();

        var pricing = await pricingEngine.CalculateAsync(cart, customerContext, codes, ct);
        var discount = pricing.OrderDiscount + pricing.LineDiscountTotal;
        var shippingDiscount = pricing.ShippingDiscount;
        string? couponCode = null;

        // Coupon rời (bảng Coupons cũ) — validate lại theo tạm tính THẬT của đơn.
        var subtotal = cart.Items.Where(i => !i.IsGift).Sum(i => i.Subtotal);
        foreach (var code in codes)
        {
            var result = await CouponValidator.ValidateAsync(contentDb, code, subtotal, ct);
            if (result.Coupon == null) continue;

            if (!result.Success)
                return CheckoutPricing.Failed(result.ErrorMessage ?? "Mã giảm giá không hợp lệ");

            discount += result.DiscountAmount;
            couponCode = result.Coupon.Code;
            // Tăng lượt dùng NGAY trong giao dịch — rollback sẽ tự trả lại lượt.
            result.Coupon.Apply();
        }

        // Tăng lượt dùng của các Promotion đã áp (cùng giao dịch).
        var appliedIds = pricing.AppliedPromotions.Select(p => p.PromotionId).ToList();
        if (appliedIds.Count > 0)
        {
            var promotions = await contentDb.Promotions
                .Where(p => appliedIds.Contains(p.Id))
                .ToListAsync(ct);
            foreach (var promotion in promotions)
            {
                try
                {
                    promotion.IncrementUsage();
                }
                catch (InvalidOperationException ex)
                {
                    return CheckoutPricing.Failed(ClientSafeError.Message(ex));
                }
            }
        }

        // Giảm giá tay ở quầy — cộng sau cùng, bị cap ở tạm tính bởi DiscountAllocator (D01 §3.2).
        if (req.Channel == CheckoutChannel.Pos && req.ManualDiscount is > 0m)
        {
            discount += req.ManualDiscount.Value;
        }

        return new CheckoutPricing(
            OrderDiscount: discount,
            ShippingDiscount: shippingDiscount,
            AppliedPromotionsJson: System.Text.Json.JsonSerializer.Serialize(pricing.AppliedPromotions),
            CouponCode: couponCode,
            Gifts: pricing.FreeGifts,
            Error: null);
    }
}

/// <summary>Kết quả bước tính giảm giá của luồng chốt đơn.</summary>
internal sealed record CheckoutPricing(
    decimal OrderDiscount,
    decimal ShippingDiscount,
    string AppliedPromotionsJson,
    string? CouponCode,
    IReadOnlyList<FreeGift> Gifts,
    string? Error)
{
    public static CheckoutPricing Failed(string error)
        => new(0m, 0m, "[]", null, Array.Empty<FreeGift>(), error);
}
