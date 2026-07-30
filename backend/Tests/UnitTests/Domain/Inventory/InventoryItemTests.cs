using FluentAssertions;
using InventoryModule.Domain;
using Xunit;

namespace UnitTests.Domain.Inventory;

/// <summary>
/// Tồn kho: khả dụng = tồn thực - đã giữ chỗ. Không được bán vượt tồn khả dụng.
/// </summary>
public class InventoryItemTests
{
    private static InventoryItem NewItem(int onHand = 10, int reorderLevel = 5)
        => new InventoryItem(Guid.NewGuid(), onHand, reorderLevel);

    [Fact]
    public void KhoiTao_TonKhaDungBangTonThuc_ChuaGiuChoGi()
    {
        var item = NewItem(10);

        item.QuantityOnHand.Should().Be(10);
        item.ReservedQuantity.Should().Be(0);
        item.AvailableQuantity.Should().Be(10);
    }

    [Fact]
    public void ReserveStock_TrongTonKhaDung_GiamTonKhaDung()
    {
        var item = NewItem(10);

        item.ReserveStock(3);

        item.ReservedQuantity.Should().Be(3);
        item.AvailableQuantity.Should().Be(7);
        item.QuantityOnHand.Should().Be(10); // tồn thực chưa đổi
    }

    [Fact]
    public void ReserveStock_DungBangTonKhaDung_ChoPhep()
    {
        var item = NewItem(10);

        item.ReserveStock(10);

        item.AvailableQuantity.Should().Be(0);
    }

    [Fact]
    public void ReserveStock_VuotTonKhaDung_NemLoi()
    {
        var item = NewItem(10);

        var act = () => item.ReserveStock(11);

        act.Should().Throw<InvalidOperationException>();
        item.ReservedQuantity.Should().Be(0);
    }

    [Fact]
    public void ReserveStock_GiuChoNhieuLanVuotTon_NemLoiOLanCuoi()
    {
        var item = NewItem(10);
        item.ReserveStock(6);

        var act = () => item.ReserveStock(5);

        act.Should().Throw<InvalidOperationException>();
        item.ReservedQuantity.Should().Be(6);
    }

    [Fact]
    public void ReleaseReservedStock_NhaGiuCho_TonKhaDungVeNhuCu()
    {
        var item = NewItem(10);
        var before = item.AvailableQuantity;
        item.ReserveStock(4);

        item.ReleaseReservedStock(4);

        item.ReservedQuantity.Should().Be(0);
        item.AvailableQuantity.Should().Be(before);
        item.QuantityOnHand.Should().Be(10);
    }

    [Fact]
    public void ReleaseReservedStock_NhaNhieuHonDaGiu_ChanTaiKhongKhongAm()
    {
        var item = NewItem(10);
        item.ReserveStock(2);

        item.ReleaseReservedStock(5);

        item.ReservedQuantity.Should().Be(0);
        item.AvailableQuantity.Should().Be(10);
    }

    [Fact]
    public void ConfirmReservedStock_XuatHang_TruCaTonThucVaGiuCho()
    {
        var item = NewItem(10);
        item.ReserveStock(4);

        item.ConfirmReservedStock(4);

        item.QuantityOnHand.Should().Be(6);
        item.ReservedQuantity.Should().Be(0);
        item.AvailableQuantity.Should().Be(6);
    }

    [Fact]
    public void ConfirmReservedStock_MotPhan_GiuLaiPhanConLai()
    {
        var item = NewItem(10);
        item.ReserveStock(5);

        item.ConfirmReservedStock(2);

        item.QuantityOnHand.Should().Be(8);
        item.ReservedQuantity.Should().Be(3);
        item.AvailableQuantity.Should().Be(5);
    }

    [Fact]
    public void ReserveStock_SoLuongKhong_KhongThayDoiTonKho()
    {
        var item = NewItem(10);

        item.ReserveStock(0);

        item.ReservedQuantity.Should().Be(0);
        item.AvailableQuantity.Should().Be(10);
    }

    [Fact]
    public void AdjustStock_NhapThemVaXuatBot_CapNhatTonThuc()
    {
        var item = NewItem(10);

        item.AdjustStock(5, "Nhập hàng NCC");
        item.AdjustStock(-3, "Hàng lỗi");

        item.QuantityOnHand.Should().Be(12);
    }

    [Fact]
    public void IsLowStock_DuoiHoacBangNguong_BaoSapHet()
    {
        NewItem(onHand: 5, reorderLevel: 5).IsLowStock().Should().BeTrue();
        NewItem(onHand: 4, reorderLevel: 5).IsLowStock().Should().BeTrue();
        NewItem(onHand: 6, reorderLevel: 5).IsLowStock().Should().BeFalse();
    }

    [Fact]
    public void NeedsReorder_HetHang_PhaiDatHangLai()
    {
        var item = NewItem(onHand: 0, reorderLevel: 5);

        item.NeedsReorder().Should().BeTrue();
    }

    [Fact]
    public void SetLowStockThreshold_DoiNguong_DoiKetQuaCanhBao()
    {
        var item = NewItem(onHand: 8, reorderLevel: 5);
        item.IsLowStock().Should().BeFalse();

        item.SetLowStockThreshold(10);

        item.IsLowStock().Should().BeTrue();
    }

    /// <summary>
    /// ReserveStock với số lượng âm phải throw ArgumentException (không được làm phồng AvailableQuantity).
    /// </summary>
    [Fact]
    public void ReserveStock_SoLuongAm_PhaiNemLoiChuKhongLamPhongTonKhaDung()
    {
        var item = NewItem(10);

        var act = () => item.ReserveStock(-5);

        act.Should().Throw<ArgumentException>();
        item.AvailableQuantity.Should().Be(10);
    }

    /// <summary>
    /// ConfirmReservedStock vượt tồn thực phải throw InvalidOperationException
    /// (tồn kho vật lý không được âm).
    /// </summary>
    [Fact]
    public void ConfirmReservedStock_VuotTonThuc_KhongDuocLamTonKhoAm()
    {
        var item = NewItem(3);

        var act = () => item.ConfirmReservedStock(5);

        act.Should().Throw<InvalidOperationException>();
        item.QuantityOnHand.Should().BeGreaterOrEqualTo(0);
    }
}
