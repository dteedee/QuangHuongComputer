using Catalog.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Domain.Catalog;

/// <summary>
/// ProductVariant: ràng buộc giá/tồn không âm, tên/sku bắt buộc;
/// Product không được có 2 biến thể cùng SKU; chỉ 1 IsDefault; AddOption chặn double type.
/// </summary>
public class ProductVariantTests
{
    private static Product NewProduct() => new Product(
        name: "Laptop Test", price: 20_000_000m, costPrice: 17_000_000m,
        description: "d", categoryId: Guid.NewGuid(), brandId: Guid.NewGuid(), stockQuantity: 10);

    [Fact]
    public void Ctor_GiaAm_PhaiNemLoi()
    {
        var act = () => new ProductVariant(Guid.NewGuid(), "SKU-1", "N", price: -1, costPrice: 0, stockQuantity: 0);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Ctor_SkuRong_PhaiNemLoi()
    {
        var act = () => new ProductVariant(Guid.NewGuid(), "", "N", 100, 90, 0);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Ctor_TonKhoDuong10_StatusLowStock()
    {
        var v = new ProductVariant(Guid.NewGuid(), "SKU", "N", 100, 90, stockQuantity: 5);
        v.Status.Should().Be(VariantStatus.LowStock);
    }

    [Fact]
    public void Ctor_TonKho0_StatusOutOfStock()
    {
        var v = new ProductVariant(Guid.NewGuid(), "SKU", "N", 100, 90, stockQuantity: 0);
        v.Status.Should().Be(VariantStatus.OutOfStock);
    }

    [Fact]
    public void Product_AddVariant_TrungSku_PhaiNemLoi()
    {
        var product = NewProduct();
        var v1 = new ProductVariant(product.Id, "SKU-A", "n1", 100, 90, 5);
        var v2 = new ProductVariant(product.Id, "SKU-A", "n2", 100, 90, 5); // trùng SKU
        product.AddVariant(v1);
        var act = () => product.AddVariant(v2);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Product_AddVariant_ProductIdKhongKhop_PhaiNemLoi()
    {
        var product = NewProduct();
        var v = new ProductVariant(Guid.NewGuid(), "SKU-X", "n", 100, 90, 5);
        var act = () => product.AddVariant(v);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Product_AddNhieuIsDefault_ChiConMotDefault()
    {
        var product = NewProduct();
        var v1 = new ProductVariant(product.Id, "SKU-1", "n1", 100, 90, 5, isDefault: true);
        var v2 = new ProductVariant(product.Id, "SKU-2", "n2", 100, 90, 5, isDefault: true);
        product.AddVariant(v1);
        product.AddVariant(v2);

        product.Variants.Count(v => v.IsDefault).Should().Be(1);
        v2.IsDefault.Should().BeTrue();
        v1.IsDefault.Should().BeFalse();
    }

    [Fact]
    public void AddOption_HaiValueCungOptionType_PhaiNemLoi()
    {
        var v = new ProductVariant(Guid.NewGuid(), "S", "n", 100, 90, 1);
        var ram = Guid.NewGuid();
        v.AddOption(ram, Guid.NewGuid());
        var act = () => v.AddOption(ram, Guid.NewGuid()); // cùng OptionType
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void UpdateDetails_TenRong_PhaiNemLoi()
    {
        var v = new ProductVariant(Guid.NewGuid(), "S", "n", 100, 90, 1);
        var act = () => v.UpdateDetails("", 100, 90);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void UpdateStock_Am_PhaiNemLoi()
    {
        var v = new ProductVariant(Guid.NewGuid(), "S", "n", 100, 90, 1);
        var act = () => v.UpdateStock(-1);
        act.Should().Throw<ArgumentException>();
    }

    /// <summary>
    /// Nếu có biến thể InStock hoặc LowStock, EffectivePrice = min(variant.Price).
    /// </summary>
    [Fact]
    public void Product_EffectivePrice_LayGiaMinBienTheDangBan()
    {
        var product = NewProduct(); // Price=20_000_000
        product.AddVariant(new ProductVariant(product.Id, "S1", "16GB", price: 22_000_000, costPrice: 18_000_000, stockQuantity: 5));
        product.AddVariant(new ProductVariant(product.Id, "S2", "8GB",  price: 18_500_000, costPrice: 15_000_000, stockQuantity: 5));

        product.EffectivePrice.Should().Be(18_500_000m);
    }

    [Fact]
    public void Product_HasVariants_KhiChuaCoBienThe_False()
    {
        var product = NewProduct();
        product.HasVariants().Should().BeFalse();
    }
}
