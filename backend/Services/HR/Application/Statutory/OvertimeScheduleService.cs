using BuildingBlocks.TaxEngine;
using HR.Application.Payroll;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HR.Application.Statutory;

/// <summary>
/// W2-25 / D06 §4 — BẢNG KÊ giờ làm thêm / làm đêm và số tiền đã trả.
///
/// NĐ 253/2026 Đ.26.1 miễn thuế TOÀN BỘ tiền làm thêm/làm đêm trong phạm vi giờ hợp pháp NHƯNG
/// bắt buộc doanh nghiệp **lập bảng kê giờ và tiền**, lưu tại đơn vị và xuất trình khi cơ quan
/// thuế yêu cầu. Không có bảng kê này thì phần miễn thuế không bảo vệ được khi thanh tra.
///
/// Số liệu tính lại bằng ĐÚNG engine đã tính phiếu lương (<c>ComputeCore</c>) nên bảng kê và
/// phiếu lương không thể lệch nhau.
/// </summary>
public sealed class OvertimeScheduleService
{
    private readonly HRDbContext _db;
    private readonly IStatutoryParameterProvider _parameters;

    public OvertimeScheduleService(HRDbContext db, IStatutoryParameterProvider? parameters = null)
    {
        _db = db;
        _parameters = parameters ?? DefaultStatutoryParameterProvider.Instance;
    }

    public async Task<OvertimeScheduleDto> BuildAsync(int year, int month, CancellationToken ct = default)
    {
        var periodMonth = new DateOnly(year, month, 1);
        var effectiveDate = new DateTime(year, month, 1);
        var payDate = PayrollCalculationService.DefaultPayDate(year, month);

        var periodParameters = await _parameters.ResolveAsync(periodMonth, ct);
        var payDateParameters = await _parameters.ResolveAsync(payDate, ct);

        var timesheets = await _db.MonthlyTimesheets
            .AsNoTracking()
            .Where(t => t.Year == year && t.Month == month)
            .ToListAsync(ct);

        var employeeIds = timesheets.Select(t => t.EmployeeId).Distinct().ToList();
        var employees = await _db.Employees.AsNoTracking()
            .Where(e => employeeIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, ct);
        var salaries = await _db.SalaryStructures.AsNoTracking()
            .Where(s => employeeIds.Contains(s.EmployeeId))
            .ToListAsync(ct);
        var allowances = await _db.Allowances.AsNoTracking()
            .Where(a => employeeIds.Contains(a.EmployeeId))
            .ToListAsync(ct);
        var allowanceTypes = await _db.AllowanceTypes.AsNoTracking().ToDictionaryAsync(t => t.Id, ct);

        var lines = new List<OvertimeScheduleLineDto>();
        foreach (var ts in timesheets.OrderBy(t => t.EmployeeId))
        {
            if (ts.TotalOvertimeHoursWithNight <= 0m && ts.NightShiftHours <= 0m) continue;

            var salary = salaries.Where(s => s.EmployeeId == ts.EmployeeId).GetEffectiveOn(effectiveDate);
            if (salary is null) continue;

            var empAllowances = allowances
                .Where(a => a.EmployeeId == ts.EmployeeId && a.IsEffectiveOn(effectiveDate))
                .ToList();

            var ytd = await _db.MonthlyTimesheets.AsNoTracking()
                .Where(t => t.EmployeeId == ts.EmployeeId && t.Year == year && t.Month < month)
                .SumAsync(t => t.OvertimeHoursWeekday + t.OvertimeHoursSunday
                               + t.OvertimeHoursHoliday + t.OvertimeHoursNight, ct);

            PayrollCalculationResult result;
            try
            {
                result = PayrollCalculationService.ComputeCore(ts, salary, empAllowances,
                    numberOfDependents: 0,
                    lateFinePerMinute: 0m,
                    allowanceTypes: allowanceTypes,
                    periodParameters: periodParameters,
                    payDateParameters: payDateParameters,
                    profile: new PayrollEmployeeProfile { OvertimeHoursYearToDate = ytd },
                    payDate: payDate);
            }
            catch (InvalidOperationException)
            {
                // Lương dưới sàn pháp lý -> kỳ lương của người này đã bị chặn; bảng kê bỏ qua,
                // không được đoán số.
                continue;
            }

            var (nw, nr, nh) = ts.EffectiveNightOvertime();
            employees.TryGetValue(ts.EmployeeId, out var emp);

            lines.Add(new OvertimeScheduleLineDto(
                ts.EmployeeId,
                emp?.EmployeeCode ?? string.Empty,
                emp?.FullName ?? string.Empty,
                result.OvertimeHourlyRate,
                ts.OvertimeHoursWeekday,
                ts.OvertimeHoursSunday,
                ts.OvertimeHoursHoliday,
                nw, nr, nh,
                result.OvertimeHours,
                result.OvertimePay,
                Math.Min(result.OvertimeHours, periodParameters.OvertimeLimits.MonthHours),
                result.OvertimeExemptPay,
                result.OvertimeTaxablePay));
        }

        return new OvertimeScheduleDto(
            year, month,
            periodParameters.OvertimeLimits.MonthHours,
            periodParameters.OvertimeLimits.YearHours,
            "NĐ 253/2026/NĐ-CP Đ.26.1 (bảng kê bắt buộc) · BLLĐ 45/2019 Đ.107 (trần giờ làm thêm)",
            lines,
            lines.Sum(l => l.TotalHours),
            lines.Sum(l => l.TotalPay),
            lines.Sum(l => l.ExemptPay),
            lines.Sum(l => l.TaxablePay));
    }
}
