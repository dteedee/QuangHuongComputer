using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public enum TimesheetStatus
{
    Pending,
    Approved,
    Rejected
}

public class Timesheet : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public DateTime Date { get; private set; }
    public TimeSpan? CheckIn { get; private set; }
    public TimeSpan? CheckOut { get; private set; }
    public decimal TotalHours { get; private set; }
    public TimesheetStatus Status { get; private set; }
    public string? Notes { get; private set; }
    public string? RejectionReason { get; private set; }
    public Guid? ApprovedBy { get; private set; }
    public DateTime? ApprovedAt { get; private set; }

    // For overtime tracking
    public decimal RegularHours { get; private set; }
    public decimal OvertimeHours { get; private set; }

    public Timesheet(
        Guid employeeId,
        DateTime date,
        TimeSpan checkIn,
        TimeSpan? checkOut = null,
        string? notes = null)
    {
        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        Date = date.Date; // Ensure only date part
        CheckIn = checkIn;
        CheckOut = checkOut;
        Status = TimesheetStatus.Pending;
        Notes = notes;

        if (CheckOut.HasValue)
        {
            CalculateHours();
        }

        Validate();
        RaiseDomainEvent(new TimesheetCreatedEvent(Id, EmployeeId, Date));
    }

    // EF Core constructor
    protected Timesheet()
    {
    }

    public void SetCheckOut(TimeSpan checkOut)
    {
        if (CheckOut.HasValue)
            throw new InvalidOperationException("Check-out time is already set.");

        if (checkOut <= CheckIn!.Value)
            throw new ArgumentException("Check-out time must be after check-in time.", nameof(checkOut));

        CheckOut = checkOut;
        CalculateHours();

        RaiseDomainEvent(new TimesheetCheckOutRecordedEvent(Id, EmployeeId, Date, checkOut, TotalHours));
    }

    public void UpdateCheckIn(TimeSpan checkIn)
    {
        if (Status == TimesheetStatus.Approved)
            throw new InvalidOperationException("Cannot modify approved timesheet.");

        CheckIn = checkIn;

        if (CheckOut.HasValue)
        {
            CalculateHours();
        }
    }

    public void UpdateCheckOut(TimeSpan checkOut)
    {
        if (Status == TimesheetStatus.Approved)
            throw new InvalidOperationException("Cannot modify approved timesheet.");

        if (checkOut <= CheckIn!.Value)
            throw new ArgumentException("Check-out time must be after check-in time.", nameof(checkOut));

        CheckOut = checkOut;
        CalculateHours();
    }

    public void CalculateHours()
    {
        if (!CheckIn.HasValue || !CheckOut.HasValue)
        {
            TotalHours = 0;
            RegularHours = 0;
            OvertimeHours = 0;
            return;
        }

        var checkInTime = CheckIn.Value;
        var checkOutTime = CheckOut.Value;

        // Handle overnight shifts
        if (checkOutTime < checkInTime)
        {
            checkOutTime = checkOutTime.Add(TimeSpan.FromDays(1));
        }

        var workDuration = checkOutTime - checkInTime;
        TotalHours = (decimal)workDuration.TotalHours;

        // Calculate regular and overtime hours (8 hours standard workday)
        const decimal standardWorkHours = 8m;

        if (TotalHours <= standardWorkHours)
        {
            RegularHours = TotalHours;
            OvertimeHours = 0;
        }
        else
        {
            RegularHours = standardWorkHours;
            OvertimeHours = TotalHours - standardWorkHours;
        }

        // Round to 2 decimal places
        TotalHours = Math.Round(TotalHours, 2);
        RegularHours = Math.Round(RegularHours, 2);
        OvertimeHours = Math.Round(OvertimeHours, 2);
    }

    public void Approve(Guid approvedBy)
    {
        if (Status == TimesheetStatus.Approved)
            throw new InvalidOperationException("Timesheet is already approved.");

        if (!CheckOut.HasValue)
            throw new InvalidOperationException("Cannot approve timesheet without check-out time.");

        Status = TimesheetStatus.Approved;
        ApprovedBy = approvedBy;
        ApprovedAt = DateTime.UtcNow;
        RejectionReason = null;

        RaiseDomainEvent(new TimesheetApprovedEvent(Id, EmployeeId, Date, approvedBy, TotalHours));
    }

    public void Reject(Guid rejectedBy, string reason)
    {
        if (Status == TimesheetStatus.Approved)
            throw new InvalidOperationException("Cannot reject an approved timesheet.");

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Rejection reason is required.", nameof(reason));

        Status = TimesheetStatus.Rejected;
        RejectionReason = reason;
        ApprovedBy = null;
        ApprovedAt = null;

        RaiseDomainEvent(new TimesheetRejectedEvent(Id, EmployeeId, Date, rejectedBy, reason));
    }

    public void UpdateNotes(string? notes)
    {
        Notes = notes;
    }

    public void Validate()
    {
        var errors = new List<string>();

        if (EmployeeId == Guid.Empty)
            errors.Add("Employee ID is required.");

        if (Date > DateTime.UtcNow.Date)
            errors.Add("Timesheet date cannot be in the future.");

        if (CheckIn.HasValue && CheckIn.Value.TotalHours >= 24)
            errors.Add("Check-in time must be within a 24-hour period.");

        if (CheckOut.HasValue && CheckOut.Value.TotalHours >= 24)
            errors.Add("Check-out time must be within a 24-hour period.");

        if (TotalHours > 24)
            errors.Add("Total hours cannot exceed 24 hours.");

        if (errors.Any())
            throw new ArgumentException($"Timesheet validation failed: {string.Join(", ", errors)}");
    }
}

