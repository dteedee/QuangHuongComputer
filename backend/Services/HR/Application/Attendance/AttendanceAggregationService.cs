using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HR.Application.Attendance;

/// <summary>
/// Gom AttendanceRecord + OvertimeRequest (Approved/Executed) + LeaveRequest (Approved) trong tháng
/// → MonthlyTimesheet. Sử dụng VNHolidayCalendar để xác định StandardWorkDays.
/// Kết quả trả về đã save (upsert nếu đã tồn tại và chưa Locked).
/// </summary>
public class AttendanceAggregationService
{
    private readonly HRDbContext _db;

    public AttendanceAggregationService(HRDbContext db) => _db = db;

    public async Task<MonthlyTimesheet> AggregateAsync(
        Guid employeeId,
        int year,
        int month,
        CancellationToken ct = default)
    {
        // Load bảng công tồn tại (hoặc tạo mới)
        var timesheet = await _db.MonthlyTimesheets
            .FirstOrDefaultAsync(t => t.EmployeeId == employeeId && t.Year == year && t.Month == month, ct);

        if (timesheet == null)
        {
            timesheet = new MonthlyTimesheet(employeeId, year, month);
            _db.MonthlyTimesheets.Add(timesheet);
        }
        else if (timesheet.Status == MonthlyTimesheetStatus.Locked)
        {
            throw new InvalidOperationException(
                "Bảng công tháng đã chốt — mở khoá trước khi tổng hợp lại.");
        }

        var firstOfMonth = new DateTime(year, month, 1);
        var lastOfMonth = firstOfMonth.AddMonths(1);

        // 1. Ngày công chuẩn = tổng ngày trong tháng - CN - lễ
        var standardWorkDays = CalculateStandardWorkDays(year, month);

        // 2. AttendanceRecords trong tháng
        var records = await _db.AttendanceRecords
            .Where(a => a.EmployeeId == employeeId && a.Date >= firstOfMonth && a.Date < lastOfMonth)
            .ToListAsync(ct);

        var actualWorkDays = 0m;
        var halfDays = 0m;
        var absentDays = 0m;
        var totalLateMin = 0;
        var totalEarlyMin = 0;

        foreach (var r in records)
        {
            switch (r.Status)
            {
                case AttendanceStatus.Present:
                case AttendanceStatus.Late:
                    actualWorkDays += 1m;
                    break;
                case AttendanceStatus.HalfDay:
                    actualWorkDays += 0.5m;
                    halfDays += 1m;
                    break;
                case AttendanceStatus.Absent:
                    absentDays += 1m;
                    break;
                case AttendanceStatus.OnLeave:
                case AttendanceStatus.Holiday:
                    // Tính riêng ở leaves/holidays
                    break;
            }
            totalLateMin += r.LateMinutes;
            totalEarlyMin += r.EarlyLeaveMinutes;
        }

        timesheet.SetAttendanceAggregation(
            standardWorkDays: standardWorkDays,
            actualWorkDays: actualWorkDays,
            absentDays: absentDays,
            halfDays: halfDays,
            totalLateMinutes: totalLateMin,
            totalEarlyLeaveMinutes: totalEarlyMin);

        // 3. Overtime — chỉ tính Approved/Executed
        var otRequests = await _db.OvertimeRequests
            .Where(o => o.EmployeeId == employeeId
                && o.Date >= firstOfMonth && o.Date < lastOfMonth
                && (o.Status == OvertimeStatus.Approved || o.Status == OvertimeStatus.Executed))
            .ToListAsync(ct);

        var otWeekday = 0m;
        var otSunday = 0m;
        var otHoliday = 0m;
        var otNight = 0m;

        foreach (var ot in otRequests)
        {
            var hours = ot.PayableHours();
            if (hours <= 0) continue;

            // Xác định loại OT theo ngày
            if (VNHolidayCalendar.IsHoliday(ot.Date)) otHoliday += hours;
            else if (ot.Date.DayOfWeek == DayOfWeek.Sunday) otSunday += hours;
            else otWeekday += hours;

            // Phần ban đêm (22h-6h)
            otNight += CalculateNightHours(ot.StartTime, ot.EndTime, hours);
        }

        timesheet.SetOvertimeBreakdown(otWeekday, otSunday, otHoliday, otNight);

        // 4. Nghỉ phép — chỉ đếm request Approved trong khoảng tháng
        var leaves = await _db.LeaveRequests
            .Where(l => l.EmployeeId == employeeId
                && l.Status == RequestStatus.Approved
                && l.StartDate < lastOfMonth && l.EndDate >= firstOfMonth)
            .ToListAsync(ct);

        var paidLeaves = 0;
        var unpaidLeaves = 0;
        foreach (var l in leaves)
        {
            var start = l.StartDate < firstOfMonth ? firstOfMonth : l.StartDate;
            var end = l.EndDate >= lastOfMonth ? lastOfMonth.AddDays(-1) : l.EndDate;
            var daysInMonth = (int)Math.Ceiling((end - start).TotalDays) + 1;
            if (daysInMonth <= 0) continue;

            // Nghỉ phép có lương: Annual/Sick (đơn giản hoá — mở rộng ở phase sau)
            if (l.Type == LeaveType.Annual || l.Type == LeaveType.Sick)
                paidLeaves += daysInMonth;
            else
                unpaidLeaves += daysInMonth;
        }

        timesheet.SetLeaveDays(paidLeaves, unpaidLeaves);

        await _db.SaveChangesAsync(ct);
        return timesheet;
    }

    /// <summary>Số ngày làm việc chuẩn = ngày trong tháng - CN - lễ.</summary>
    public static decimal CalculateStandardWorkDays(int year, int month)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var holidays = VNHolidayCalendar.GetHolidaysForYear(year)
            .Where(h => h.Date.Month == month)
            .Select(h => h.Date.Day)
            .ToHashSet();

        var count = 0;
        for (var d = 1; d <= daysInMonth; d++)
        {
            var dt = new DateTime(year, month, d);
            if (dt.DayOfWeek == DayOfWeek.Sunday) continue;
            if (holidays.Contains(d)) continue;
            count++;
        }
        return count;
    }

    /// <summary>Ước lượng giờ OT trong khung ban đêm 22h-6h.</summary>
    private static decimal CalculateNightHours(TimeOnly start, TimeOnly end, decimal totalHours)
    {
        var nightStart = new TimeOnly(22, 0);
        var nightEnd = new TimeOnly(6, 0);

        // Chuyển sang phút để dễ tính
        int startMin = start.Hour * 60 + start.Minute;
        int endMin = end.Hour * 60 + end.Minute;
        if (endMin <= startMin) endMin += 24 * 60;  // cross midnight

        int nightMin = 0;
        // Từ 22:00 → 24:00
        nightMin += Overlap(startMin, endMin, 22 * 60, 24 * 60);
        // Từ 00:00 → 06:00 (đêm hôm sau nếu cross midnight)
        nightMin += Overlap(startMin, endMin, 24 * 60, 30 * 60);
        // Từ 00:00 → 06:00 nếu bắt đầu sớm
        nightMin += Overlap(startMin, endMin, 0, 6 * 60);

        var proportional = Math.Min((decimal)nightMin / 60m, totalHours);
        return Math.Round(proportional, 2);
    }

    private static int Overlap(int a1, int a2, int b1, int b2)
        => Math.Max(0, Math.Min(a2, b2) - Math.Max(a1, b1));
}
