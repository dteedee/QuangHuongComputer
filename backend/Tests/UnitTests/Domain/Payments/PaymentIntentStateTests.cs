using FluentAssertions;
using Payments.Domain;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// W0-10 — `Succeeded` là TRẠNG THÁI CUỐI và số tiền chỉ đổi được khi còn Pending.
/// Trước đây `Fail()` ghi đè vô điều kiện: một callback lỗi/timeout đến muộn có thể "gỡ" một
/// khoản đã thu thật.
/// </summary>
public class PaymentIntentStateTests
{
    private static PaymentIntent New(decimal amount = 290_000m)
        => PaymentIntent.Create(Guid.NewGuid(), amount, "VND", PaymentProvider.SePay, Guid.NewGuid().ToString());

    [Fact]
    public void Fail_SauKhiSucceed_KhongDoiTrangThai()
    {
        var p = New();
        p.Succeed();
        p.Fail("Gateway timeout đến muộn");

        p.Status.Should().Be(PaymentStatus.Succeeded);
        p.FailureReason.Should().BeNull();
    }

    [Fact]
    public void Succeed_HaiLan_Idempotent()
    {
        var p = New();
        p.Succeed();
        p.Succeed();
        p.Status.Should().Be(PaymentStatus.Succeeded);
    }

    [Fact]
    public void Fail_TuPending_ChuyenSangFailed()
    {
        var p = New();
        p.Fail("Thẻ không đủ số dư");
        p.Status.Should().Be(PaymentStatus.Failed);
        p.FailureReason.Should().Be("Thẻ không đủ số dư");
    }

    [Fact]
    public void Succeed_SauKhiFail_VanChoPhep_KhachTraLai()
    {
        var p = New();
        p.Fail("Huỷ giữa chừng");
        p.Succeed();
        p.Status.Should().Be(PaymentStatus.Succeeded);
    }

    [Fact]
    public void ReviseAmount_KhiPending_DoiDuocSoTien()
    {
        var p = New(100_000m);
        p.ReviseAmount(290_000m);
        p.Amount.Should().Be(290_000m);
    }

    [Fact]
    public void ReviseAmount_KhiDaSucceeded_Nem()
    {
        var p = New();
        p.Succeed();
        var act = () => p.ReviseAmount(1m);
        act.Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void ReviseAmount_SoTienKhongHopLe_Nem(decimal amount)
    {
        var p = New();
        var act = () => p.ReviseAmount(amount);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
