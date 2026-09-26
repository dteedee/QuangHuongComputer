using BuildingBlocks.Endpoints;
using FluentAssertions;
using InventoryModule.Domain;
using Xunit;

namespace UnitTests.Inventory;

/// <summary>
/// Máy trạng thái phiếu chuyển kho: huỷ chỉ khi chưa xuất (lỗi cũ: huỷ phiếu đang chạy làm mất hàng),
/// nhận có chênh lệch phải ghi chú, lỗi trạng thái là 409 tiếng Việt.
/// </summary>
public class StockTransferWorkflowTests
{
    private static StockTransfer NewTransfer(int qty = 3) => new(
        "CK-001", Guid.NewGuid(), Guid.NewGuid(),
        new List<StockTransferItem> { new(Guid.NewGuid(), qty, "Laptop A", "SKU-A", new[] { "S1", "S2", "S3" }.Take(qty)) },
        "u1");

    private static StockTransfer Shipped(int qty = 3)
    {
        var t = NewTransfer(qty);
        t.Approve("u2");
        t.Ship("u3");
        return t;
    }

    [Fact]
    public void LuongDayDu_GhiNguoiVaThoiDiemTungBuoc()
    {
        var t = Shipped();
        t.Receive("u4");

        t.Status.Should().Be(TransferStatus.Received);
        (t.ApprovedBy, t.ShippedBy, t.ReceivedBy).Should().Be(("u2", "u3", "u4"));
        t.Items.Single().ReceivedQuantity.Should().Be(3);
        t.HasDiscrepancy.Should().BeFalse();
    }

    [Fact]
    public void NhanThieu_CoGhiChu_DanhDauChenhLech()
    {
        var t = Shipped();
        var line = t.Items.Single();

        t.Receive("u4", new Dictionary<Guid, int> { [line.Id] = 2 }, "Vỡ 1 máy khi vận chuyển");

        line.ReceivedQuantity.Should().Be(2);
        line.Shortage.Should().Be(1);
        t.HasDiscrepancy.Should().BeTrue();
        t.ReceiveNote.Should().Be("Vỡ 1 máy khi vận chuyển");
    }

    [Fact]
    public void NhanThieu_KhongGhiChu_BiTuChoi()
    {
        var t = Shipped();
        var act = () => t.Receive("u4", new Dictionary<Guid, int> { [t.Items.Single().Id] = 1 });

        act.Should().Throw<DomainException>().WithMessage("*ghi chú*");
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(4)]
    public void SoNhanNgoaiKhoang_BiTuChoi(int received)
    {
        var t = Shipped();
        var act = () => t.Receive("u4", new Dictionary<Guid, int> { [t.Items.Single().Id] = received }, "x");

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void DongKhongThuocPhieu_BiTuChoi()
    {
        var t = Shipped();
        var act = () => t.Receive("u4", new Dictionary<Guid, int> { [Guid.NewGuid()] = 1 }, "x");

        act.Should().Throw<DomainException>().WithMessage("*không thuộc*");
    }

    [Fact]
    public void HuyPhieuDangVanChuyen_BiChan()
    {
        var t = Shipped();

        var act = () => t.Cancel("u5");

        act.Should().Throw<ConflictException>();
        t.Status.Should().Be(TransferStatus.Shipped);
    }

    [Fact]
    public void HuyPhieuDaDuyet_GhiNguoiHuy()
    {
        var t = NewTransfer();
        t.Approve("u2");

        t.Cancel("u5");

        t.Status.Should().Be(TransferStatus.Cancelled);
        t.CancelledBy.Should().Be("u5");
        t.CancelledAt.Should().NotBeNull();
    }

    [Fact]
    public void XuatKhiChuaDuyet_Hoac_XuatHaiLan_La409()
    {
        var pending = NewTransfer();
        pending.Invoking(t => t.Ship("u3")).Should().Throw<ConflictException>().WithMessage("*Chờ duyệt*");

        var shipped = Shipped();
        shipped.Invoking(t => t.Ship("u3")).Should().Throw<ConflictException>();
    }

    [Fact]
    public void Serial_DangChuyen_KhongConInStock_NhanXongVeKhoDich()
    {
        var from = Guid.NewGuid();
        var to = Guid.NewGuid();
        var serial = new SerialNumber("SN-1", Guid.NewGuid(), from);

        serial.StartTransit("CK-001");
        serial.Status.Should().Be(SerialStatus.InTransit);
        serial.WarehouseId.Should().Be(from);
        serial.Invoking(s => s.StartTransit("CK-002")).Should().Throw<InvalidOperationException>();

        serial.CompleteTransit(to);
        serial.Status.Should().Be(SerialStatus.InStock);
        serial.WarehouseId.Should().Be(to);
    }
}
