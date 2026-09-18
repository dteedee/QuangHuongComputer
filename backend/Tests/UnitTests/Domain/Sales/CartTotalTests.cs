using Accounting.Domain;
using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// W0-4 / D01 — GIÁ NIÊM YẾT ĐÃ BAO GỒM VAT.
/// Total = TẠM TÍNH − GIẢM GIÁ + PHÍ SHIP. KHÔNG cộng thêm thuế.
/// TaxAmount là phần VAT được TÁCH RA khỏi Total (dùng cho hoá đơn), tách THEO TỪNG DÒNG.
/// </summary>
public class CartTotalTests
{
    private static Cart CartWithSubtotal(decimal unitPrice, int quantity)
    {
        var cart = new Cart(Guid.NewGuid());
        cart.AddItem(Guid.NewGuid(), "Laptop Gaming", unitPrice, quantity);
        return cart;
    }

    [Fact]
    public void TotalAmount_GioRong_BangKhong()
    {
        var cart = new Cart(Guid.NewGuid());

        cart.SubtotalAmount.Should().Be(0);
        cart.TotalAmount.Should().Be(0);
    }

    [Fact]
    public void TotalAmount_KhongGiamGiaKhongShip_BangTamTinh_VatDaNamTrongGia()
    {
        var cart = CartWithSubtotal(5_000_000m, 2);

        cart.SubtotalAmount.Should().Be(10_000_000m);
        // TRƯỚC: 10.800.000 (cộng thêm 8% lên giá storefront đã ghi "đã bao gồm VAT").
        cart.TotalAmount.Should().Be(10_000_000m);
        // VAT tách ra: 10.000.000 − round(10.000.000/1,08) = 740.741.
        cart.TaxAmount.Should().Be(740_741m);
    }

    [Fact]
    public void TotalAmount_GiamGiaRoiCongShip_KhongCongThemThue()
    {
        var cart = CartWithSubtotal(5_000_000m, 2);   // tạm tính 10tr
        cart.ApplyCoupon("SALE1M", 1_000_000m);      // còn 9tr
        cart.SetShippingAmount(500_000m);

        // 9tr + 500k ship = 9.500.000 (TRƯỚC: 10.220.000 vì cộng thêm 720k VAT).
        cart.TotalAmount.Should().Be(9_500_000m);
    }

    [Fact]
    public void TotalAmount_PhiShipKhongBiTinhThue()
    {
        var cart = CartWithSubtotal(1_000_000m, 1);
        var totalWithoutShipping = cart.TotalAmount;

        cart.SetShippingAmount(100_000m);

        cart.TotalAmount.Should().Be(totalWithoutShipping + 100_000m);
    }

    [Fact]
    public void TotalAmount_GiamGiaLonHonTamTinh_TongKhongAm()
    {
        var cart = CartWithSubtotal(1_000_000m, 1);
        cart.ApplyCoupon("BIGSALE", 2_000_000m);

        cart.TotalAmount.Should().Be(0);
        cart.TotalAmount.Should().BeGreaterOrEqualTo(0);
    }

    [Fact]
    public void TotalAmount_GiamGiaLonHonTamTinh_VanPhaiTraPhiShip()
    {
        var cart = CartWithSubtotal(1_000_000m, 1);
        cart.ApplyCoupon("BIGSALE", 2_000_000m);
        cart.SetShippingAmount(30_000m);

        cart.TotalAmount.Should().Be(30_000m);
    }

    [Fact]
    public void TotalAmount_GiamGiaBangDungTamTinh_ConKhong()
    {
        var cart = CartWithSubtotal(2_000_000m, 1);
        cart.ApplyCoupon("FREE", 2_000_000m);

        cart.TotalAmount.Should().Be(0);
        cart.TaxAmount.Should().Be(0);
    }

    [Fact]
    public void ApplyCoupon_LuuMaVaSoTienGiam()
    {
        var cart = CartWithSubtotal(10_000_000m, 1);

        cart.ApplyCoupon("TET2026", 500_000m);

        cart.CouponCode.Should().Be("TET2026");
        cart.DiscountAmount.Should().Be(500_000m);
        cart.TotalAmount.Should().Be(9_500_000m); // TRƯỚC: 10.260.000 (cộng thêm VAT)
    }

    [Fact]
    public void ApplyCoupon_ApDungMaMoi_GhiDeMaCu()
    {
        var cart = CartWithSubtotal(10_000_000m, 1);
        cart.ApplyCoupon("OLD", 500_000m);

        cart.ApplyCoupon("NEW", 1_000_000m);

        cart.CouponCode.Should().Be("NEW");
        cart.DiscountAmount.Should().Be(1_000_000m);
    }

    [Fact]
    public void RemoveCoupon_XoaMaVaTraTongVeNhuCu()
    {
        var cart = CartWithSubtotal(10_000_000m, 1);
        var originalTotal = cart.TotalAmount;
        cart.ApplyCoupon("TET2026", 500_000m);

        cart.RemoveCoupon();

        cart.CouponCode.Should().BeNull();
        cart.DiscountAmount.Should().Be(0);
        cart.TotalAmount.Should().Be(originalTotal);
    }

    [Fact]
    public void SetShippingAmount_SoTienAm_NemLoi()
    {
        var cart = CartWithSubtotal(1_000_000m, 1);

        var act = () => cart.SetShippingAmount(-1);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void SetShippingAmount_MienPhiShip_ChapNhanKhong()
    {
        var cart = CartWithSubtotal(1_000_000m, 1);

        cart.SetShippingAmount(0);

        cart.ShippingAmount.Should().Be(0);
    }

    /// <summary>
    /// Cart.TaxRate phải khớp thuế suất VAT chuẩn của hệ thống (VietnameseTaxEngine.VatStandard = 8%).
    /// Trước đây hardcode 10% -> đã sửa dùng BuildingBlocks.TaxRates.VatStandard.
    /// </summary>
    [Fact]
    public void TaxRate_PhaiKhopVoiThueSuatVatChuanCuaHeThong()
    {
        var cart = new Cart(Guid.NewGuid());

        cart.TaxRate.Should().Be(VietnameseTaxEngine.VatStandard);
    }
}
