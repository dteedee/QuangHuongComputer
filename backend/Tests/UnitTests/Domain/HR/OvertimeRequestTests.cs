using FluentAssertions;
using HR.Domain;
using Xunit;

namespace UnitTests.Domain.HR;

/// <summary>
/// OvertimeRequest: state machine Pending → Approved → Executed | Rejected | Cancelled.
/// Chỉ tính tiền phần đã Approved. ActualHours không vượt quá RequestedHours.
/// </summary>
public class OvertimeRequestTests
{
    private static OvertimeRequest NewRequest(
        DateTime? date = null,
        int startHour = 18, int endHour = 21)
        => new(
            Guid.NewGuid(),
            date ?? new DateTime(2026, 6, 15),
            new TimeOnly(startHour, 0),
            new TimeOnly(endHour, 0),
            "Hoàn thành dự án gấp");

    [Fact]
    public void Constructor_TinhRequestedHours()
    {
        var r = NewRequest(startHour: 18, endHour: 21);
        r.RequestedHours.Should().Be(3m);
        r.Status.Should().Be(OvertimeStatus.Pending);
    }

    [Fact]
    public void Constructor_EndTimeTruocStartTime_NemLoi()
    {
        var act = () => new OvertimeRequest(
            Guid.NewGuid(), DateTime.Today,
            new TimeOnly(21, 0), new TimeOnly(18, 0), "abc");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Constructor_ThieuReason_NemLoi()
    {
        var act = () => new OvertimeRequest(
            Guid.NewGuid(), DateTime.Today,
            new TimeOnly(18, 0), new TimeOnly(21, 0), "");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Approve_TuPending_ThanhCong()
    {
        var r = NewRequest();
        var mgr = Guid.NewGuid();

        r.Approve(mgr);

        r.Status.Should().Be(OvertimeStatus.Approved);
        r.ApprovedBy.Should().Be(mgr);
        r.ApprovedAt.Should().NotBeNull();
    }

    [Fact]
    public void Approve_TuStateKhac_NemLoi()
    {
        var r = NewRequest();
        r.Approve(Guid.NewGuid());

        var act = () => r.Approve(Guid.NewGuid());

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Reject_ThieuReason_NemLoi()
    {
        var r = NewRequest();

        var act = () => r.Reject(Guid.NewGuid(), "");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void RecordActualHours_ChuaApprove_NemLoi()
    {
        var r = NewRequest();

        var act = () => r.RecordActualHours(2m);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void RecordActualHours_VuotQuaRequested_ChiTinhToiDaRequested()
    {
        var r = NewRequest(startHour: 18, endHour: 20);   // requested 2h
        r.Approve(Guid.NewGuid());

        r.RecordActualHours(4m);   // làm 4h

        r.ActualHours.Should().Be(2m);   // chỉ tính 2h
        r.PayableHours().Should().Be(2m);
        r.Status.Should().Be(OvertimeStatus.Executed);
    }

    [Fact]
    public void PayableHours_TrangThaiPending_TraVe0()
    {
        var r = NewRequest();

        r.PayableHours().Should().Be(0);
    }

    [Fact]
    public void PayableHours_Approved_TraRequestedHours()
    {
        var r = NewRequest(startHour: 18, endHour: 20);
        r.Approve(Guid.NewGuid());

        r.PayableHours().Should().Be(2m);
    }

    [Fact]
    public void Cancel_TuExecuted_NemLoi()
    {
        var r = NewRequest();
        r.Approve(Guid.NewGuid());
        r.RecordActualHours(1m);

        var act = () => r.Cancel();

        act.Should().Throw<InvalidOperationException>();
    }
}
