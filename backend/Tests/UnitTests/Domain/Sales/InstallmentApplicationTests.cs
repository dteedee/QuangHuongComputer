using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// W2-20 — Hồ sơ trả góp lead-mode: state machine + validate DownPayment ≤ tổng đơn + hạn giữ hàng.
/// </summary>
public class InstallmentApplicationTests
{
    private readonly Guid _orderId = Guid.NewGuid();
    private static readonly DateTime Now = new(2026, 9, 18, 10, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Create_HopLe_MonthlyAmountChiaDeu()
    {
        // 30tr, trả trước 6tr, còn 24tr chia 12 tháng → 2tr/tháng.
        var app = InstallmentApplication.Create(
            orderId: _orderId, provider: "HomeCredit", termMonths: 12,
            downPayment: 6_000_000m, orderTotal: 30_000_000m, consentGiven: true, now: Now);

        app.Status.Should().Be(InstallmentStatus.PendingApproval);
        app.MonthlyAmount.Should().Be(2_000_000m);
        app.TotalAmount.Should().Be(30_000_000m);
        app.ConsentAt.Should().Be(Now);
        app.ExpiresAt.Should().Be(Now.AddHours(72));
    }

    [Fact]
    public void Create_LeadHoldHoursTuyChinh_ApDungDungGio()
    {
        var app = InstallmentApplication.Create(
            _orderId, "HomeCredit", 6, 0, 6_000_000m, consentGiven: true, now: Now, leadHoldHours: 24);

        app.ExpiresAt.Should().Be(Now.AddHours(24));
    }

    [Fact]
    public void Create_ChuaDongY_NemLoi()
    {
        var act = () => InstallmentApplication.Create(
            _orderId, "HomeCredit", 12, 0, 10_000_000m, consentGiven: false, now: Now);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_TermMonthsSai_NemLoi()
    {
        var act = () => InstallmentApplication.Create(
            _orderId, "HomeCredit", 24, 0, 10_000_000m, consentGiven: true, now: Now);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_DownPaymentLonHonTong_NemLoi()
    {
        // Bảo vệ: down payment > tổng đơn là lỗi nghiệp vụ.
        var act = () => InstallmentApplication.Create(
            _orderId, "FeCredit", 6, 15_000_000m, 10_000_000m, consentGiven: true, now: Now);
        act.Should().Throw<ArgumentException>()
           .WithMessage("*downPayment không được lớn hơn*");
    }

    [Fact]
    public void Create_DownPaymentAm_NemLoi()
    {
        var act = () => InstallmentApplication.Create(
            _orderId, "Manual", 9, -1m, 5_000_000m, consentGiven: true, now: Now);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_OrderTotalKhongDuong_NemLoi()
    {
        var act = () => InstallmentApplication.Create(
            _orderId, "Manual", 6, 0, 0, consentGiven: true, now: Now);
        act.Should().Throw<ArgumentException>();
    }

    private static InstallmentApplication CreateValid()
        => InstallmentApplication.Create(
            Guid.NewGuid(), "HomeCredit", 6, 0, 6_000_000m, consentGiven: true, now: Now);

    [Fact]
    public void Approve_KhiPending_ChuyenApproved_GhiSoHopDong()
    {
        var app = CreateValid();
        app.Approve("nhanvien01", "HC-000123", Now.AddDays(1));

        app.Status.Should().Be(InstallmentStatus.Approved);
        app.ApprovedAt.Should().NotBeNull();
        app.ProcessedBy.Should().Be("nhanvien01");
        app.FinanceContractNumber.Should().Be("HC-000123");
    }

    [Fact]
    public void Approve_ThieuSoHopDong_NemLoi()
    {
        var app = CreateValid();
        var act = () => app.Approve("nv", "", Now);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Approve_KhiKhongPending_NemLoi()
    {
        var app = CreateValid();
        app.Approve("nv", "HC-1", Now);

        var act = () => app.Approve("nv2", "HC-2", Now);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Reject_CoLyDo_ChuyenRejected()
    {
        var app = CreateValid();
        app.Reject("Nợ xấu", "duyet01", Now);

        app.Status.Should().Be(InstallmentStatus.Rejected);
        app.RejectionReason.Should().Be("Nợ xấu");
        app.RejectedAt.Should().NotBeNull();
    }

    [Fact]
    public void Reject_LyDoRong_NemLoi()
    {
        var app = CreateValid();
        var act = () => app.Reject("", "duyet01", Now);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Expire_KhiPending_ChuyenExpired()
    {
        var app = CreateValid();
        app.Expire(app.ExpiresAt!.Value.AddMinutes(1));

        app.Status.Should().Be(InstallmentStatus.Expired);
    }

    [Fact]
    public void Expire_KhiDaApproved_NemLoi()
    {
        // Hồ sơ đã duyệt (⇒ đơn đã Paid) không được hết hạn nữa - tránh huỷ nhầm đơn đã thu tiền.
        var app = CreateValid();
        app.Approve("nv", "HC-1", Now);

        var act = () => app.Expire(Now.AddDays(10));

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Activate_ChiSauApproved()
    {
        var app = CreateValid();
        app.Approve("nv", "HC-1", Now);
        app.Activate();

        app.Status.Should().Be(InstallmentStatus.Active);
    }

    [Fact]
    public void Complete_ChiSauActive()
    {
        var app = CreateValid();
        app.Approve("nv", "HC-1", Now);
        app.Activate();
        app.Complete();

        app.Status.Should().Be(InstallmentStatus.Completed);
        app.CompletedAt.Should().NotBeNull();
    }
}
