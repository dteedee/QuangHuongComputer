using Accounting.Domain;
using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// Thứ tự tính tiền giỏ hàng phải là: TẠM TÍNH -> TRỪ GIẢM GIÁ -> TÍNH THUẾ -> CỘNG PHÍ SHIP.
/// Thuế tính trên số tiền SAU giảm giá, phí ship KHÔNG bị tính thuế.
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
    public void TotalAmount_KhongGiamGiaKhongShip_BangTamTinhCongThue()
    {
        var cart = CartWithSubtotal(5_000_000m, 2);

        cart.SubtotalAmount.Should().Be(10_000_000m);
        cart.TotalAmount.Should().Be(10_800_000m); // 10tr + 8% VAT chuẩn
    }

    [Fact]
    public void TotalAmount_DungThuTuGiamGiaRoiThueRoiShip()
    {
        var cart = CartWithSubtotal(5_000_000m, 2);   // tạm tính 10tr
        cart.ApplyCoupon("SALE1M", 1_000_000m);      // còn 9tr
        cart.SetShippingAmount(500_000m);

        // 9tr + 720k VAT(8%) + 500k ship = 10.220.000
        // Nếu tính thuế TRƯỚC giảm giá sẽ ra 10.300.000 -> sai
        cart.TotalAmount.Should().Be(10_220_000m);
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
    public void TotalAmount_GiamGiaBangDungTamTinh_ChiConThue0()
    {
        var cart = CartWithSubtotal(2_000_000m, 1);
        cart.ApplyCoupon("FREE", 2_000_000m);

        cart.TotalAmount.Should().Be(0);
    }

    [Fact]
    public void ApplyCoupon_LuuMaVaSoTienGiam()
    {
        var cart = CartWithSubtotal(10_000_000m, 1);

        cart.ApplyCoupon("TET2026", 500_000m);

        cart.CouponCode.Should().Be("TET2026");
        cart.DiscountAmount.Should().Be(500_000m);
        cart.TotalAmount.Should().Be(10_260_000m); // 9,5tr + 760k VAT(8%)
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
