using FluentAssertions;
using HR.Application.Attendance;
using HR.Domain;
using Xunit;

namespace UnitTests.Domain.HR;

/// <summary>
/// AttendanceAggregationService: tính StandardWorkDays, tổng hợp attendance,
/// gom OT approved/executed đúng theo loại ngày (weekday/CN/lễ), night hours.
/// </summary>
public class TimesheetAggregationTests
{
    [Fact]
    public void CalculateStandardWorkDays_Thang6Nam2026_TruCN()
    {
        // Tháng 6/2026 có 30 ngày, 4 CN (7, 14, 21, 28)
        // Không có ngày lễ VN trong tháng 6
        var days = AttendanceAggregationService.CalculateStandardWorkDays(2026, 6);
        days.Should().Be(26);   // 30 - 4 CN
    }

    [Fact]
    public void CalculateStandardWorkDays_Thang5Nam2026_TruCN_TruNgayLe()
    {
        // Tháng 5/2026: 31 ngày, 4-5 CN, có 30/4 GP, 1/5 QTLĐ. 30/4 rơi 4 chứ ko nằm tháng 5 → chỉ 1/5.
        var days = AttendanceAggregationService.CalculateStandardWorkDays(2026, 5);
        var expected = 31 - CountSundays(2026, 5) - (IsSunday(2026, 5, 1) ? 0 : 1);
        days.Should().Be(expected);
    }

    private static int CountSundays(int y, int m)
    {
        var days = DateTime.DaysInMonth(y, m);
        var count = 0;
        for (var d = 1; d <= days; d++)
            if (new DateTime(y, m, d).DayOfWeek == DayOfWeek.Sunday) count++;
        return count;
    }

    private static bool IsSunday(int y, int m, int d)
        => new DateTime(y, m, d).DayOfWeek == DayOfWeek.Sunday;

    // ============ MonthlyTimesheet lock/unlock ============

    [Fact]
    public void Lock_TuDraft_ThanhCong()
    {
        var ts = new MonthlyTimesheet(Guid.NewGuid(), 2026, 6);
        var mgr = Guid.NewGuid();

        ts.Lock(mgr);

        ts.Status.Should().Be(MonthlyTimesheetStatus.Locked);
        ts.LockedAt.Should().NotBeNull();
        ts.LockedBy.Should().Be(mgr);
    }

    [Fact]
    public void Lock_LanThuHai_NemLoi()
    {
        var ts = new MonthlyTimesheet(Guid.NewGuid(), 2026, 6);
        ts.Lock(Guid.NewGuid());

        var act = () => ts.Lock(Guid.NewGuid());

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void SetAttendanceAggregation_KhiLocked_NemLoi()
    {
        var ts = new MonthlyTimesheet(Guid.NewGuid(), 2026, 6);
        ts.Lock(Guid.NewGuid());

        var act = () => ts.SetAttendanceAggregation(22, 20, 2, 0, 0, 0);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Unlock_ThieuReason_NemLoi()
    {
        var ts = new MonthlyTimesheet(Guid.NewGuid(), 2026, 6);
        ts.Lock(Guid.NewGuid());

        var act = () => ts.Unlock(Guid.NewGuid(), "");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Unlock_TuLocked_ThanhCongVeDraft_GhiVaoNotes()
    {
        var ts = new MonthlyTimesheet(Guid.NewGuid(), 2026, 6);
        ts.Lock(Guid.NewGuid());

        ts.Unlock(Guid.NewGuid(), "Nhân viên khiếu nại đúng, cần điều chỉnh");

        ts.Status.Should().Be(MonthlyTimesheetStatus.Draft);
        ts.Notes.Should().Contain("Unlocked").And.Contain("khiếu nại");
    }

    [Fact]
    public void SetOvertimeBreakdown_GioAm_NemLoi()
    {
        var ts = new MonthlyTimesheet(Guid.NewGuid(), 2026, 6);

        var act = () => ts.SetOvertimeBreakdown(-1, 0, 0, 0);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void TotalOvertimeHours_TongCong3Loai_KhongTinhNight()
    {
        var ts = new MonthlyTimesheet(Guid.NewGuid(), 2026, 6);
        ts.SetOvertimeBreakdown(weekday: 5, sunday: 3, holiday: 2, night: 1);

        ts.TotalOvertimeHours.Should().Be(10);   // 5+3+2, night là subset
    }
}
