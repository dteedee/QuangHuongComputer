using Catalog.Infrastructure;
using Content.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Pricing;
using Sales.Domain;

namespace Sales.Endpoints.Checkout;

/// <summary>
/// POST /api/promotions/evaluate — xem trước khuyến mãi cho giỏ CHƯA đặt (CheckoutPage bước 2).
/// Trích nguyên văn từ CheckoutEndpoints.cs bởi W2-3; dùng chung IPricingEngine với lúc chốt đơn
/// để preview và số tiền thật không lệch nhau.
/// </summary>
internal static class PromotionPreviewEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        // Khách vãng lai cũng phải xem được ưu đãi -> công khai tường minh.
        // W4-5: warnings trả về tiết lộ mã coupon nào có thật, và mỗi lần gọi chạy cả PricingEngine
        // lẫn CouponValidator trên DB -> vừa là oracle dò mã vừa là đòn bẩy DoS. Rate limit "lookup".
        app.MapPost("/api/promotions/evaluate", EvaluatePromotionsAsync)
            .AllowAnonymous()
            .RequireRateLimiting("lookup");
    }

    /// <summary>
    /// Tính trước khuyến mãi (tự động + mã nhập tay) cho giỏ hàng CHƯA đặt — dùng ở CheckoutPage bước 2.
    /// Xây Cart tạm (không lưu DB) từ items request, tái dùng IPricingEngine — cùng công thức với lúc
    /// đặt hàng thật (CheckoutOrchestrator) để tránh preview khác số tiền lúc submit.
    /// LƯU Ý: promotionCode ở đây là mã Content.Promotions (tự động/nhập tay theo Priority/Exclusive),
    /// KHÁC với Coupon Content.Coupons dùng ở /cart/apply-coupon và CheckoutDto.CouponCode (hệ cũ).
    /// </summary>
    private static async Task<IResult> EvaluatePromotionsAsync(
        EvaluatePromotionRequestDto model,
        IPricingEngine pricingEngine,
        CatalogDbContext catalogDb,
        ContentDbContext contentDb,
        CancellationToken ct)
    {
        if (model.Items == null || model.Items.Count == 0)
            return Results.Ok(new
            {
                Subtotal = 0m,
                DiscountTotal = 0m,
                ShippingDiscount = 0m,
                FinalTotal = 0m,
                AppliedPromotions = Array.Empty<object>(),
                FreeGifts = Array.Empty<object>(),
                Warnings = Array.Empty<string>()
            });

        // Cart tạm — không SaveChanges, chỉ dùng làm input cho PricingEngine.
        var tempCart = new Cart(model.CustomerId ?? Guid.Empty);
        foreach (var item in model.Items)
        {
            if (item.Quantity <= 0) continue;
            tempCart.AddItem(item.ProductId, productName: string.Empty, item.UnitPrice, item.Quantity,
                item.VariantId, variantName: null, variantSku: null);
        }
        tempCart.SetShippingAmount(Math.Max(0, model.ShippingAmount ?? 0));

        var customerContext = model.CustomerId.HasValue
            ? new CustomerContext(model.CustomerId.Value, CustomerGroup: null, PreviousOrderCount: 0, IsFirstOrder: false)
            : null;
        var manualCodes = string.IsNullOrWhiteSpace(model.CouponCode)
            ? Array.Empty<string>()
            : new[] { model.CouponCode.Trim() };

        var pricing = await pricingEngine.CalculateAsync(tempCart, customerContext, manualCodes, ct);

        // Nguồn áp thật khi đặt hàng là Content.Coupons (xem /sales/checkout), KHÁC hệ Content.Promotions
        // ở trên. Preview phải phản ánh CẢ HAI để không lệch số với lúc submit thật.
        decimal couponDiscount = 0m;
        Content.Domain.Coupon? matchedCoupon = null;
        var warnings = new List<string>();
        if (!string.IsNullOrWhiteSpace(model.CouponCode))
        {
            var couponResult = await CouponValidator.ValidateAsync(contentDb, model.CouponCode, pricing.Subtotal, ct);
            if (couponResult.Success)
            {
                couponDiscount = couponResult.DiscountAmount;
                matchedCoupon = couponResult.Coupon;
            }
            else if (couponResult.ErrorMessage != null)
            {
                warnings.Add(couponResult.ErrorMessage);
            }
        }

        // Lookup tên/ảnh sản phẩm tặng (PricingResult.FreeGifts chỉ có Id/Quantity).
        var giftIds = pricing.FreeGifts.Select(g => g.ProductId).Distinct().ToList();
        var giftProducts = giftIds.Count == 0
            ? new List<(Guid Id, string Name, string? ImageUrl)>()
            : (await catalogDb.Products.AsNoTracking()
                .Where(p => giftIds.Contains(p.Id))
                .Select(p => new { p.Id, p.Name, p.ImageUrl })
                .ToListAsync(ct))
                .Select(p => (p.Id, p.Name, p.ImageUrl))
                .ToList();

        var codesUpper = manualCodes.Select(c => c.ToUpperInvariant()).ToHashSet();

        var appliedPromotions = pricing.AppliedPromotions.Select(p => new
        {
            Id = p.PromotionId,
            p.Code,
            p.Name,
            p.DiscountType,
            p.DiscountAmount,
            LineProductId = p.AppliesTo.StartsWith("Line:") ? p.AppliesTo["Line:".Length..] : null,
            IsAutomatic = !codesUpper.Contains(p.Code.ToUpperInvariant())
        }).ToList<object>();

        if (matchedCoupon != null && couponDiscount > 0)
        {
            appliedPromotions.Add(new
            {
                Id = matchedCoupon.Id,
                Code = matchedCoupon.Code,
                Name = matchedCoupon.Description,
                DiscountType = matchedCoupon.DiscountType.ToString(),
                DiscountAmount = couponDiscount,
                LineProductId = (string?)null,
                IsAutomatic = false
            });
        }

        var discountTotal = pricing.TotalDiscount + couponDiscount;
        var finalTotal = Math.Max(0, pricing.Total - couponDiscount);

        return Results.Ok(new
        {
            pricing.Subtotal,
            DiscountTotal = discountTotal,
            pricing.ShippingDiscount,
            FinalTotal = finalTotal,
            AppliedPromotions = appliedPromotions,
            FreeGifts = pricing.FreeGifts.Select(g =>
            {
                var product = giftProducts.FirstOrDefault(p => p.Id == g.ProductId);
                return new
                {
                    g.ProductId,
                    ProductName = product.Name ?? "Quà tặng",
                    g.Quantity,
                    ImageUrl = product.ImageUrl
                };
            }),
            Warnings = warnings
        });
    }
}
