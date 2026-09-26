using Sales.Domain;

namespace Sales.Application.Pricing;

/// <summary>
/// D01 §6 — tính khối `vatBreakdown[{rate, net, vat}]` cho API giỏ hàng.
///
/// Vì sao không để <c>Cart.TaxAmount</c> làm việc này: entity giỏ chỉ biết MỘT thuế suất nhãn
/// (<c>Cart.TaxRate</c>). Một giỏ hoàn toàn có thể trộn hàng 8% với hàng 10% (nhóm không thuộc
/// diện giảm theo NQ 204/2025), và khi đó một con số thuế duy nhất vừa sai luật (Đ.9.4) vừa
/// không khớp với hoá đơn sẽ xuất ra. Thuế suất theo dòng chỉ tra được khi có Catalog ⇒ việc này
/// thuộc tầng ứng dụng, không thuộc domain.
///
/// Frontend KHÔNG tự tính thuế: nó hiển thị thẳng mảng này ("Trong đó VAT (8%): x đ", và khi có
/// từ hai nhóm trở lên thì liệt kê từng nhóm không kèm một phần trăm chung).
/// </summary>
public static class CartVatBreakdown
{
    /// <summary>
    /// Tính tổng + tách thuế theo dòng cho một giỏ, dùng hồ sơ thuế đã tra sẵn.
    /// <paramref name="bundles"/> (chỉ số dòng = vị trí trong <c>cart.Items</c>): giảm combo là giảm
    /// RIÊNG của dòng, và dòng combo không gánh coupon — y hệt <c>Order.CalculateAmounts</c>.
    /// </summary>
    public static OrderTotals Compute(Cart cart, VatProfileSet profiles, Bundles.BundlePricingResult? bundles = null)
    {
        var lines = cart.Items
            .Select((item, index) => new TotalsLineInput(
                Sequence: index + 1,
                UnitPriceIncludingVat: item.Price,
                Quantity: item.Quantity,
                LineDiscount: bundles?.DiscountFor(index) ?? 0m,
                VatRate: profiles.For(item.ProductId).EffectiveRate,
                IsGift: item.IsGift,
                ExcludeFromOrderDiscount: bundles?.IsLocked(index) ?? false))
            .ToList();

        return OrderTotalsCalculator.Compute(
            lines,
            cart.DiscountAmount,
            cart.ShippingAmount,
            shippingDiscount: 0m,
            shippingVatRate: profiles.ShippingRate);
    }
}
