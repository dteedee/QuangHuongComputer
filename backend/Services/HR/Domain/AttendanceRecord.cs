using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public enum CheckInMethod
{
    Web = 0,        // Web thường (chỉ có IP)
    QR = 1,         // Quét QR TOTP đổi 30s tại quầy
    GPS = 2,        // GPS trong bán kính Store
    WiFi = 3,       // IP thuộc dải mạng chi nhánh
    Manual = 4      // Quản lý chấm hộ, bắt buộc ghi lý do
}

public enum AttendanceStatus { Present, Late, Absent, HalfDay, Holiday, OnLeave }

/// <summary>
/// Chấm công thô của nhân viên trong 1 ngày.
/// Phase 06: bổ sung ShiftAssignmentId, cách chấm (QR/GPS/WiFi/Manual),
/// toạ độ, StoreId, LateMinutes, EarlyLeaveMinutes, ApprovedOvertimeHours,
/// audit chấm tay (IsManualEntry/ManualReason/ManualBy).
/// </summary>
public class AttendanceRecord : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public DateTime Date { get; private set; }
    public DateTime? CheckInTime { get; private set; }
    public DateTime? CheckOutTime { get; private set; }
    public decimal WorkHours { get; private set; }
    public decimal OvertimeHours { get; private set; }
    public AttendanceStatus Status { get; private set; } = AttendanceStatus.Absent;
    public string? IpAddress { get; private set; }
    public string? Notes { get; private set; }

    // ===== Phase 06: gắn ca & audit chấm công =====
    public Guid? ShiftAssignmentId { get; private set; }
    public CheckInMethod CheckInMethod { get; private set; }
    public decimal? CheckInLatitude { get; private set; }
    public decimal? CheckInLongitude { get; private set; }
    public string? CheckInDeviceId { get; private set; }
    public Guid? StoreId { get; private set; }
    public int LateMinutes { get; private set; }
    public int EarlyLeaveMinutes { get; private set; }
    public decimal ApprovedOvertimeHours { get; private set; }   // chỉ OT đã duyệt mới tính tiền
    public bool IsManualEntry { get; private set; }
    public string? ManualReason { get; private set; }
    public Guid? ManualBy { get; private set; }

    // EF Core parameterless ctor (private để buộc dùng factory methods)
    protected AttendanceRecord() { }

    /// <summary>Ctor chính — chỉ dùng cho seed hoặc trường hợp không có shift.</summary>
    public AttendanceRecord(Guid employeeId, DateTime date)
    {
        if (employeeId == Guid.Empty) throw new ArgumentException("EmployeeId là bắt buộc.");
        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        Date = date.Date;
        Status = AttendanceStatus.Absent;
        CheckInMethod = CheckInMethod.Web;
    }

    /// <summary>
    /// Ghi nhận check-in. Nếu có shift, tính LateMinutes so với giờ ca chuẩn.
    /// </summary>
    public void RecordCheckIn(
        DateTime checkInTime,
        CheckInMethod method,
        string? ipAddress = null,
        decimal? latitude = null,
        decimal? longitude = null,
        string? deviceId = null,
        Guid? storeId = null,
        Guid? shiftAssignmentId = null,
        TimeSpan? shiftStartTime = null,
        int lateToleranceMinutes = 5)
    {
        if (CheckInTime.HasValue)
            throw new InvalidOperationException("Đã check-in hôm nay rồi.");

        CheckInTime = checkInTime;
        CheckInMethod = method;
        IpAddress = ipAddress;
        CheckInLatitude = latitude;
        CheckInLongitude = longitude;
        CheckInDeviceId = deviceId;
        StoreId = storeId;
        ShiftAssignmentId = shiftAssignmentId;

        // Tính đi muộn
        if (shiftStartTime.HasValue)
        {
            var expectedStart = Date.Date.Add(shiftStartTime.Value);
            var lateBy = (int)(checkInTime - expectedStart).TotalMinutes;
            LateMinutes = lateBy > lateToleranceMinutes ? lateBy : 0;
        }

        Status = LateMinutes > 0 ? AttendanceStatus.Late : AttendanceStatus.Present;
    }

    /// <summary>Ghi nhận check-out. Tính EarlyLeaveMinutes và WorkHours theo shift nếu có.</summary>
    public void RecordCheckOut(
        DateTime checkOutTime,
        TimeSpan? shiftEndTime = null,
        int earlyLeaveToleranceMinutes = 5,
        decimal? breakDurationMinutes = null)
    {
        if (!CheckInTime.HasValue)
            throw new InvalidOperationException("Chưa check-in, không thể check-out.");
        if (checkOutTime <= CheckInTime.Value)
            throw new ArgumentException("CheckOutTime phải sau CheckInTime.");

        CheckOutTime = checkOutTime;

        // Về sớm
        if (shiftEndTime.HasValue)
        {
            var expectedEnd = Date.Date.Add(shiftEndTime.Value);
            var earlyBy = (int)(expectedEnd - checkOutTime).TotalMinutes;
            EarlyLeaveMinutes = earlyBy > earlyLeaveToleranceMinutes ? earlyBy : 0;
        }

        // Tổng giờ = (out - in) - break
        var totalMin = (checkOutTime - CheckInTime.Value).TotalMinutes;
        if (breakDurationMinutes.HasValue) totalMin -= (double)breakDurationMinutes.Value;
        WorkHours = Math.Round((decimal)Math.Max(0, totalMin / 60), 2);
    }

    /// <summary>Gắn số giờ OT đã DUYỆT (từ OvertimeRequest.Approved). Chỉ giờ này mới tính tiền.</summary>
    public void SetApprovedOvertime(decimal hours)
    {
        if (hours < 0) throw new ArgumentException("Approved OT >= 0.");
        ApprovedOvertimeHours = hours;
        // Ghi nhận OT thô để so đối chiếu
        if (OvertimeHours < hours) OvertimeHours = hours;
    }

    /// <summary>Ghi tổng OT thô (chưa hẳn được duyệt).</summary>
    public void SetRawOvertime(decimal hours)
    {
        if (hours < 0) throw new ArgumentException("Raw OT >= 0.");
        OvertimeHours = hours;
    }

    /// <summary>Chấm tay bởi quản lý — bắt buộc ghi lý do và người chấm.</summary>
    public void AdjustManually(
        Guid managerId,
        string reason,
        DateTime? checkInTime = null,
        DateTime? checkOutTime = null,
        int? lateMinutes = null,
        AttendanceStatus? status = null)
    {
        if (managerId == Guid.Empty) throw new ArgumentException("ManagerId là bắt buộc.");
        if (string.IsNullOrWhiteSpace(reason)) throw new ArgumentException("Lý do chấm tay là bắt buộc.");

        IsManualEntry = true;
        ManualReason = reason;
        ManualBy = managerId;
        CheckInMethod = CheckInMethod.Manual;

        if (checkInTime.HasValue) CheckInTime = checkInTime;
        if (checkOutTime.HasValue) CheckOutTime = checkOutTime;
        if (lateMinutes.HasValue) LateMinutes = lateMinutes.Value;
        if (status.HasValue) Status = status.Value;

        if (CheckInTime.HasValue && CheckOutTime.HasValue)
        {
            var h = (decimal)(CheckOutTime.Value - CheckInTime.Value).TotalHours;
            WorkHours = Math.Round(Math.Max(0, h), 2);
        }
    }

    public void MarkAbsent() { Status = AttendanceStatus.Absent; }
    public void MarkOnLeave() { Status = AttendanceStatus.OnLeave; }
    public void MarkHoliday() { Status = AttendanceStatus.Holiday; }
    public void MarkHalfDay() { Status = AttendanceStatus.HalfDay; }
    public void UpdateNotes(string? notes) { Notes = notes; }
}
