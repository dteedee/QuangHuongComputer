using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;
using BuildingBlocks.Endpoints;

namespace HR.Application.Leave;

/// <summary>
/// W2-7 khoản 6/7 — MỘT đường duyệt nghỉ phép duy nhất + kiểm tra tồn ngày phép khi nộp VÀ khi
/// duyệt. Trước W2-7 có HAI đường độc lập: HRLeaveEndpoints "/leaves/{id}/approve" gọi thẳng
/// <see cref="LeaveRequest.Approve"/>, và ApprovalEndpoints "/approvals/{id}/approve" cũng gọi
/// thẳng — không đường nào kiểm tra số ngày phép còn lại, cả hai có thể áp dụng cho CÙNG 1 đơn
/// và không đồng bộ <see cref="ApprovalRequest"/>. Dồn cả về đây.
/// </summary>
public class LeaveApprovalService
{
    // Chính sách mặc định khi hệ thống CHƯA có bảng LeavePolicy/LeaveBalance cấu hình được
    // (spec đầy đủ — accrual, carry-over, seniority — không kịp trong track này, xem báo cáo
    // w2-7-report.md mục "Unresolved"). Đây vẫn là một enforcement THẬT, chỉ là hạn mức cố định
    // thay vì theo từng nhân viên/thâm niên — không phải số giả.
    public const decimal DefaultAnnualDaysPerYear = 12m;
    public const decimal DefaultSickDaysPerYear = 30m;

    private readonly HRDbContext _db;
    public LeaveApprovalService(HRDbContext db) => _db = db;

    /// <summary>Số ngày công (Mon-Sat, trừ ngày lễ VN) trong khoảng [start, end] — cả 2 đầu bao gồm.</summary>
    public static decimal CountWorkingDays(DateTime start, DateTime end)
    {
        if (end < start) return 0;
        decimal days = 0;
        for (var d = start.Date; d <= end.Date; d = d.AddDays(1))
        {
            if (d.DayOfWeek == DayOfWeek.Sunday) continue;
            if (VNHolidayCalendar.IsHoliday(d)) continue;
            days++;
        }
        return days;
    }

    private static decimal AnnualCapFor(LeaveType type) => type switch
    {
        LeaveType.Annual => DefaultAnnualDaysPerYear,
        LeaveType.Sick => DefaultSickDaysPerYear,
        _ => decimal.MaxValue, // Unpaid/Personal/... không có trần cứng ở mức mặc định.
    };

    /// <summary>Tổng ngày đã dùng (Pending + Approved — Pending cũng phải tính để 2 đơn chồng
    /// nhau không thể cùng vượt hạn mức) trong năm của StartDate, cùng loại, trừ chính đơn đang xét.</summary>
    private async Task<decimal> UsedDaysAsync(Guid employeeId, LeaveType type, int year, Guid? excludeId)
    {
        var q = _db.LeaveRequests.Where(l =>
            l.EmployeeId == employeeId && l.Type == type && l.StartDate.Year == year &&
            (l.Status == RequestStatus.Pending || l.Status == RequestStatus.Approved));
        if (excludeId.HasValue) q = q.Where(l => l.Id != excludeId.Value);
        return await q.SumAsync(l => (decimal?)l.Days) ?? 0m;
    }

