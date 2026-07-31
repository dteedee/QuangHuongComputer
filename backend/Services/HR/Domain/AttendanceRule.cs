using BuildingBlocks.SharedKernel;

namespace HR.Domain;

/// <summary>
/// Quy tắc chấm công cấu hình được — dung sai đi muộn, phạt tiền, hệ số OT.
/// Có thể áp dụng theo cửa hàng (StoreId có giá trị) hoặc toàn hệ thống (StoreId = null).
/// Khi truy vấn: ưu tiên rule của Store, fallback về rule toàn hệ thống.
/// </summary>
public class AttendanceRule : Entity<Guid>
{
    public Guid? StoreId { get; private set; }
    public string Name { get; private set; } = string.Empty;

    // Chấm công đi muộn
    public int LateToleranceMinutes { get; private set; }        // dung sai muộn, mặc định 5
    public decimal LateFineMoneyPerMinute { get; private set; }  // tiền phạt/phút
    public int HalfDayThresholdMinutes { get; private set; }     // muộn > X phút → tính nửa ngày

    // Chấm về sớm
    public int EarlyLeaveToleranceMinutes { get; private set; }

    // Hệ số OT
    public decimal OvertimeWeekdayRate { get; private set; }     // ngày thường 1.5
    public decimal OvertimeSundayRate { get; private set; }      // chủ nhật 2.0
    public decimal OvertimeHolidayRate { get; private set; }     // ngày lễ 3.0
    public decimal OvertimeNightBonus { get; private set; }      // ban đêm +0.3

    // Khung ban đêm (22h-6h theo Luật Lao động)
    public TimeOnly NightStartTime { get; private set; }
    public TimeOnly NightEndTime { get; private set; }

    // Bán kính chấm công GPS (mét)
    public int GpsRadiusMeters { get; private set; }

    // Giờ chuẩn 1 công (mặc định 8h)
    public decimal StandardWorkHoursPerDay { get; private set; }

    public bool IsActive { get; private set; }
    public DateTime EffectiveFrom { get; private set; }

    public AttendanceRule(
        string name,
        Guid? storeId = null,
        int lateToleranceMinutes = 5,
        decimal lateFineMoneyPerMinute = 0,
        int halfDayThresholdMinutes = 240,
        int earlyLeaveToleranceMinutes = 5,
        decimal overtimeWeekdayRate = 1.5m,
        decimal overtimeSundayRate = 2.0m,
        decimal overtimeHolidayRate = 3.0m,
        decimal overtimeNightBonus = 0.3m,
        int gpsRadiusMeters = 100,
        decimal standardWorkHoursPerDay = 8m,
        DateTime? effectiveFrom = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên quy tắc là bắt buộc.", nameof(name));
        if (lateToleranceMinutes < 0) throw new ArgumentException("LateToleranceMinutes >= 0.");
        if (lateFineMoneyPerMinute < 0) throw new ArgumentException("LateFineMoneyPerMinute >= 0.");
        if (halfDayThresholdMinutes <= lateToleranceMinutes)
            throw new ArgumentException("Ngưỡng nửa ngày phải > dung sai đi muộn.");
        if (overtimeWeekdayRate < 1) throw new ArgumentException("OvertimeWeekdayRate >= 1.");
        if (overtimeSundayRate < overtimeWeekdayRate) throw new ArgumentException("Sunday rate >= Weekday rate.");
        if (overtimeHolidayRate < overtimeSundayRate) throw new ArgumentException("Holiday rate >= Sunday rate.");
        if (gpsRadiusMeters <= 0 || gpsRadiusMeters > 10_000)
            throw new ArgumentException("GpsRadiusMeters trong khoảng 1..10000.");

        Id = Guid.NewGuid();
        Name = name;
        StoreId = storeId;
        LateToleranceMinutes = lateToleranceMinutes;
        LateFineMoneyPerMinute = lateFineMoneyPerMinute;
        HalfDayThresholdMinutes = halfDayThresholdMinutes;
        EarlyLeaveToleranceMinutes = earlyLeaveToleranceMinutes;
        OvertimeWeekdayRate = overtimeWeekdayRate;
        OvertimeSundayRate = overtimeSundayRate;
        OvertimeHolidayRate = overtimeHolidayRate;
        OvertimeNightBonus = overtimeNightBonus;
        GpsRadiusMeters = gpsRadiusMeters;
        StandardWorkHoursPerDay = standardWorkHoursPerDay;
        NightStartTime = new TimeOnly(22, 0);
        NightEndTime = new TimeOnly(6, 0);
        IsActive = true;
        EffectiveFrom = effectiveFrom ?? DateTime.UtcNow;
    }

    protected AttendanceRule() { }

    public void Update(
        int lateToleranceMinutes,
        decimal lateFineMoneyPerMinute,
        int halfDayThresholdMinutes,
        decimal overtimeWeekdayRate,
        decimal overtimeSundayRate,
        decimal overtimeHolidayRate)
    {
        if (lateToleranceMinutes < 0) throw new ArgumentException("LateToleranceMinutes >= 0.");
        if (lateFineMoneyPerMinute < 0) throw new ArgumentException("LateFineMoneyPerMinute >= 0.");
        LateToleranceMinutes = lateToleranceMinutes;
        LateFineMoneyPerMinute = lateFineMoneyPerMinute;
        HalfDayThresholdMinutes = halfDayThresholdMinutes;
        OvertimeWeekdayRate = overtimeWeekdayRate;
        OvertimeSundayRate = overtimeSundayRate;
        OvertimeHolidayRate = overtimeHolidayRate;
    }

    public void Activate() => IsActive = true;
    public void Deactivate() => IsActive = false;

    /// <summary>Ngày lễ VN → hệ số 300%.</summary>
    public decimal GetOvertimeRate(DateTime date)
    {
        if (VNHolidayCalendar.IsHoliday(date)) return OvertimeHolidayRate;
        if (date.DayOfWeek == DayOfWeek.Sunday) return OvertimeSundayRate;
        return OvertimeWeekdayRate;
    }

    /// <summary>Kiểm tra khoảng thời gian có rơi vào ban đêm (22h-6h) không.</summary>
    public bool IsNightWork(TimeOnly time)
    {
        // Ban đêm cross midnight: >= 22:00 hoặc < 6:00
        return time >= NightStartTime || time < NightEndTime;
    }
}
