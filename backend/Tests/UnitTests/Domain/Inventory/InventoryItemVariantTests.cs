using FluentAssertions;
using InventoryModule.Domain;
using Xunit;

namespace UnitTests.Domain.Inventory;

/// <summary>
/// Tồn kho theo biến thể: cùng ProductId có thể có nhiều InventoryItem theo VariantId khác nhau.
/// Reserve/Release/Confirm hoạt động độc lập cho từng biến thể — không lẫn tồn.
/// </summary>
public class InventoryItemVariantTests
{
    private readonly Guid _productId = Guid.NewGuid();
    private readonly Guid _variantA = Guid.NewGuid();
    private readonly Guid _variantB = Guid.NewGuid();

    [Fact]
    public void Constructor_CoVariantId_LuuDungVariantId()
    {
        var item = new InventoryItem(_productId, _variantA, initialQuantity: 20);

        item.ProductId.Should().Be(_productId);
        item.VariantId.Should().Be(_variantA);
        item.QuantityOnHand.Should().Be(20);
        item.AvailableQuantity.Should().Be(20);
    }

    [Fact]
    public void Constructor_KhongVariantId_BackwardCompatible_VariantIdNull()
    {
        // Ctor cũ (không variantId) vẫn dùng được — cho sản phẩm không có biến thể.
        var item = new InventoryItem(_productId, initialQuantity: 15);

        item.ProductId.Should().Be(_productId);
        item.VariantId.Should().BeNull();
        item.QuantityOnHand.Should().Be(15);
    }

    [Fact]
    public void ReserveStock_HaiVarianCungProduct_DocLap()
    {
        // Kịch bản thực tế: laptop XPS có 2 biến thể RAM 8GB (20 chiếc) và 16GB (5 chiếc).
        // Đặt 15 con RAM 8GB không được ảnh hưởng tồn 16GB.
        var stockA = new InventoryItem(_productId, _variantA, initialQuantity: 20);
        var stockB = new InventoryItem(_productId, _variantB, initialQuantity: 5);

        stockA.ReserveStock(15);

        stockA.AvailableQuantity.Should().Be(5);
        stockA.ReservedQuantity.Should().Be(15);
        // Biến thể B không bị ảnh hưởng.
        stockB.AvailableQuantity.Should().Be(5);
        stockB.ReservedQuantity.Should().Be(0);
    }

    [Fact]
    public void ReserveStock_TrenVariantHetHang_NemLoi_KhongLanSangVariantKhac()
    {
        var stockA = new InventoryItem(_productId, _variantA, initialQuantity: 2);
        var stockB = new InventoryItem(_productId, _variantB, initialQuantity: 100);

        var act = () => stockA.ReserveStock(5);

        act.Should().Throw<InvalidOperationException>();
        stockA.AvailableQuantity.Should().Be(2);
        // Biến thể B dư dả không được "vay" hộ variant A.
        stockB.AvailableQuantity.Should().Be(100);
    }

    [Fact]
    public void ConfirmReservedStock_TruDungVariant_KhongDungVariantKhac()
    {
        var stockA = new InventoryItem(_productId, _variantA, initialQuantity: 10);
        var stockB = new InventoryItem(_productId, _variantB, initialQuantity: 10);
        stockA.ReserveStock(4);
        stockB.ReserveStock(3);

        stockA.ConfirmReservedStock(4);

        stockA.QuantityOnHand.Should().Be(6);
        stockA.ReservedQuantity.Should().Be(0);
        // Variant B giữ nguyên.
        stockB.QuantityOnHand.Should().Be(10);
        stockB.ReservedQuantity.Should().Be(3);
    }

    [Fact]
    public void Constructor_CoVariantIdVaWarehouseId_LuuCaHai()
    {
        var warehouseId = Guid.NewGuid();
        var item = new InventoryItem(_productId, _variantA, initialQuantity: 5, warehouseId: warehouseId);

        item.ProductId.Should().Be(_productId);
        item.VariantId.Should().Be(_variantA);
        item.WarehouseId.Should().Be(warehouseId);
    }
}
