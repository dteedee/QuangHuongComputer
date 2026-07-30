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
    public void ApplyPricingResult_ShippingDiscount_KhongCongVaoGocVAT()
    {
        // Subtotal 10tr, ship 100k, freeship 100k.
        // VAT tính trên subtotal-discount = 10tr → 800k VAT (không đụng shipping discount).
        // Total = 10tr + 800k + max(100k - 100k, 0) = 10.8tr.
        var order = NewOrderVoi1Item(10_000_000m, 1);
        order.SetShippingAmount(100_000m);
        order.ApplyPricingResult(
            discountAmount: 0,
            shippingDiscount: 100_000m,
            appliedPromotionsJson: "[]");

        order.TaxAmount.Should().Be(800_000m);
        order.TotalAmount.Should().Be(10_800_000m);
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

        // netSubtotal clamp về 0 → VAT=0, chỉ còn ship.
        order.TaxAmount.Should().Be(0);
        order.TotalAmount.Should().Be(30_000m);
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
