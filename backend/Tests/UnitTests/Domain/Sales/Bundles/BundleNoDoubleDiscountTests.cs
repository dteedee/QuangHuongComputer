using FluentAssertions;
using Sales.Application.Pricing;
using Sales.Domain;
using Xunit;
using static UnitTests.Domain.Sales.Bundles.BundleTestData;

namespace UnitTests.Domain.Sales.Bundles;

/// <summary>Dòng đã giảm giá combo không bao giờ gánh thêm giảm giá cấp đơn (coupon/khuyến mãi).</summary>
public class BundleNoDoubleDiscountTests
{
    [Fact]
    public void GiamCapDon_ChiPhanBoVaoDongKhongThuocCombo()
    {
        var totals = OrderTotalsCalculator.Compute(new[]
        {
            new TotalsLineInput(1, LaptopPrice, 1, 585_366m, 0.08m, false, ExcludeFromOrderDiscount: true),
            new TotalsLineInput(2, MousePrice, 1, 14_634m, 0.08m, false, ExcludeFromOrderDiscount: true),
            new TotalsLineInput(3, 1_000_000m, 1, 0m, 0.08m, false),
        }, orderDiscount: 200_000m, shippingFee: 0m, shippingDiscount: 0m, shippingVatRate: 0m);

        totals.Lines[0].AllocatedOrderDiscount.Should().Be(0m);
        totals.Lines[1].AllocatedOrderDiscount.Should().Be(0m);
        totals.Lines[2].AllocatedOrderDiscount.Should().Be(200_000m);
        totals.Total.Should().Be(19_900_000m + 800_000m);
    }

    [Fact]
    public void CouponLonHonDongLe_BiChanOTienDongLe_KhongAnVaoCombo()
    {
        var totals = OrderTotalsCalculator.Compute(new[]
        {
            new TotalsLineInput(1, LaptopPrice, 1, 600_000m, 0.08m, false, ExcludeFromOrderDiscount: true),
            new TotalsLineInput(2, 300_000m, 1, 0m, 0.08m, false),
        }, orderDiscount: 5_000_000m, shippingFee: 0m, shippingDiscount: 0m, shippingVatRate: 0m);

        totals.Lines[0].Payable.Should().Be(19_400_000m);
        totals.Lines[1].Payable.Should().Be(0m);
    }

    [Fact]
    public void Order_ComboVaCoupon_TinhLaiNhieuLan_KhongGiamChong()
    {
        var bundleId = Guid.NewGuid();
        var items = new List<OrderItem>
        {
            new(Laptop, "Laptop", LaptopPrice, 1, lineDiscount: 585_366m, vatRate: 0.08m, sequence: 1, bundleId: bundleId, bundleName: "Combo"),
            new(Mouse, "Chuột", MousePrice, 1, lineDiscount: 14_634m, vatRate: 0.08m, sequence: 2, bundleId: bundleId, bundleName: "Combo"),
            new(Guid.NewGuid(), "Balo", 1_000_000m, 1, vatRate: 0.08m, sequence: 3),
        };
        var order = new Order(Guid.NewGuid(), "12 Nguyễn Trãi", items, 0.08m);

        order.ApplyPricingResult(100_000m, 0m, "[]", "GIAM100K");
        var afterPricing = order.TotalAmount;
        order.SetShippingAmount(30_000m);
        order.SetShippingAmount(0m);

        afterPricing.Should().Be(19_900_000m + 900_000m);
        order.TotalAmount.Should().Be(afterPricing, "tính lại tổng không được phân bổ giảm combo thêm lần nữa");
        order.DiscountAmount.Should().Be(700_000m, "tổng giảm = 600.000 combo + 100.000 coupon");
        order.Items[2].AllocatedOrderDiscount.Should().Be(100_000m);
        order.Items[0].AllocatedOrderDiscount.Should().Be(0m);
    }
}
