using FluentAssertions;
using HR.Domain;
using Xunit;

namespace UnitTests.Domain.HR;

/// <summary>
/// AttendanceRecord Phase 06: LateMinutes tính theo shift start, EarlyLeaveMinutes theo shift end,
/// manual entry bắt buộc reason + managerId, không cho check-in 2 lần.
/// </summary>
public class AttendanceRecordTests
{
    private static AttendanceRecord NewRecord(DateTime? date = null)
        => new(Guid.NewGuid(), date ?? new DateTime(2026, 6, 15));

    [Fact]
    public void RecordCheckIn_DungGioCa_KhongLateMinutes_StatusPresent()
    {
        var r = NewRecord(new DateTime(2026, 6, 15));

        r.RecordCheckIn(
            checkInTime: new DateTime(2026, 6, 15, 8, 0, 0),
            method: CheckInMethod.QR,
            shiftStartTime: new TimeSpan(8, 0, 0),
            lateToleranceMinutes: 5);

        r.LateMinutes.Should().Be(0);
        r.Status.Should().Be(AttendanceStatus.Present);
        r.CheckInMethod.Should().Be(CheckInMethod.QR);
    }

    [Fact]
    public void RecordCheckIn_MuonHonDungSai_TinhLateMinutes_StatusLate()
    {
        var r = NewRecord(new DateTime(2026, 6, 15));

        r.RecordCheckIn(
            checkInTime: new DateTime(2026, 6, 15, 8, 30, 0),  // muộn 30 phút
            method: CheckInMethod.GPS,
            shiftStartTime: new TimeSpan(8, 0, 0),
            lateToleranceMinutes: 5);

        r.LateMinutes.Should().Be(30);
        r.Status.Should().Be(AttendanceStatus.Late);
    }

    [Fact]
    public void RecordCheckIn_MuonTrongDungSai_KhongTinhLate()
    {
        var r = NewRecord(new DateTime(2026, 6, 15));

        r.RecordCheckIn(
            checkInTime: new DateTime(2026, 6, 15, 8, 3, 0),  // muộn 3 phút, dung sai 5
            method: CheckInMethod.GPS,
            shiftStartTime: new TimeSpan(8, 0, 0),
            lateToleranceMinutes: 5);

        r.LateMinutes.Should().Be(0);
        r.Status.Should().Be(AttendanceStatus.Present);
    }

    [Fact]
    public void RecordCheckIn_HaiLan_NemLoi()
    {
        var r = NewRecord();
        r.RecordCheckIn(new DateTime(2026, 6, 15, 8, 0, 0), CheckInMethod.QR);

        var act = () => r.RecordCheckIn(new DateTime(2026, 6, 15, 9, 0, 0), CheckInMethod.QR);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void RecordCheckOut_TinhWorkHours_TruBreak()
    {
        var r = NewRecord(new DateTime(2026, 6, 15));
        r.RecordCheckIn(new DateTime(2026, 6, 15, 8, 0, 0), CheckInMethod.QR);

        r.RecordCheckOut(
            checkOutTime: new DateTime(2026, 6, 15, 17, 0, 0),
            shiftEndTime: new TimeSpan(17, 0, 0),
            breakDurationMinutes: 60m);

        r.WorkHours.Should().Be(8m);       // 9h - 1h break
        r.EarlyLeaveMinutes.Should().Be(0);
    }

    [Fact]
    public void RecordCheckOut_VeSom_TinhEarlyLeaveMinutes()
    {
        var r = NewRecord(new DateTime(2026, 6, 15));
        r.RecordCheckIn(new DateTime(2026, 6, 15, 8, 0, 0), CheckInMethod.QR);

        r.RecordCheckOut(
            checkOutTime: new DateTime(2026, 6, 15, 16, 30, 0),  // sớm 30 phút
            shiftEndTime: new TimeSpan(17, 0, 0),
            earlyLeaveToleranceMinutes: 5);

        r.EarlyLeaveMinutes.Should().Be(30);
    }

    [Fact]
    public void RecordCheckOut_ChuaCheckIn_NemLoi()
    {
        var r = NewRecord();

        var act = () => r.RecordCheckOut(new DateTime(2026, 6, 15, 17, 0, 0));

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void SetApprovedOvertime_GhiNhanApprovedHours_KhongVuot()
    {
        var r = NewRecord();

        r.SetApprovedOvertime(2.5m);

        r.ApprovedOvertimeHours.Should().Be(2.5m);
    }

    [Fact]
    public void SetApprovedOvertime_Am_NemLoi()
    {
        var r = NewRecord();

        var act = () => r.SetApprovedOvertime(-1m);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void AdjustManually_ThieuReason_NemLoi()
    {
        var r = NewRecord();

        var act = () => r.AdjustManually(Guid.NewGuid(), "");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void AdjustManually_DuThongTin_GhiAuditTrail()
    {
        var r = NewRecord();
        var mgr = Guid.NewGuid();

        r.AdjustManually(
            managerId: mgr,
            reason: "Nhân viên quên quẹt thẻ, có ảnh xác nhận",
            checkInTime: new DateTime(2026, 6, 15, 8, 0, 0),
            checkOutTime: new DateTime(2026, 6, 15, 17, 0, 0),
            status: AttendanceStatus.Present);

        r.IsManualEntry.Should().BeTrue();
        r.ManualBy.Should().Be(mgr);
        r.ManualReason.Should().Contain("quên quẹt thẻ");
        r.CheckInMethod.Should().Be(CheckInMethod.Manual);
        r.WorkHours.Should().Be(9m);
    }
}
