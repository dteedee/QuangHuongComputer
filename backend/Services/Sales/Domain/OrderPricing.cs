using Sales.Application.Pricing;

namespace Sales.Domain;

/// <summary>
/// Phần TIỀN của <see cref="Order"/> — tính lại tổng, tách VAT theo dòng, áp khuyến mãi/coupon.
///
/// Tách khỏi <c>Order.cs</c> (định danh + trạng thái) vì đây là phần bị soi kỹ nhất: mọi thay đổi
/// ở đây đổi số tiền khách trả, và mọi thay đổi ở đây phải đi kèm golden vector của D01 §3.
/// </summary>
public partial class Order
{
    /// <summary>
    /// D01 §3 — tính lại toàn bộ tiền/thuế của đơn qua <see cref="OrderTotalsCalculator"/>
    /// (kernel dùng chung của W1-15). Thuế suất lấy THEO DÒNG; dòng chưa có hồ sơ thuế riêng
    /// rơi về <see cref="TaxRate"/> để đơn cũ và test hiện có không đổi kết quả.
    /// </summary>
    private void CalculateAmounts()
    {
        var inputs = new List<TotalsLineInput>(Items.Count);
        for (var i = 0; i < Items.Count; i++)
        {
            var item = Items[i];
            item.SetSequence(i + 1);
            inputs.Add(new TotalsLineInput(
                Sequence: item.Sequence,
                UnitPriceIncludingVat: item.UnitPrice,
                Quantity: item.Quantity,
                LineDiscount: item.LineDiscount,
                VatRate: item.VatRate > 0m ? item.VatRate : TaxRate,
                IsGift: item.IsGift,
                ExcludeFromOrderDiscount: item.BundleId.HasValue));
        }

        var shippingVatRate = ShippingVatRate > 0m ? ShippingVatRate : TaxRate;
        // Bất biến: DiscountAmount = TỔNG giảm (giảm riêng của dòng + giảm cấp đơn). Phần cấp đơn
        // đem phân bổ = tổng − giảm riêng của dòng; nếu không, tính lại lần hai (đổi phí ship…) sẽ
        // phân bổ giảm giá combo thêm một lần nữa.
        var orderLevelDiscount = Math.Max(0m, DiscountAmount - SumLineDiscounts());
        var totals = OrderTotalsCalculator.Compute(
            inputs, orderLevelDiscount, ShippingAmount, ShippingDiscount, shippingVatRate);

        SubtotalAmount = totals.Subtotal;
        // Clamp ngược về entity: giảm giá không bao giờ vượt tiền hàng.
        DiscountAmount = totals.EffectiveDiscount;
        TaxAmount = totals.TaxAmount;
        TotalAmount = totals.Total;
        ShippingVatRate = totals.ShippingVatRate;
        ShippingVatAmount = totals.ShippingVatAmount;

        for (var i = 0; i < Items.Count && i < totals.Lines.Count; i++)
        {
            Items[i].ApplyTotals(totals.Lines[i]);
        }

        UpdatedAt = DateTime.UtcNow;
    }

    public void ApplyCoupon(string couponCode, decimal discountAmount, string couponSnapshot, string? discountReason = null)
    {
        RequireMutable("áp mã giảm giá");
        CouponCode = couponCode;
        DiscountAmount = discountAmount + SumLineDiscounts();
        CouponSnapshot = couponSnapshot;
        DiscountReason = discountReason;
        CalculateAmounts();
    }

    /// <summary>Áp kết quả từ <c>PricingEngine</c>. Không dùng chung với <see cref="ApplyCoupon"/> để tránh cộng đôi.</summary>
    public void ApplyPricingResult(
        decimal discountAmount,
        decimal shippingDiscount,
        string appliedPromotionsJson,
        string? couponCode = null)
    {
        RequireMutable("áp kết quả tính giá");
        if (discountAmount < 0) throw new ArgumentException("discountAmount không được âm", nameof(discountAmount));
        if (shippingDiscount < 0) throw new ArgumentException("shippingDiscount không được âm", nameof(shippingDiscount));

        DiscountAmount = discountAmount + SumLineDiscounts();
        ShippingDiscount = shippingDiscount;
        AppliedPromotionsJson = appliedPromotionsJson;
        if (!string.IsNullOrEmpty(couponCode)) CouponCode = couponCode;
        CalculateAmounts();
    }

    /// <summary>Tổng giảm giá RIÊNG của các dòng (giá combo) — phần không phải giảm cấp đơn.</summary>
    private decimal SumLineDiscounts() => Items.Where(i => !i.IsGift).Sum(i => i.LineDiscount);

    /// <summary>D01 §3.3 — thuế suất hiệu lực của phí ship, resolve theo ngày ở tầng ứng dụng.</summary>
    public void SetShippingVatRate(decimal effectiveRate)
    {
        ShippingVatRate = effectiveRate < 0m ? 0m : effectiveRate;
        CalculateAmounts();
    }

    public void SetShippingAmount(decimal amount)
    {
        RequireMutable("đổi phí vận chuyển");
        ShippingAmount = amount;
        CalculateAmounts();
    }
}
