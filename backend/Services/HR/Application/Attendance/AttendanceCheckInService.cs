using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HR.Application.Attendance;

public record CheckInPayload(
    Guid EmployeeId,
    CheckInMethod Method,
    string? QrCode = null,
    decimal? Latitude = null,
    decimal? Longitude = null,
    string? DeviceId = null,
    string? IpAddress = null,
    Guid? StoreId = null);

public record CheckInResult(
    bool Success,
    string Message,
    Guid? AttendanceRecordId = null,
    int? LateMinutes = null);

/// <summary>
/// Điều phối chấm công: validate theo method → tìm shift assignment hôm nay →
/// tạo/cập nhật AttendanceRecord → set LateMinutes theo giờ ca chuẩn.
/// </summary>
public class AttendanceCheckInService
{
    private readonly HRDbContext _db;
    private readonly AttendanceValidator _validator;

    public AttendanceCheckInService(HRDbContext db, AttendanceValidator validator)
    {
        _db = db;
        _validator = validator;
    }

    /// <summary>Tra AttendanceRule cho store (fallback về rule toàn hệ thống nếu không có).</summary>
    private async Task<AttendanceRule> GetRuleAsync(Guid? storeId, CancellationToken ct)
    {
        AttendanceRule? rule = null;
        if (storeId.HasValue)
        {
            rule = await _db.AttendanceRules
                .Where(r => r.IsActive && r.StoreId == storeId)
                .FirstOrDefaultAsync(ct);
        }
        rule ??= await _db.AttendanceRules
            .Where(r => r.IsActive && r.StoreId == null)
            .FirstOrDefaultAsync(ct);
        // Fallback cứng: rule mặc định trong bộ nhớ nếu DB chưa có gì
        rule ??= new AttendanceRule("Default (auto)");
        return rule;
    }

    public async Task<CheckInResult> CheckInAsync(CheckInPayload payload, CancellationToken ct = default)
    {
        if (payload.EmployeeId == Guid.Empty)
            return new CheckInResult(false, "EmployeeId là bắt buộc.");

        var rule = await GetRuleAsync(payload.StoreId, ct);

        // 1. Validate theo method
        AttendanceValidationResult validation = payload.Method switch
        {
            CheckInMethod.QR when payload.StoreId.HasValue
                => _validator.ValidateQr(payload.QrCode ?? "", payload.StoreId.Value),
            CheckInMethod.GPS when payload.StoreId.HasValue && payload.Latitude.HasValue && payload.Longitude.HasValue
                => await _validator.ValidateGpsAsync(
                    payload.StoreId.Value, payload.Latitude.Value, payload.Longitude.Value,
                    rule.GpsRadiusMeters, ct),
            CheckInMethod.WiFi when payload.StoreId.HasValue
                => await _validator.ValidateWifiAsync(payload.StoreId.Value, payload.IpAddress ?? "", ct),
            CheckInMethod.Web => AttendanceValidationResult.Ok(),  // Chấm web thường (IP-only, ít an toàn)
            CheckInMethod.Manual => AttendanceValidationResult.Fail("Manual dùng endpoint /manual, không qua check-in thường."),
            _ => AttendanceValidationResult.Fail("Thiếu dữ liệu để validate phương thức chấm công.")
        };
        if (!validation.IsValid)
            return new CheckInResult(false, validation.Reason ?? "Chấm công bị từ chối.");

        // 2. Tìm shift assignment cho hôm nay
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var shiftAssignment = await _db.ShiftAssignments
            .Where(s => s.EmployeeId == payload.EmployeeId && s.Date == today)
            .FirstOrDefaultAsync(ct);
        Shift? shift = null;
        if (shiftAssignment != null)
        {
            shift = await _db.Shifts.FirstOrDefaultAsync(s => s.Id == shiftAssignment.ShiftId, ct);
        }

        // 3. Load hoặc tạo AttendanceRecord
        var todayDate = DateTime.UtcNow.Date;
        var record = await _db.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == payload.EmployeeId && a.Date == todayDate, ct);

        if (record == null)
        {
            record = new AttendanceRecord(payload.EmployeeId, todayDate);
            _db.AttendanceRecords.Add(record);
        }

        if (record.CheckInTime.HasValue)
            return new CheckInResult(false, "Đã check-in hôm nay rồi.");

        // 4. Ghi nhận check-in
        record.RecordCheckIn(
            checkInTime: DateTime.UtcNow,
            method: payload.Method,
            ipAddress: payload.IpAddress,
            latitude: payload.Latitude,
            longitude: payload.Longitude,
            deviceId: payload.DeviceId,
            storeId: payload.StoreId,
            shiftAssignmentId: shiftAssignment?.Id,
            shiftStartTime: shift?.StartTime,
            lateToleranceMinutes: rule.LateToleranceMinutes);

        await _db.SaveChangesAsync(ct);

        return new CheckInResult(true, "Check-in thành công.", record.Id, record.LateMinutes);
    }

    public async Task<CheckInResult> CheckOutAsync(Guid employeeId, CancellationToken ct = default)
    {
        var todayDate = DateTime.UtcNow.Date;
        var record = await _db.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Date == todayDate, ct);
        if (record == null || !record.CheckInTime.HasValue)
            return new CheckInResult(false, "Chưa check-in hôm nay.");
        if (record.CheckOutTime.HasValue)
            return new CheckInResult(false, "Đã check-out hôm nay rồi.");

        var rule = await GetRuleAsync(record.StoreId, ct);

        TimeSpan? shiftEndTime = null;
        decimal? breakMin = null;
        if (record.ShiftAssignmentId.HasValue)
        {
            var sa = await _db.ShiftAssignments.FirstOrDefaultAsync(s => s.Id == record.ShiftAssignmentId, ct);
            if (sa != null)
            {
                var shift = await _db.Shifts.FirstOrDefaultAsync(s => s.Id == sa.ShiftId, ct);
                shiftEndTime = shift?.EndTime;
                breakMin = shift?.BreakDurationMinutes;
            }
        }

        record.RecordCheckOut(
            checkOutTime: DateTime.UtcNow,
            shiftEndTime: shiftEndTime,
            earlyLeaveToleranceMinutes: rule.EarlyLeaveToleranceMinutes,
            breakDurationMinutes: breakMin);

        // OT thô = giờ vượt chuẩn (khai báo chưa duyệt)
        var overtimeRaw = Math.Max(0, record.WorkHours - rule.StandardWorkHoursPerDay);
        record.SetRawOvertime(overtimeRaw);

        await _db.SaveChangesAsync(ct);
        return new CheckInResult(true, "Check-out thành công.", record.Id);
    }

    /// <summary>Chấm tay bởi quản lý — bắt buộc reason, ghi audit vào AttendanceRecord.</summary>
    public async Task<CheckInResult> ManualCheckInAsync(
        Guid employeeId,
        Guid managerId,
        DateTime date,
        string reason,
        DateTime? checkInTime,
        DateTime? checkOutTime,
        CancellationToken ct = default)
    {
        var validation = _validator.ValidateManual(managerId, reason);
        if (!validation.IsValid)
            return new CheckInResult(false, validation.Reason ?? "Không hợp lệ.");

        var record = await _db.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Date == date.Date, ct);
        if (record == null)
        {
            record = new AttendanceRecord(employeeId, date.Date);
            _db.AttendanceRecords.Add(record);
        }
        record.AdjustManually(managerId, reason, checkInTime, checkOutTime);
        await _db.SaveChangesAsync(ct);
        return new CheckInResult(true, "Chấm tay thành công.", record.Id);
    }
}
