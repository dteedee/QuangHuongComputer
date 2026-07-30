using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// Phase 04 — CheckoutSession giữ chỗ 15 phút, cho gia hạn ĐÚNG 1 lần.
/// Hết hạn → cleanup phải nhả reservation kèm theo.
/// </summary>
public class CheckoutSessionTests
{
    private readonly Guid _cartId = Guid.NewGuid();
    private readonly Guid _customerId = Guid.NewGuid();

    [Fact]
    public void Create_MacDinh15Phut_StatusActive()
    {
        var s = CheckoutSession.Create(_cartId, _customerId);

        s.CartId.Should().Be(_cartId);
        s.CustomerId.Should().Be(_customerId);
        s.Status.Should().Be(CheckoutSessionStatus.Active);
        s.WasExtended.Should().BeFalse();
        s.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(15), TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void Create_GuestKhongCustomer_ChapNhan()
    {
        var s = CheckoutSession.Create(_cartId, customerId: null);

        s.CustomerId.Should().BeNull();
        s.Status.Should().Be(CheckoutSessionStatus.Active);
    }

    [Fact]
    public void Create_HoldMinutesQua60_NemLoi()
    {
        var act = () => CheckoutSession.Create(_cartId, _customerId, holdMinutes: 61);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Extend_LanDau_ThanhCong_MarkWasExtended()
    {
        var s = CheckoutSession.Create(_cartId, _customerId, holdMinutes: 15);
        var before = s.ExpiresAt;

        s.Extend(additionalMinutes: 15);

        s.WasExtended.Should().BeTrue();
        s.ExpiresAt.Should().BeCloseTo(before.AddMinutes(15), TimeSpan.FromSeconds(2));
    }

    [Fact]
    public void Extend_LanThuHai_NemLoi()
    {
        var s = CheckoutSession.Create(_cartId, _customerId);
        s.Extend();

        var act = () => s.Extend();

        act.Should().Throw<InvalidOperationException>()
           .WithMessage("*đã gia hạn 1 lần*");
    }

    [Fact]
    public void AttachReservation_NhieuLan_LuuDayDu()
    {
        var s = CheckoutSession.Create(_cartId, _customerId);
        var r1 = Guid.NewGuid();
        var r2 = Guid.NewGuid();

        s.AttachReservation(r1);
        s.AttachReservation(r2);

        s.ReservationIds.Should().BeEquivalentTo(new[] { r1, r2 });
    }

    [Fact]
    public void Complete_ChuyenStatusThanhCompleted()
    {
        var s = CheckoutSession.Create(_cartId, _customerId);
        s.Complete();

        s.Status.Should().Be(CheckoutSessionStatus.Completed);
    }

    [Fact]
    public void Cancel_Idempotent_HuyLan2KhongLoi()
    {
        var s = CheckoutSession.Create(_cartId, _customerId);
        s.Cancel();
        s.Cancel(); // idempotent

        s.Status.Should().Be(CheckoutSessionStatus.Cancelled);
    }

    [Fact]
    public void MarkExpired_KhiActive_ChuyenExpired()
    {
        var s = CheckoutSession.Create(_cartId, _customerId);
        s.MarkExpired();

        s.Status.Should().Be(CheckoutSessionStatus.Expired);
    }

    [Fact]
    public void MarkExpired_SauKhiCompleted_KhongDoi()
    {
        var s = CheckoutSession.Create(_cartId, _customerId);
        s.Complete();
        s.MarkExpired();

        s.Status.Should().Be(CheckoutSessionStatus.Completed);
    }

    [Fact]
    public void AttachReservation_SauKhiCompleted_NemLoi()
    {
        var s = CheckoutSession.Create(_cartId, _customerId);
        s.Complete();

        var act = () => s.AttachReservation(Guid.NewGuid());

        act.Should().Throw<InvalidOperationException>();
    }
}
