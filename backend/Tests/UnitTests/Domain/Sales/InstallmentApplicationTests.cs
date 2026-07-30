using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// Phase 04 — Hồ sơ trả góp: state machine + validate DownPayment ≤ tổng đơn.
/// </summary>
public class InstallmentApplicationTests
{
    private readonly Guid _orderId = Guid.NewGuid();

    [Fact]
    public void Create_HopLe_MonthlyAmountChiaDeu()
    {
        // 30tr, trả trước 6tr, còn 24tr chia 12 tháng → 2tr/tháng.
        var app = InstallmentApplication.Create(
            orderId: _orderId, provider: "HomeCredit",
            termMonths: 12, downPayment: 6_000_000m, orderTotal: 30_000_000m);

        app.Status.Should().Be(InstallmentStatus.PendingApproval);
        app.MonthlyAmount.Should().Be(2_000_000m);
        app.TotalAmount.Should().Be(30_000_000m);
    }

    [Fact]
    public void Create_TermMonthsSai_NemLoi()
    {
        var act = () => InstallmentApplication.Create(_orderId, "HomeCredit",
            termMonths: 24, downPayment: 0, orderTotal: 10_000_000m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_DownPaymentLonHonTong_NemLoi()
    {
        // Bảo vệ: down payment > tổng đơn là lỗi nghiệp vụ.
        var act = () => InstallmentApplication.Create(_orderId, "FeCredit",
            termMonths: 6, downPayment: 15_000_000m, orderTotal: 10_000_000m);
        act.Should().Throw<ArgumentException>()
           .WithMessage("*downPayment không được lớn hơn*");
    }

    [Fact]
    public void Create_DownPaymentAm_NemLoi()
    {
        var act = () => InstallmentApplication.Create(_orderId, "Manual",
            termMonths: 9, downPayment: -1m, orderTotal: 5_000_000m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_OrderTotalKhongDuong_NemLoi()
    {
        var act = () => InstallmentApplication.Create(_orderId, "Manual",
            termMonths: 6, downPayment: 0, orderTotal: 0);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Approve_KhiPending_ChuyenApproved_GhiApprover()
    {
        var app = InstallmentApplication.Create(_orderId, "HomeCredit", 6, 0, 6_000_000m);
        app.Approve("nhanvien01");

        app.Status.Should().Be(InstallmentStatus.Approved);
        app.ApprovedAt.Should().NotBeNull();
        app.ProcessedBy.Should().Be("nhanvien01");
    }

    [Fact]
    public void Approve_KhiKhongPending_NemLoi()
    {
        var app = InstallmentApplication.Create(_orderId, "HomeCredit", 6, 0, 6_000_000m);
        app.Approve("nv");

        var act = () => app.Approve("nv2");

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Reject_CoLyDo_ChuyenRejected()
    {
        var app = InstallmentApplication.Create(_orderId, "HomeCredit", 6, 0, 6_000_000m);
        app.Reject("Nợ xấu", "duyet01");

        app.Status.Should().Be(InstallmentStatus.Rejected);
        app.RejectionReason.Should().Be("Nợ xấu");
        app.RejectedAt.Should().NotBeNull();
    }

    [Fact]
    public void Reject_LyDoRong_NemLoi()
    {
        var app = InstallmentApplication.Create(_orderId, "HomeCredit", 6, 0, 6_000_000m);

        var act = () => app.Reject("", "duyet01");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Activate_ChiSauApproved()
    {
        var app = InstallmentApplication.Create(_orderId, "HomeCredit", 6, 0, 6_000_000m);
        app.Approve("nv");
        app.Activate();

        app.Status.Should().Be(InstallmentStatus.Active);
    }

    [Fact]
    public void Complete_ChiSauActive()
    {
        var app = InstallmentApplication.Create(_orderId, "HomeCredit", 6, 0, 6_000_000m);
        app.Approve("nv"); app.Activate();
        app.Complete();

        app.Status.Should().Be(InstallmentStatus.Completed);
        app.CompletedAt.Should().NotBeNull();
    }
}
