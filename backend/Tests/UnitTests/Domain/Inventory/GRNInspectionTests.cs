using FluentAssertions;
using InventoryModule.Domain;
using Xunit;

namespace UnitTests.Domain.Inventory;

/// <summary>
/// Kiểm hàng khi nhận: mỗi dòng GRN chia AcceptedQty + RejectedQty.
/// Có hàng lỗi thì bắt buộc nhập lý do.
/// </summary>
public class GRNInspectionTests
{
    private static GRNItem NewItem(int qty = 10)
    {
        return new GRNItem
        {
            ProductId = Guid.NewGuid(),
            ProductName = "Máy A",
            Quantity = qty,
            UnitCost = 5_000_000m
        };
    }

    [Fact]
    public void Inspect_TongDungBangSoNhan_LuuKetQua()
    {
        var item = NewItem(10);

        item.Inspect(8, 2, "2 máy lỗi màn hình");

        item.AcceptedQty.Should().Be(8);
        item.RejectedQty.Should().Be(2);
        item.RejectReason.Should().Be("2 máy lỗi màn hình");
    }

    [Fact]
    public void Inspect_TongKhongKhopSoNhan_NemLoi()
    {
        var item = NewItem(10);

        var act = () => item.Inspect(7, 2);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Inspect_CoHangLoiKhongLyDo_NemLoi()
    {
        var item = NewItem(10);

        var act = () => item.Inspect(8, 2, null);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Inspect_SoLuongAm_NemLoi()
    {
        var item = NewItem(10);

        var act = () => item.Inspect(-1, 11, "x");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Inspect_TatCaDeuDat_KhongCanLyDo()
    {
        var item = NewItem(10);

        item.Inspect(10, 0);

        item.AcceptedQty.Should().Be(10);
        item.RejectedQty.Should().Be(0);
        item.RejectReason.Should().BeNull();
    }

    [Fact]
    public void HasRejectedItems_KhiCoDongLoi_TraveTrue()
    {
        var grn = new GoodsReceivedNote();
        var item = NewItem(10);
        grn.Items.Add(item);
        item.Inspect(8, 2, "Vỏ móp");

        grn.HasRejectedItems.Should().BeTrue();
    }

    [Fact]
    public void IsFullyInspected_KhiTatCaDongDaKiem_TraveTrue()
    {
        var grn = new GoodsReceivedNote();
        var a = NewItem(5); a.Inspect(5, 0);
        var b = NewItem(3); b.Inspect(2, 1, "lỗi");
        grn.Items.Add(a); grn.Items.Add(b);

        grn.IsFullyInspected.Should().BeTrue();
    }

    [Fact]
    public void IsFullyInspected_KhiCoDongChuaKiem_TraveFalse()
    {
        var grn = new GoodsReceivedNote();
        var a = NewItem(5); a.Inspect(5, 0);
        var b = NewItem(3); // chưa kiểm
        grn.Items.Add(a); grn.Items.Add(b);

        grn.IsFullyInspected.Should().BeFalse();
    }
}
