using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HR.Application.Commission;

/// <summary>Phần hoa hồng của một bảng lương: tổng tiền và số khoản đã gắn.</summary>
public sealed record CommissionPayrollShare(decimal Amount, int EntryCount);

/// <summary>
/// Nối <see cref="CommissionEntry"/> với bảng lương. Quy tắc:
///  - bảng lương tháng M lấy MỌI khoản Approved chưa trả có kỳ ≤ M (khoản duyệt muộn sang kỳ sau);
///  - tổng ≤ 0 (bút toán thu hồi lớn hơn hoa hồng mới) -> không gắn gì, để dồn sang kỳ sau;
///  - tính lại bảng lương thì gỡ hết rồi gắn lại (khoản đã huỷ rơi ra);
///  - chi trả kỳ lương -> các khoản đã gắn chuyển Paid.
/// Không gọi SaveChanges: caller (PayrollCalculationService / endpoint) quản lý transaction.
/// </summary>
public static class CommissionPayrollLinker
{
    public static async Task<CommissionPayrollShare> AttachAsync(HRDbContext db, HR.Domain.Payroll payroll, CancellationToken ct = default)
    {
        var period = CommissionPeriod.Of(payroll.Year, payroll.Month);

        foreach (var linked in await db.CommissionEntries
                     .Where(e => e.PayrollId == payroll.Id && e.Status != CommissionStatus.Paid)
                     .ToListAsync(ct))
        {
            linked.UnlinkFromPayroll();
        }

        var approved = await db.CommissionEntries
            .Where(e => e.EmployeeId == payroll.EmployeeId
                        && e.Status == CommissionStatus.Approved
                        && string.Compare(e.Period, period) <= 0)
            .ToListAsync(ct);

        // Khoản đang gắn vào bảng lương của một kỳ lương đã HUỶ được coi là tự do.
        var otherPayrollIds = approved.Where(e => e.PayrollId is { } id && id != payroll.Id)
            .Select(e => e.PayrollId!.Value).Distinct().ToList();
        var releasedIds = otherPayrollIds.Count == 0
            ? new HashSet<Guid>()
            : (await (from p in db.Payrolls
                      join r in db.PayrollRuns on p.PayrollRunId equals r.Id
                      where otherPayrollIds.Contains(p.Id) && r.Status == PayrollRunStatus.Cancelled
                      select p.Id).ToListAsync(ct)).ToHashSet();

        var eligible = approved
            .Where(e => e.PayrollId is null || e.PayrollId == payroll.Id || releasedIds.Contains(e.PayrollId.Value))
            .ToList();
        var total = eligible.Sum(e => e.Amount);
        if (total <= 0m) return new CommissionPayrollShare(0m, 0);

        foreach (var entry in eligible) entry.LinkToPayroll(payroll.Id);
        return new CommissionPayrollShare(total, eligible.Count);
    }

    /// <summary>
    /// Bảng lương còn gắn khoản đã bị huỷ/không còn Approved -> số tiền trên phiếu lương đã sai,
    /// phải tính lại trước khi duyệt. Trả về số khoản lệch (0 = hợp lệ).
    /// </summary>
    public static Task<int> CountStaleLinksAsync(HRDbContext db, IReadOnlyCollection<Guid> payrollIds, CancellationToken ct = default)
        => db.CommissionEntries.CountAsync(e => e.PayrollId != null
                                                && payrollIds.Contains(e.PayrollId.Value)
                                                && e.Status != CommissionStatus.Approved
                                                && e.Status != CommissionStatus.Paid, ct);

    /// <summary>Chi trả kỳ lương: mọi khoản Approved đã gắn vào các bảng lương vừa trả -> Paid.</summary>
    public static async Task<int> MarkPaidAsync(HRDbContext db, IReadOnlyCollection<Guid> paidPayrollIds, DateTime now, CancellationToken ct = default)
    {
        var entries = await db.CommissionEntries
            .Where(e => e.PayrollId != null && paidPayrollIds.Contains(e.PayrollId.Value)
                        && e.Status == CommissionStatus.Approved)
            .ToListAsync(ct);
        foreach (var entry in entries) entry.MarkPaid(now);
        return entries.Count;
    }

    /// <summary>Khoản đã nằm trong bảng lương ĐÃ DUYỆT/ĐÃ TRẢ — không huỷ trực tiếp được nữa.</summary>
    public static async Task<bool> IsLockedInPayrollAsync(HRDbContext db, CommissionEntry entry, CancellationToken ct = default)
    {
        if (entry.Status == CommissionStatus.Paid) return true;
        if (entry.PayrollId is not { } payrollId) return false;
        var status = await db.Payrolls.Where(p => p.Id == payrollId).Select(p => (PayrollStatus?)p.Status).FirstOrDefaultAsync(ct);
        return status is PayrollStatus.Approved or PayrollStatus.Processed or PayrollStatus.Paid;
    }
}
