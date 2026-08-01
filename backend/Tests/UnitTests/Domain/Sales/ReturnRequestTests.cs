using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// Phase 07: 3 luồng Refund / Exchange / Replace + state machine.
/// Chống gian lận: không Complete được nếu chưa RecordInspection.
/// </summary>
public class ReturnRequestTests
{
    private static (Guid orderId, Guid orderItemId) NewIds() => (Guid.NewGuid(), Guid.NewGuid());

    [Fact]
    public void RequestRefund_TaoDungLoai_VaTrangThaiPending()
    {
        var (o, i) = NewIds();
        var rr = ReturnRequest.RequestRefund(o, i, "Không thích", 1_000_000m, description: "desc");
        rr.Type.Should().Be(ReturnType.Refund);
        rr.Status.Should().Be(ReturnStatus.Pending);
        rr.RefundAmount.Should().Be(1_000_000m);
        rr.ExchangeProductId.Should().BeNull();
    }

    [Fact]
    public void RequestExchange_YeuCauExchangeProductId()
    {
        var (o, i) = NewIds();
        var newP = Guid.NewGuid();
        var rr = ReturnRequest.RequestExchange(o, i, newP, null, "Đổi loại khác", 20_000_000m);
        rr.Type.Should().Be(ReturnType.Exchange);
        rr.ExchangeProductId.Should().Be(newP);
    }

    [Fact]
    public void RequestReplace_KhongYeuCauSPKhac()
    {
        var (o, i) = NewIds();
        var rr = ReturnRequest.RequestReplace(o, i, "Máy lỗi cùng loại", 15_000_000m);
        rr.Type.Should().Be(ReturnType.Replace);
        rr.ExchangeProductId.Should().BeNull();
    }

    [Fact]
    public void Approve_ChiPending_MoiChoDuyet()
    {
        var (o, i) = NewIds();
        var rr = ReturnRequest.RequestRefund(o, i, "x", 100);
        rr.Approve("emp-01", "COD-Refund");
        rr.Status.Should().Be(ReturnStatus.Approved);
        rr.RefundMethod.Should().Be("COD-Refund");

        var ex = Assert.Throws<InvalidOperationException>(() => rr.Approve("emp-02"));
        ex.Message.Should().Contain("chờ");
    }

    [Fact]
    public void Reject_LuuLyDo()
    {
        var (o, i) = NewIds();
        var rr = ReturnRequest.RequestRefund(o, i, "x", 100);
        rr.Reject("Ngoài hạn 7 ngày", "emp-01");
        rr.Status.Should().Be(ReturnStatus.Rejected);
        rr.RejectionReason.Should().Contain("hạn");
    }

    [Fact]
    public void Complete_ChanKhiChuaKiemHang_ChongGianLan()
    {
        var (o, i) = NewIds();
        var rr = ReturnRequest.RequestRefund(o, i, "x", 100);
        rr.Approve("emp-01");
        var ex = Assert.Throws<InvalidOperationException>(() => rr.Complete("emp-01"));
        ex.Message.Should().Contain("kiểm hàng");
    }

    [Fact]
    public void CompleteRefund_SauKiemHang_CapNhatRefundAmount()
    {
        var (o, i) = NewIds();
        var rr = ReturnRequest.RequestRefund(o, i, "x", 1_000_000m);
        rr.Approve("emp-01");
        rr.RecordInspection(ReceivedCondition.MissingAccessories, Guid.NewGuid(), Guid.NewGuid(), "thiếu sạc");
        rr.Complete("emp-01", finalRefundAmount: 800_000m);
        rr.Status.Should().Be(ReturnStatus.Completed);
        rr.RefundAmount.Should().Be(800_000m);
        rr.RefundedAt.Should().NotBeNull();
    }

    [Fact]
    public void CompleteReplace_KhongCapNhatRefundedAt()
    {
        var (o, i) = NewIds();
        var rr = ReturnRequest.RequestReplace(o, i, "x", 100);
        rr.Approve("emp-01");
        rr.RecordInspection(ReceivedCondition.DefectiveTechnical, Guid.NewGuid(), Guid.NewGuid());
        rr.Complete("emp-01");
        rr.Status.Should().Be(ReturnStatus.Completed);
        rr.RefundedAt.Should().BeNull();
    }

    [Fact]
    public void RecordInspection_YeuCauApproved()
    {
        var (o, i) = NewIds();
        var rr = ReturnRequest.RequestRefund(o, i, "x", 100);
        var ex = Assert.Throws<InvalidOperationException>(() =>
            rr.RecordInspection(ReceivedCondition.Intact, Guid.NewGuid(), Guid.NewGuid()));
        ex.Message.Should().Contain("duyệt");
    }

    [Fact]
    public void AttachExchangeOrder_ChiExchange()
    {
        var (o, i) = NewIds();
        var refund = ReturnRequest.RequestRefund(o, i, "x", 100);
        Assert.Throws<InvalidOperationException>(() => refund.AttachExchangeOrder(Guid.NewGuid(), 100));

        var exchange = ReturnRequest.RequestExchange(o, i, Guid.NewGuid(), null, "x", 100);
        exchange.AttachExchangeOrder(Guid.NewGuid(), 500_000m);
        exchange.PriceDifference.Should().Be(500_000m);
    }

    [Fact]
    public void AttachmentUrls_LuuJson()
    {
        var (o, i) = NewIds();
        var rr = ReturnRequest.RequestRefund(o, i, "x", 100, attachmentUrls: "[\"http://a\",\"http://b\"]");
        rr.AttachmentUrls.Should().Contain("http://a");
    }
}
