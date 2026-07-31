using FluentAssertions;
using InventoryModule.Domain;
using Xunit;

namespace UnitTests.Domain.Inventory;

/// <summary>
/// Phiếu trả hàng NCC: Draft → Sent → Accepted → Refunded.
/// Đúng như quy trình thực: gửi phiếu → NCC chấp nhận → NCC hoàn tiền.
/// </summary>
public class PurchaseReturnTests
{
    private static PurchaseReturn NewReturn(int qty = 2)
    {
        var items = new List<PurchaseReturnItem>
        {
            new PurchaseReturnItem(Guid.NewGuid(), "SSD lỗi", qty, 1_500_000m, "Không boot")
        };
        return new PurchaseReturn(Guid.NewGuid(), items);
    }

    [Fact]
    public void KhoiTao_KhongCoItem_NemLoi()
    {
        var act = () => new PurchaseReturn(Guid.NewGuid(), new List<PurchaseReturnItem>());
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void KhoiTao_TinhTongGiaTri()
    {
        var ret = NewReturn(qty: 3);
        ret.TotalValue.Should().Be(3 * 1_500_000m);
        ret.Status.Should().Be(PurchaseReturnStatus.Draft);
        ret.Number.Should().StartWith("PR-RET-");
    }

    [Fact]
    public void Confirm_TuDraft_ChuyenSangSent()
    {
        var ret = NewReturn();
        ret.Confirm();
        ret.Status.Should().Be(PurchaseReturnStatus.Sent);
    }

    [Fact]
    public void Accept_KhiChuaSent_NemLoi()
    {
        var ret = NewReturn();
        var act = () => ret.Accept();
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void MarkRefunded_KhiChuaAccepted_NemLoi()
    {
        var ret = NewReturn();
        ret.Confirm();
        var act = () => ret.MarkRefunded(1_000_000m);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void MarkRefunded_KhiDaAccepted_LuuSoTien()
    {
        var ret = NewReturn(qty: 2); // total = 3tr
        ret.Confirm();
        ret.Accept();

        ret.MarkRefunded(2_500_000m); // NCC hoàn 2.5tr

        ret.Status.Should().Be(PurchaseReturnStatus.Refunded);
        ret.RefundAmount.Should().Be(2_500_000m);
    }

    [Fact]
    public void MarkRefunded_SoTienAm_NemLoi()
    {
        var ret = NewReturn();
        ret.Confirm();
        ret.Accept();
        var act = () => ret.MarkRefunded(-1m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Cancel_KhiDaRefunded_NemLoi()
    {
        var ret = NewReturn();
        ret.Confirm();
        ret.Accept();
        ret.MarkRefunded(0m);

        var act = () => ret.Cancel();
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void PurchaseReturnItem_QtyBangKhong_NemLoi()
    {
        var act = () => new PurchaseReturnItem(Guid.NewGuid(), "x", 0, 100m);
        act.Should().Throw<ArgumentException>();
    }
}
