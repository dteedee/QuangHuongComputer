using FluentAssertions;
using InventoryModule.Domain;
using Xunit;

namespace UnitTests.Domain.Inventory;

/// <summary>
/// Phase 04 — StockReservation phải hỗ trợ VariantId để không overselling chéo biến thể.
/// 2 khách đặt cùng ProductId nhưng khác VariantId → reserve độc lập.
/// </summary>
public class StockReservationVariantTests
{
    private readonly Guid _productId = Guid.NewGuid();
    private readonly Guid _variantA = Guid.NewGuid();
    private readonly Guid _variantB = Guid.NewGuid();
    private readonly Guid _invItemA = Guid.NewGuid();
    private readonly Guid _invItemB = Guid.NewGuid();

    [Fact]
    public void Ctor_KhongVariantId_BackwardCompatible_VariantIdNull()
    {
        var r = new StockReservation(_invItemA, _productId, quantity: 3,
            referenceId: "ORD-001", referenceType: "Order");

        r.VariantId.Should().BeNull();
        r.Quantity.Should().Be(3);
        r.Status.Should().Be(ReservationStatus.Active);
    }

    [Fact]
    public void Ctor_CoVariantId_LuuDungVariantId()
    {
        var r = new StockReservation(_invItemA, _productId, _variantA, quantity: 2,
            referenceId: "ORD-002", referenceType: "Order");

        r.VariantId.Should().Be(_variantA);
        r.Quantity.Should().Be(2);
    }

    [Fact]
    public void HaiReservation_KhacVariant_DocLap_KhongLanTonNhau()
    {
        // Kịch bản: laptop có 2 biến thể RAM 8GB (còn 3) và 16GB (còn 5).
        // Khách 1 giữ chỗ 3 con 8GB; khách 2 giữ 4 con 16GB → cả 2 thành công, tồn tách bạch.
        var stockA = new InventoryItem(_productId, _variantA, initialQuantity: 3);
        var stockB = new InventoryItem(_productId, _variantB, initialQuantity: 5);

        stockA.ReserveStock(3);
        stockB.ReserveStock(4);

        var rA = new StockReservation(stockA.Id, _productId, _variantA, 3, "SESS-A", "CheckoutSession");
        var rB = new StockReservation(stockB.Id, _productId, _variantB, 4, "SESS-B", "CheckoutSession");

        rA.VariantId.Should().Be(_variantA);
        rB.VariantId.Should().Be(_variantB);
        stockA.AvailableQuantity.Should().Be(0);
        stockB.AvailableQuantity.Should().Be(1);
    }

    [Fact]
    public void Release_TraChoTonNhungKhongDoiVariantId()
    {
        var r = new StockReservation(_invItemA, _productId, _variantA, 2,
            "ORD-003", "Order");

        r.Release("cancel");

        r.Status.Should().Be(ReservationStatus.Released);
        r.VariantId.Should().Be(_variantA); // Snapshot không đổi.
        r.ReleasedAt.Should().NotBeNull();
    }

    [Fact]
    public void Fulfill_XacNhanNhungKhongDoiVariantId()
    {
        var r = new StockReservation(_invItemB, _productId, _variantB, 1,
            "ORD-004", "Order");

        r.Fulfill();

        r.Status.Should().Be(ReservationStatus.Fulfilled);
        r.VariantId.Should().Be(_variantB);
    }

    [Fact]
    public void ReferenceType_ChapNhanCheckoutSession()
    {
        var r = new StockReservation(_invItemA, _productId, _variantA, 1,
            referenceId: Guid.NewGuid().ToString(), referenceType: "CheckoutSession");

        r.ReferenceType.Should().Be("CheckoutSession");
    }
}