    public async Task<(LeaveRequest? Leave, string? Error)> SubmitAsync(
        Employee employee, LeaveType type, DateTime startDate, DateTime endDate, string? reason,
        bool isPaidLeave = true, string? handoverTo = null, string? handoverNotes = null, string? contactDuringLeave = null)
    {
        if (endDate < startDate) return (null, "Ngày kết thúc phải sau ngày bắt đầu.");

        var overlap = await _db.LeaveRequests.AnyAsync(l =>
            l.EmployeeId == employee.Id && l.Status != RequestStatus.Cancelled && l.Status != RequestStatus.Rejected &&
            l.StartDate <= endDate && l.EndDate >= startDate);
        if (overlap) return (null, "Nhân viên đã có đơn nghỉ phép trùng ngày.");

        var days = CountWorkingDays(startDate, endDate);
        if (days <= 0) return (null, "Khoảng ngày chọn không có ngày công nào (toàn cuối tuần/ngày lễ).");

        var cap = AnnualCapFor(type);
        if (cap != decimal.MaxValue)
        {
            var used = await UsedDaysAsync(employee.Id, type, startDate.Year, excludeId: null);
            if (used + days > cap)
                return (null, $"Vượt hạn mức nghỉ {type} ({cap:0.#} ngày/năm) — đã dùng {used:0.#}, xin thêm {days:0.#}.");
        }

        var leave = new LeaveRequest(employee.Id, type, startDate, endDate, days, reason,
            isPaidLeave, handoverNotes, handoverTo, contactDuringLeave);
        _db.LeaveRequests.Add(leave);
        _db.ApprovalRequests.Add(new ApprovalRequest
        {
            Id = Guid.NewGuid(),
            Type = ApprovalType.LeaveRequest,
            ReferenceId = leave.Id,
            RequesterId = employee.Id,
            RequesterName = employee.FullName,
            SubmittedAt = DateTime.UtcNow,
            Status = ApprovalStatus.Pending
        });
        await _db.SaveChangesAsync();
        return (leave, null);
    }

    public async Task<string?> ApproveAsync(Guid leaveId, string approverName, Guid? approverId = null)
    {
        var leave = await _db.LeaveRequests.FindAsync(leaveId);
        if (leave == null) return "Không tìm thấy đơn nghỉ phép.";

        // Kiểm lại hạn mức TẠI THỜI ĐIỂM DUYỆT — đơn khác có thể đã được duyệt trước, ăn hết quota
        // kể từ lúc đơn này được NỘP (spec: "balance validated on submit and approve").
        var cap = AnnualCapFor(leave.Type);
        if (cap != decimal.MaxValue)
        {
            var used = await UsedDaysAsync(leave.EmployeeId, leave.Type, leave.StartDate.Year, excludeId: leave.Id);
            if (used + leave.Days > cap)
                return $"Vượt hạn mức nghỉ {leave.Type} ({cap:0.#} ngày/năm) tại thời điểm duyệt — đã dùng {used:0.#}.";
        }

        try { leave.Approve(approverName); }
        catch (InvalidOperationException ex) { return ClientSafeError.Message(ex); }

        await SyncApprovalRequestAsync(leaveId, ApprovalStatus.Approved, approverId, null);
        await _db.SaveChangesAsync();
        return null;
    }

    public async Task<string?> RejectAsync(Guid leaveId, string reason, string rejectorName, Guid? approverId = null)
    {
        var leave = await _db.LeaveRequests.FindAsync(leaveId);
        if (leave == null) return "Không tìm thấy đơn nghỉ phép.";

        try { leave.Reject(reason, rejectorName); }
        catch (InvalidOperationException ex) { return ClientSafeError.Message(ex); }

        await SyncApprovalRequestAsync(leaveId, ApprovalStatus.Rejected, approverId, reason);
        await _db.SaveChangesAsync();
        return null;
    }

    private async Task SyncApprovalRequestAsync(Guid leaveId, ApprovalStatus status, Guid? approverId, string? rejectionReason)
    {
        var approval = await _db.ApprovalRequests
            .FirstOrDefaultAsync(a => a.Type == ApprovalType.LeaveRequest && a.ReferenceId == leaveId && a.Status == ApprovalStatus.Pending);
        if (approval == null) return; // Đơn cũ không có ApprovalRequest kèm (trước khi service này tồn tại) — bỏ qua, không chặn.
        approval.Status = status;
        approval.ApproverId = approverId;
        approval.DecidedAt = DateTime.UtcNow;
        if (rejectionReason != null) approval.RejectionReason = rejectionReason;
    }
}
