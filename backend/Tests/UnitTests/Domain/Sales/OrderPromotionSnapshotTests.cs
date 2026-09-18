using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// Phase 04 — Order phải snapshot promotion đã áp và tách ShippingDiscount khỏi DiscountAmount.
/// Freeship KHÔNG được cộng vào gốc VAT (thuế tính trên hàng — không tính trên ship).
/// </summary>
public class OrderPromotionSnapshotTests
{
    private static Order NewOrderVoi1Item(decimal unitPrice, int qty)
    {
        var items = new List<OrderItem> {
            new OrderItem(Guid.NewGuid(), "Laptop", unitPrice, qty)
        };
        return new Order(
            customerId: Guid.NewGuid(),
            shippingAddress: "test",
            items: items,
            taxRate: 0.08m);
    }

    [Fact]
    public void ApplyPricingResult_LuuSnapshotJson()
    {
        var order = NewOrderVoi1Item(10_000_000m, 1);

        order.ApplyPricingResult(
            discountAmount: 500_000m,
            shippingDiscount: 0m,
            appliedPromotionsJson: "[{\"code\":\"TET\"}]",
            couponCode: "TET");

        order.AppliedPromotionsJson.Should().Be("[{\"code\":\"TET\"}]");
        order.CouponCode.Should().Be("TET");
        order.DiscountAmount.Should().Be(500_000m);
    }

    [Fact]
    public void ApplyPricingResult_ShippingDiscount_KhongAnhHuongVATHang()
    {
        // W0-4/D01: giá ĐÃ gồm VAT. Subtotal 10tr, ship 100k, freeship 100k → ship ròng = 0.
        // Total = 10tr − 0 + 0 = 10tr (KHÔNG cộng thêm 800k thuế như trước).
        // Tax  = ExtractVat(10tr) = 10.000.000 − 9.259.259 = 740.741.
        var order = NewOrderVoi1Item(10_000_000m, 1);
        order.SetShippingAmount(100_000m);
        order.ApplyPricingResult(
            discountAmount: 0,
            shippingDiscount: 100_000m,
            appliedPromotionsJson: "[]");

        order.TaxAmount.Should().Be(740_741m);
        order.TotalAmount.Should().Be(10_000_000m);
    }

    [Fact]
    public void ApplyPricingResult_DiscountLonHonSubtotal_TotalKhongAm()
    {
        var order = NewOrderVoi1Item(1_000_000m, 1);
        order.SetShippingAmount(30_000m);
        order.ApplyPricingResult(
            discountAmount: 2_000_000m, // vượt subtotal
            shippingDiscount: 0,
            appliedPromotionsJson: "[]");

        // Chốt chặn 1 (D01): D clamp về subtotal → hàng còn 0đ, chỉ còn phí ship.
        order.DiscountAmount.Should().Be(1_000_000m);
        order.TotalAmount.Should().Be(30_000m);
        // VAT tách trên dòng ship: 30.000 − round(30.000/1,08) = 30.000 − 27.778 = 2.222.
        order.TaxAmount.Should().Be(2_222m);
    }

    [Fact]
    public void ApplyPricingResult_ShippingDiscountAm_NemLoi()
    {
        var order = NewOrderVoi1Item(1_000_000m, 1);

        var act = () => order.ApplyPricingResult(0, -1m, "[]");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ApplyPricingResult_KhiOrderKhongDraftHoacPending_NemLoi()
    {
        var order = NewOrderVoi1Item(1_000_000m, 1);
        order.Confirm();

        var act = () => order.ApplyPricingResult(100_000m, 0, "[]");

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void OrderItem_IsGift_ForceUnitPriceZero()
    {
        // Bảo vệ tuyệt đối — caller truyền unitPrice khác 0 vẫn phải ép về 0.
        var item = new OrderItem(
            productId: Guid.NewGuid(), productName: "Chuột tặng",
            unitPrice: 500_000m, quantity: 1, isGift: true,
            appliedPromotionCode: "GIFT2026");

        item.UnitPrice.Should().Be(0);
        item.IsGift.Should().BeTrue();
        item.LineTotal.Should().Be(0);
        item.AppliedPromotionCode.Should().Be("GIFT2026");
    }

    [Fact]
    public void Cart_AddGiftItem_TaoDongMoi_GiaZero_KhongGop()
    {
        var cart = new Cart(Guid.NewGuid());
        var productId = Guid.NewGuid();
        cart.AddItem(productId, "Chuột", price: 500_000m, quantity: 1);
        cart.AddGiftItem(productId, "Chuột", quantity: 1, promotionCode: "GIFT");

        cart.Items.Should().HaveCount(2);
        cart.Items.First(i => i.IsGift).Price.Should().Be(0);
        cart.SubtotalAmount.Should().Be(500_000m); // Gift không tính vào subtotal.
    }

    [Fact]
    public void Cart_ClearGiftItems_ChiXoaGift_GiuHangThuong()
    {
        var cart = new Cart(Guid.NewGuid());
        var pA = Guid.NewGuid();
        var pB = Guid.NewGuid();
        cart.AddItem(pA, "Laptop", 20_000_000m, 1);
        cart.AddGiftItem(pB, "Chuột tặng", 1, promotionCode: "GIFT");

        cart.ClearGiftItems();

        cart.Items.Should().HaveCount(1);
        cart.Items.First().ProductId.Should().Be(pA);
    }
}