// Domain Events
public record TimesheetCreatedEvent(Guid TimesheetId, Guid EmployeeId, DateTime Date) : DomainEvent;

public record TimesheetCheckOutRecordedEvent(
    Guid TimesheetId,
    Guid EmployeeId,
    DateTime Date,
    TimeSpan CheckOut,
    decimal TotalHours) : DomainEvent;

public record TimesheetApprovedEvent(
    Guid TimesheetId,
    Guid EmployeeId,
    DateTime Date,
    Guid ApprovedBy,
    decimal TotalHours) : DomainEvent;

public record TimesheetRejectedEvent(
    Guid TimesheetId,
    Guid EmployeeId,
    DateTime Date,
    Guid RejectedBy,
    string Reason) : DomainEvent;

// =====================================================================
// Phase 06: BẢNG CÔNG THÁNG — tổng hợp AttendanceRecord + OT + Leave.
// Khoá lại (Lock) trước khi chạy Payroll để bảng lương ổn định.
// =====================================================================

public enum MonthlyTimesheetStatus
{
    Draft = 0,      // Đang tổng hợp / cho sửa
    Locked = 1      // Chốt, không cho sửa (mở khoá phải có ghi log)
}

public class MonthlyTimesheet : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public int Year { get; private set; }
    public int Month { get; private set; }

    // Ngày công
    public decimal StandardWorkDays { get; private set; }      // Công chuẩn = ngày làm việc trừ lễ
    public decimal ActualWorkDays { get; private set; }        // Công đi làm thực tế
    public decimal AbsentDays { get; private set; }            // Vắng không phép
    public decimal HalfDays { get; private set; }              // Nửa công (đi muộn > ngưỡng)

    // Giờ OT theo loại
    public decimal OvertimeHoursWeekday { get; private set; }
    public decimal OvertimeHoursSunday { get; private set; }
    public decimal OvertimeHoursHoliday { get; private set; }
    public decimal OvertimeHoursNight { get; private set; }

    // Đi muộn / về sớm
    public int TotalLateMinutes { get; private set; }
    public int TotalEarlyLeaveMinutes { get; private set; }

    // Nghỉ phép
    public int LeaveDaysPaid { get; private set; }             // nghỉ phép có lương
    public int LeaveDaysUnpaid { get; private set; }           // nghỉ không lương

    public MonthlyTimesheetStatus Status { get; private set; }
    public DateTime? LockedAt { get; private set; }
    public Guid? LockedBy { get; private set; }
    public string? Notes { get; private set; }

    public MonthlyTimesheet(Guid employeeId, int year, int month)
    {
        if (employeeId == Guid.Empty) throw new ArgumentException("EmployeeId là bắt buộc.");
        if (year < 2000 || year > 2100) throw new ArgumentException("Year không hợp lệ.");
        if (month < 1 || month > 12) throw new ArgumentException("Month 1..12.");

        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        Year = year;
        Month = month;
        Status = MonthlyTimesheetStatus.Draft;
    }

    protected MonthlyTimesheet() { }

    public void SetAttendanceAggregation(
        decimal standardWorkDays,
        decimal actualWorkDays,
        decimal absentDays,
        decimal halfDays,
        int totalLateMinutes,
        int totalEarlyLeaveMinutes)
    {
        RequireDraft();
        StandardWorkDays = standardWorkDays;
        ActualWorkDays = actualWorkDays;
        AbsentDays = absentDays;
        HalfDays = halfDays;
        TotalLateMinutes = totalLateMinutes;
        TotalEarlyLeaveMinutes = totalEarlyLeaveMinutes;
    }

    public void SetOvertimeBreakdown(
        decimal weekday,
        decimal sunday,
        decimal holiday,
        decimal night)
    {
        RequireDraft();
        if (weekday < 0 || sunday < 0 || holiday < 0 || night < 0)
            throw new ArgumentException("Giờ OT >= 0.");
        OvertimeHoursWeekday = weekday;
        OvertimeHoursSunday = sunday;
        OvertimeHoursHoliday = holiday;
        OvertimeHoursNight = night;
    }

    public void SetLeaveDays(int paid, int unpaid)
    {
        RequireDraft();
        if (paid < 0 || unpaid < 0) throw new ArgumentException("Ngày nghỉ >= 0.");
        LeaveDaysPaid = paid;
        LeaveDaysUnpaid = unpaid;
    }

    public void Lock(Guid lockedBy)
    {
        if (Status == MonthlyTimesheetStatus.Locked)
            throw new InvalidOperationException("Bảng công đã chốt.");
        Status = MonthlyTimesheetStatus.Locked;
        LockedAt = DateTime.UtcNow;
        LockedBy = lockedBy;
    }

    public void Unlock(Guid unlockedBy, string reason)
    {
        if (Status != MonthlyTimesheetStatus.Locked)
            throw new InvalidOperationException("Chỉ mở khoá được bảng công đã Locked.");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Phải ghi lý do mở khoá bảng công.");
        Status = MonthlyTimesheetStatus.Draft;
        Notes = $"[Unlocked by {unlockedBy} at {DateTime.UtcNow:o}]: {reason}\n" + (Notes ?? "");
    }

    public void UpdateNotes(string? notes) => Notes = notes;

    private void RequireDraft()
    {
        if (Status == MonthlyTimesheetStatus.Locked)
            throw new InvalidOperationException("Bảng công đã chốt — không thể sửa.");
    }

    /// <summary>Tổng OT hours (không nhân hệ số) — dùng cho báo cáo tổng quát.</summary>
    public decimal TotalOvertimeHours =>
        OvertimeHoursWeekday + OvertimeHoursSunday + OvertimeHoursHoliday;
}
