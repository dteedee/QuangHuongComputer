using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// Quản lý dòng hàng trong giỏ: thêm/gộp/xóa/đổi số lượng và các biên số lượng.
/// </summary>
public class CartItemTests
{
    private readonly Guid _productId = Guid.NewGuid();

    private Cart NewCart() => new Cart(Guid.NewGuid());

    [Fact]
    public void AddItem_SanPhamMoi_ThemDongHangMoi()
    {
        var cart = NewCart();

        cart.AddItem(_productId, "RAM 16GB", 1_200_000m, 2);

        cart.Items.Should().HaveCount(1);
        cart.Items[0].Quantity.Should().Be(2);
        cart.Items[0].Subtotal.Should().Be(2_400_000m);
    }

    [Fact]
    public void AddItem_SanPhamDaCo_GopSoLuongKhongTaoDongMoi()
    {
        var cart = NewCart();
        cart.AddItem(_productId, "RAM 16GB", 1_200_000m, 2);

        cart.AddItem(_productId, "RAM 16GB", 1_200_000m, 3);

        cart.Items.Should().HaveCount(1);
        cart.Items[0].Quantity.Should().Be(5);
        cart.SubtotalAmount.Should().Be(6_000_000m);
    }

    [Fact]
    public void AddItem_NhieuSanPhamKhacNhau_CongDonTamTinh()
    {
        var cart = NewCart();

        cart.AddItem(Guid.NewGuid(), "SSD 512GB", 1_500_000m, 1);
        cart.AddItem(Guid.NewGuid(), "Chuột", 300_000m, 2);

        cart.Items.Should().HaveCount(2);
        cart.SubtotalAmount.Should().Be(2_100_000m);
    }

    [Fact]
    public void RemoveItem_XoaDungSanPham()
    {
        var cart = NewCart();
        var otherId = Guid.NewGuid();
        cart.AddItem(_productId, "SSD", 1_500_000m, 1);
        cart.AddItem(otherId, "Chuột", 300_000m, 1);

        cart.RemoveItem(_productId);

        cart.Items.Should().HaveCount(1);
        cart.Items[0].ProductId.Should().Be(otherId);
    }

    [Fact]
    public void RemoveItem_SanPhamKhongTonTai_KhongLamGi()
    {
        var cart = NewCart();
        cart.AddItem(_productId, "SSD", 1_500_000m, 1);

        cart.RemoveItem(Guid.NewGuid());

        cart.Items.Should().HaveCount(1);
    }

    [Fact]
    public void UpdateItemQuantity_DoiSoLuong_CapNhatTamTinh()
    {
        var cart = NewCart();
        cart.AddItem(_productId, "SSD", 1_500_000m, 1);

        cart.UpdateItemQuantity(_productId, 4);

        cart.Items[0].Quantity.Should().Be(4);
        cart.SubtotalAmount.Should().Be(6_000_000m);
    }

    [Fact]
    public void UpdateItemQuantity_VeKhong_XoaDongHang()
    {
        var cart = NewCart();
        cart.AddItem(_productId, "SSD", 1_500_000m, 2);

        cart.UpdateItemQuantity(_productId, 0);

        cart.Items.Should().BeEmpty();
        cart.SubtotalAmount.Should().Be(0);
    }

    [Fact]
    public void UpdateItemQuantity_SoLuongAm_XoaDongHangChuKhongTaoTienAm()
    {
        var cart = NewCart();
        cart.AddItem(_productId, "SSD", 1_500_000m, 2);

        cart.UpdateItemQuantity(_productId, -3);

        cart.Items.Should().BeEmpty();
        cart.SubtotalAmount.Should().Be(0);
    }

    [Fact]
    public void CartItem_UpdateQuantity_SoLuongKhongDuong_NemLoi()
    {
        var item = new CartItem(_productId, "SSD", 1_500_000m, 1);

        var actZero = () => item.UpdateQuantity(0);
        var actNegative = () => item.UpdateQuantity(-1);

        actZero.Should().Throw<ArgumentException>();
        actNegative.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Clear_XoaHetHangNhungGiuMaGiamGia()
    {
        var cart = NewCart();
        cart.AddItem(_productId, "SSD", 1_500_000m, 2);
        cart.ApplyCoupon("SALE", 100_000m);

        cart.Clear();

        cart.Items.Should().BeEmpty();
        cart.SubtotalAmount.Should().Be(0);
        cart.TotalAmount.Should().Be(0);
    }

    /// <summary>
    /// AddItem với số lượng âm phải throw ArgumentException (không được tạo tạm tính ÂM).
    /// </summary>
    [Fact]
    public void AddItem_SoLuongAm_PhaiNemLoiChuKhongTaoTienAm()
    {
        var cart = NewCart();

        var act = () => cart.AddItem(_productId, "SSD", 1_500_000m, -5);

        act.Should().Throw<ArgumentException>();
    }

    /// <summary>
    /// AddItem với số lượng 0 phải throw ArgumentException (không tạo dòng hàng rác).
    /// </summary>
    [Fact]
    public void AddItem_SoLuongKhong_PhaiNemLoi()
    {
        var cart = NewCart();

        var act = () => cart.AddItem(_productId, "SSD", 1_500_000m, 0);

        act.Should().Throw<ArgumentException>();
    }

    /// <summary>
    /// ApplyCoupon với số tiền giảm âm phải throw (nếu không thì coupon âm làm TĂNG tổng tiền).
    /// </summary>
    [Fact]
    public void ApplyCoupon_SoTienGiamAm_PhaiNemLoi()
    {
        var cart = NewCart();
        cart.AddItem(_productId, "SSD", 1_500_000m, 1);

        var act = () => cart.ApplyCoupon("HACK", -1_000_000m);

        act.Should().Throw<ArgumentException>();
    }
}
