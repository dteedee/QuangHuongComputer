using FluentAssertions;
using Sales.Domain;
using Xunit;
using static UnitTests.Domain.Sales.Bundles.BundleTestData;

namespace UnitTests.Domain.Sales.Bundles;

/// <summary>Nhóm combo trong giỏ: thêm thành nhóm riêng, bỏ/đổi một món thì vỡ nhóm, giá về giá lẻ.</summary>
public class CartBundleGroupTests
{
    private static readonly Guid BundleId = Guid.NewGuid();

    private static Cart CartWithCombo(int sets = 1)
    {
        var cart = new Cart(Guid.NewGuid());
        cart.AddBundle(BundleId, "Laptop + chuột", new[]
        {
            new CartBundleComponent(Laptop, "Laptop", LaptopPrice, 1),
            new CartBundleComponent(Mouse, "Chuột", MousePrice, 1),
        }, sets);
        return cart;
    }

    [Fact]
    public void ThemCombo_TaoNhomRieng_KhongGopVoiDongLe()
    {
        var cart = new Cart(Guid.NewGuid());
        cart.AddItem(Mouse, "Chuột", MousePrice, 1);
        cart.AddBundle(BundleId, "Laptop + chuột", new[]
        {
            new CartBundleComponent(Laptop, "Laptop", LaptopPrice, 1),
            new CartBundleComponent(Mouse, "Chuột", MousePrice, 1),
        }, 1);

        cart.Items.Should().HaveCount(3);
        cart.Items.Count(i => i.BundleId == BundleId).Should().Be(2);
        cart.Items.Single(i => i.BundleId == null).Quantity.Should().Be(1);
    }

    [Fact]
    public void ThemCungComboLanNua_CongDonSoBo()
    {
        var cart = CartWithCombo();
        cart.AddBundle(BundleId, "Laptop + chuột", new[]
        {
            new CartBundleComponent(Laptop, "Laptop", LaptopPrice, 1),
            new CartBundleComponent(Mouse, "Chuột", MousePrice, 1),
        }, 1);

        cart.Items.Should().HaveCount(2);
        cart.Items.Should().OnlyContain(i => i.Quantity == 2 && i.BundleId == BundleId);
    }

    [Fact]
    public void BoMotMon_ComboVo_MonConLaiVeDongLe()
    {
        var cart = CartWithCombo();

        cart.RemoveBundleItem(BundleId, Mouse);

        cart.Items.Should().ContainSingle();
        cart.Items[0].ProductId.Should().Be(Laptop);
        cart.Items[0].BundleId.Should().BeNull("combo vỡ thì giá trở về giá lẻ");
    }

    [Fact]
    public void XoaSanPhamKieuCu_CungLamVoCombo()
    {
        var cart = CartWithCombo();

        cart.RemoveItem(Laptop);

        cart.Items.Should().ContainSingle(i => i.ProductId == Mouse && i.BundleId == null);
    }

    [Fact]
    public void DoiSoLuongMotMon_ComboVo_GopVaoDongLeSanCo()
    {
        var cart = CartWithCombo();
        cart.AddItem(Mouse, "Chuột", MousePrice, 1);

        cart.UpdateBundleItemQuantity(BundleId, Mouse, 3);

        cart.Items.Should().OnlyContain(i => i.BundleId == null);
        cart.Items.Single(i => i.ProductId == Mouse).Quantity.Should().Be(3);
        cart.Items.Single(i => i.ProductId == Laptop).Quantity.Should().Be(1);
    }

    [Fact]
    public void GoCombo_XoaCaNhom_GiuDongLe()
    {
        var cart = CartWithCombo();
        cart.AddItem(Laptop, "Laptop", LaptopPrice, 1);

        cart.RemoveBundle(BundleId);

        cart.Items.Should().ContainSingle(i => i.ProductId == Laptop && i.BundleId == null);
    }

    [Fact]
    public void GiaServer_CapNhatMoiDongCungSanPham()
    {
        var cart = CartWithCombo();
        cart.AddItem(Mouse, "Chuột", 1m, 1);

        cart.UpdateItemPrice(Mouse, null, 450_000m);

        cart.Items.Where(i => i.ProductId == Mouse).Should().OnlyContain(i => i.Price == 450_000m);
    }
}
