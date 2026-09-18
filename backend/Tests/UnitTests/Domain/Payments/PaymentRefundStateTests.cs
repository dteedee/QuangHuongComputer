using FluentAssertions;
using Payments.Domain;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// W2-4 / D04 mục 4 — `Succeeded` là trạng thái cuối, chỉ đi tiếp sang hoàn tiền; và không bao giờ
/// hoàn quá số đã thu. Đây là hai chỗ tiền biến mất nếu sai.
/// </summary>
public class PaymentRefundStateTests
{
    private static PaymentIntent Paid(decimal amount = 10_000_000m)
    {
        var p = PaymentIntent.Create(Guid.NewGuid(), amount, "VND", PaymentProvider.SePay, Guid.NewGuid().ToString());
        p.Succeed();
        return p;
    }

    [Fact]
    public void HoanMotPhan_ThiSangPartiallyRefunded()
    {
        var p = Paid();
        p.RegisterRefund(3_000_000m).Should().BeFalse("chưa hoàn hết");
        p.Status.Should().Be(PaymentStatus.PartiallyRefunded);
        p.AmountRefunded.Should().Be(3_000_000m);
    }

    [Fact]
    public void HoanHet_ThiSangRefunded()
    {
        var p = Paid();
        p.RegisterRefund(4_000_000m);
        p.RegisterRefund(6_000_000m).Should().BeTrue();
        p.Status.Should().Be(PaymentStatus.Refunded);
    }

    [Fact]
    public void HoanVuotSoDaThu_ThiNem()
    {
        var p = Paid();
        p.RegisterRefund(9_000_000m);
        var act = () => p.RegisterRefund(2_000_000m);
        act.Should().Throw<InvalidOperationException>();
        p.AmountRefunded.Should().Be(9_000_000m);
    }

    [Fact]
    public void HoanKhiChuaThuDuocTien_ThiNem()
    {
        var p = PaymentIntent.Create(Guid.NewGuid(), 1000m, "VND", PaymentProvider.COD, Guid.NewGuid().ToString());
        var act = () => p.RegisterRefund(500m);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void SucceedSauKhiDaHoan_ThiNem()
    {
        var p = Paid();
        p.RegisterRefund(10_000_000m);
        var act = () => p.Succeed();
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void FailSauKhiDaHoanMotPhan_KhongDoiTrangThai()
    {
        var p = Paid();
        p.RegisterRefund(1_000_000m);
        p.Fail("callback lỗi đến muộn");
        p.Status.Should().Be(PaymentStatus.PartiallyRefunded);
    }

    [Fact]
    public void PhieuHoan_ChiCompleteDuocKhiCoMaThamChieu()
    {
        var intent = Paid();
        var refund = PaymentRefund.Request(
            intent, 1_000_000m, RefundChannel.ManualTransfer, "Khách trả hàng", null, "key-1");

        refund.Status.Should().Be(RefundStatus.Requested);
        var act = () => refund.Complete("   ", RefundChannel.Cash);
        act.Should().Throw<ArgumentException>();

        refund.Approve(null);
        refund.Complete("FT26091800123", RefundChannel.ManualTransfer);
        refund.Status.Should().Be(RefundStatus.Completed);
        refund.Reference.Should().Be("FT26091800123");
    }

    [Fact]
    public void PhieuHoan_CongLoi_ThiThanhViecThuCong()
    {
        var refund = PaymentRefund.Request(
            Paid(), 500_000m, RefundChannel.Gateway, "Huỷ đơn đã trả", null, "key-2");
        refund.MarkGatewayFailed("Cổng từ chối");

        refund.Status.Should().Be(RefundStatus.Failed);
        refund.Channel.Should().Be(RefundChannel.ManualTransfer, "không để bản ghi lơ lửng");
    }

    [Fact]
    public void HetHanGiuDon_ChiHuyDuocIntentConPending()
    {
        var pending = PaymentIntent.Create(Guid.NewGuid(), 1000m, "VND", PaymentProvider.SePay, "k1");
        pending.Expire("Hết hạn").Should().BeTrue();
        pending.Status.Should().Be(PaymentStatus.Cancelled);

        var paid = Paid();
        paid.Expire("Hết hạn").Should().BeFalse("không bao giờ chạm vào khoản đã thu");
        paid.Status.Should().Be(PaymentStatus.Succeeded);
    }

    [Fact]
    public void XacNhanTay_BatBuocCoMaThamChieuNganHang()
    {
        var p = PaymentIntent.Create(Guid.NewGuid(), 1000m, "VND", PaymentProvider.SePay, "k2");
        var act = () => p.ConfirmManually("");
        act.Should().Throw<ArgumentException>();

        p.ConfirmManually("FT26091800999");
        p.Status.Should().Be(PaymentStatus.Succeeded);
        p.ReconciliationReference.Should().Be("FT26091800999");
    }

    [Fact]
    public void ThuCod_ThiChuyenSangChoNopQuy()
    {
        var p = PaymentIntent.Create(Guid.NewGuid(), 1000m, "VND", PaymentProvider.COD, "k3");
        p.Succeed();
        p.MarkCodAwaitingRemittance();
        p.Settlement.Should().Be(CodSettlementStatus.AwaitingRemittance);

        p.MarkCodRemitted();
        p.Settlement.Should().Be(CodSettlementStatus.Remitted);
    }
}
