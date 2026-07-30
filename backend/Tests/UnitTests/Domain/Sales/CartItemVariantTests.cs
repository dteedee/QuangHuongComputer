using System.Reflection;
using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// Biến thể sản phẩm trong giỏ hàng — dòng hàng unique theo (ProductId, VariantId).
/// Cùng ProductId khác VariantId = 2 dòng riêng biệt (RAM 8GB vs RAM 16GB).
/// VariantName/Sku là snapshot bất biến — không đổi khi admin sửa tên biến thể sau đó.
/// </summary>
public class CartItemVariantTests
{
    private readonly Guid _productId = Guid.NewGuid();
    private readonly Guid _variantA = Guid.NewGuid();
    private readonly Guid _variantB = Guid.NewGuid();

    private Cart NewCart() => new Cart(Guid.NewGuid());

    [Fact]
    public void AddItem_CungProductKhacVariant_TaoHaiDongHangRieng()
    {
        var cart = NewCart();

        cart.AddItem(_productId, "Laptop XPS", 25_000_000m, 1, _variantA, "RAM 8GB / SSD 256GB", "XPS-8-256");
        cart.AddItem(_productId, "Laptop XPS", 30_000_000m, 1, _variantB, "RAM 16GB / SSD 512GB", "XPS-16-512");

        cart.Items.Should().HaveCount(2);
        cart.Items[0].VariantId.Should().Be(_variantA);
        cart.Items[1].VariantId.Should().Be(_variantB);
        cart.SubtotalAmount.Should().Be(55_000_000m);
    }

    [Fact]
    public void AddItem_CungProductVaCungVariant_GopSoLuong()
    {
        var cart = NewCart();
        cart.AddItem(_productId, "Laptop XPS", 25_000_000m, 1, _variantA, "RAM 8GB", "XPS-8");

        cart.AddItem(_productId, "Laptop XPS", 25_000_000m, 2, _variantA, "RAM 8GB", "XPS-8");

        cart.Items.Should().HaveCount(1);
        cart.Items[0].Quantity.Should().Be(3);
        cart.Items[0].VariantId.Should().Be(_variantA);
    }

    [Fact]
    public void AddItem_KhongVariant_HoatDongNhuCu_BackwardCompatible()
    {
        // Sản phẩm không có biến thể — VariantId=null, hành vi giữ nguyên như trước phase 03.
        var cart = NewCart();
        cart.AddItem(_productId, "Chuột logitech", 300_000m, 1);
        cart.AddItem(_productId, "Chuột logitech", 300_000m, 2);

        cart.Items.Should().HaveCount(1); // gộp vì cùng (productId, VariantId=null)
        cart.Items[0].Quantity.Should().Be(3);
        cart.Items[0].VariantId.Should().BeNull();
        cart.Items[0].VariantName.Should().BeNull();
        cart.Items[0].VariantSku.Should().BeNull();
    }

    [Fact]
    public void AddItem_MotDongVariantVaMotDongKhong_KhongGop()
    {
        // Cạnh biên: item không variant (null) không được gộp với item có variant cụ thể.
        var cart = NewCart();
        cart.AddItem(_productId, "SP", 1_000_000m, 1); // VariantId=null
        cart.AddItem(_productId, "SP", 1_500_000m, 1, _variantA, "Bản Pro", "PRO"); // VariantId set

        cart.Items.Should().HaveCount(2);
    }

    [Fact]
    public void RemoveItem_TheoProductIdVaVariantId_ChiXoaMotDong()
    {
        var cart = NewCart();
        cart.AddItem(_productId, "L", 1m, 1, _variantA, "A", "SA");
        cart.AddItem(_productId, "L", 1m, 1, _variantB, "B", "SB");

        cart.RemoveItem(_productId, _variantA);

        cart.Items.Should().HaveCount(1);
        cart.Items[0].VariantId.Should().Be(_variantB);
    }

    [Fact]
    public void RemoveItem_TheoProductIdOverloadCu_XoaMoiVariantCuaProduct()
    {
        // Overload cũ (chỉ ProductId) — backward compat: xoá HẾT dòng của product đó.
        var cart = NewCart();
        cart.AddItem(_productId, "L", 1m, 1, _variantA, "A", "SA");
        cart.AddItem(_productId, "L", 1m, 1, _variantB, "B", "SB");
        var other = Guid.NewGuid();
        cart.AddItem(other, "X", 1m, 1);

        cart.RemoveItem(_productId);

        cart.Items.Should().HaveCount(1);
        cart.Items[0].ProductId.Should().Be(other);
    }

    [Fact]
    public void CartItem_VariantName_KhongCoPublicSetter_SnapshotBatBien()
    {
        // Snapshot lịch sử đơn hàng: admin sửa tên biến thể sau đó không được đổi item đã lưu.
        // Ràng buộc bằng reflection — VariantName phải là private-set (hoặc init-only).
        var prop = typeof(CartItem).GetProperty(nameof(CartItem.VariantName),
            BindingFlags.Public | BindingFlags.Instance);
        prop.Should().NotBeNull();

        var setter = prop!.GetSetMethod(nonPublic: false);
        setter.Should().BeNull("VariantName phải bất biến từ ngoài — snapshot lịch sử");

        // Tương tự cho VariantId và VariantSku.
        typeof(CartItem).GetProperty(nameof(CartItem.VariantId))!
            .GetSetMethod(nonPublic: false).Should().BeNull();
        typeof(CartItem).GetProperty(nameof(CartItem.VariantSku))!
            .GetSetMethod(nonPublic: false).Should().BeNull();
    }

    [Fact]
    public void UpdateItemQuantity_TheoVariantId_ChiSuaDungDong()
    {
        var cart = NewCart();
        cart.AddItem(_productId, "L", 1_000_000m, 1, _variantA, "A", "SA");
        cart.AddItem(_productId, "L", 1_000_000m, 1, _variantB, "B", "SB");

        cart.UpdateItemQuantity(_productId, _variantA, 5);

        cart.Items.First(i => i.VariantId == _variantA).Quantity.Should().Be(5);
        cart.Items.First(i => i.VariantId == _variantB).Quantity.Should().Be(1);
    }
}
