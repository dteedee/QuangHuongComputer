using Content.Domain;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Sales.Application.Pricing;

/// <summary>
/// NGUỒN DUY NHẤT để validate + tính giảm giá coupon (Content.Coupons) — dùng ở MỌI nơi cần áp coupon:
/// /sales/cart/apply-coupon, guest checkout, authenticated checkout, và preview /api/promotions/evaluate.
/// Trước đây mỗi nơi tự viết logic riêng (guest/apply-coupon đúng, checkout xác thực có fallback giả %
/// hardcode, evaluate hoàn toàn không biết Coupon tồn tại) → preview và giá lúc đặt hàng lệch nhau.
/// </summary>
public static class CouponValidator
{
    public record Result(bool Success, decimal DiscountAmount, Coupon? Coupon, string? ErrorMessage);

    /// <summary>Tra + validate coupon theo subtotal. KHÔNG tăng UsedCount — caller tự gọi Coupon.Apply() khi chốt đơn thật.</summary>
    public static async Task<Result> ValidateAsync(
        ContentDbContext contentDb,
        string? couponCode,
        decimal subtotal,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(couponCode))
            return new Result(false, 0, null, null);

        var code = couponCode.Trim().ToUpperInvariant();
        var coupon = await contentDb.Coupons.FirstOrDefaultAsync(c => c.Code == code, ct);

        if (coupon == null)
            return new Result(false, 0, null, "Mã giảm giá không tồn tại");

        if (!coupon.IsValid(subtotal))
        {
            var error = !coupon.IsActive ? "Mã giảm giá không còn hiệu lực"
                : DateTime.UtcNow > coupon.ValidTo ? "Mã giảm giá đã hết hạn"
                : coupon.UsageLimit.HasValue && coupon.UsedCount >= coupon.UsageLimit ? "Mã giảm giá đã hết lượt sử dụng"
                : subtotal < coupon.MinOrderAmount ? $"Đơn hàng tối thiểu {coupon.MinOrderAmount:N0}đ để sử dụng mã này"
                : "Mã giảm giá không hợp lệ";
            return new Result(false, 0, coupon, error);
        }

        var discountAmount = coupon.CalculateDiscount(subtotal);
        return new Result(true, discountAmount, coupon, null);
    }
}
