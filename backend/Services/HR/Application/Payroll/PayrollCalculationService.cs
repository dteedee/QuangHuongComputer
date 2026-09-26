using System.Text.Json;
using BuildingBlocks.Configuration;
using BuildingBlocks.TaxEngine;
using HR.Application.Commission;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;
// Ghi chú: namespace "HR.Application.Payroll" trùng tên với type HR.Domain.Payroll, và theo
// quy tắc C# thành viên của namespace bao ngoài THẮNG using-alias -> luôn viết đủ HR.Domain.Payroll.

namespace HR.Application.Payroll;

/// <summary>
/// W2-25 / D06 — TRUNG TÂM tính lương. Mọi phép tính pháp lý nằm ở
/// <see cref="PayrollTaxCalculator"/> (BuildingBlocks/W1-15); lớp này chỉ:
///  1. nạp bảng công đã chốt, cơ cấu lương, phụ cấp, người phụ thuộc, hợp đồng;
///  2. resolve HAI bộ tham số pháp luật — ngày 01 tháng lương (bảo hiểm, LTT vùng, hệ số OT) và
///     <c>PayrollRun.PayDate</c> (thuế TNCN) — qua <see cref="IStatutoryParameterProvider"/>;
///  3. gọi <c>ComputeCore</c> rồi ghi kết quả + line items + SNAPSHOT tham số lên <c>Payroll</c>.
///
/// Snapshot là thứ làm một bảng lương ĐÃ TRẢ tái lập được sau nhiều năm: thêm một dòng tham số
/// mới không bao giờ làm đổi số của kỳ cũ.
/// </summary>
public partial class PayrollCalculationService
{
    private const string PayDaySettingKey = "PAYROLL_PAY_DAY";

    private readonly HRDbContext _db;
    private readonly IStatutoryParameterProvider _parameters;
    private readonly IAppSettings? _settings;

    /// <summary>
    /// <paramref name="parameters"/> null -> dùng mặc định biên dịch sẵn (unit test khởi tạo trực
    /// tiếp, và cả trường hợp bảng <c>hr.StatutoryParameters</c> chưa được seed).
    /// </summary>
    public PayrollCalculationService(
        HRDbContext db,
        IStatutoryParameterProvider? parameters = null,
        IAppSettings? settings = null)
    {
        _db = db;
        _parameters = parameters ?? DefaultStatutoryParameterProvider.Instance;
        _settings = settings;
    }

    /// <summary>Tính cho 1 nhân viên. KHÔNG save (caller quản lý transaction).</summary>
    public async Task<HR.Domain.Payroll> CalculateAsync(
        Guid employeeId,
        int year,
        int month,
        Guid? payrollRunId = null,
        CancellationToken ct = default)
    {
        var ts = await _db.MonthlyTimesheets
            .FirstOrDefaultAsync(t => t.EmployeeId == employeeId && t.Year == year && t.Month == month, ct)
            ?? throw new InvalidOperationException(
                $"Chưa có MonthlyTimesheet cho nhân viên {employeeId} kỳ {month}/{year}.");
        if (ts.Status != MonthlyTimesheetStatus.Locked)
            throw new InvalidOperationException(
                $"MonthlyTimesheet {month}/{year} chưa Locked — không thể tính lương.");

        var effectiveDate = new DateTime(year, month, 1);
        var salary = (await _db.SalaryStructures.Where(s => s.EmployeeId == employeeId).ToListAsync(ct))
            .GetEffectiveOn(effectiveDate)
            ?? throw new InvalidOperationException(
                $"Không có SalaryStructure hiệu lực tại {effectiveDate:yyyy-MM-dd} cho nhân viên {employeeId}.");

        var payroll = await _db.Payrolls
            .FirstOrDefaultAsync(p => p.EmployeeId == employeeId && p.Year == year && p.Month == month, ct);
        if (payroll == null)
        {
            payroll = new HR.Domain.Payroll(employeeId, month, year, salary.BaseSalary);
            _db.Payrolls.Add(payroll);
        }
        else if (payroll.Status != PayrollStatus.Draft)
        {
            throw new InvalidOperationException(
                $"Bảng lương {month}/{year} cho NV {employeeId} đã {payroll.Status}, không tính lại.");
        }
        if (payrollRunId.HasValue) payroll.AssignToRun(payrollRunId.Value);

        var dependents = (await _db.Dependents.Where(d => d.EmployeeId == employeeId).ToListAsync(ct))
            .Count(d => d.IsActiveOn(effectiveDate));
        payroll.SetDependents(dependents);

        var allowances = (await _db.Allowances.Where(a => a.EmployeeId == employeeId).ToListAsync(ct))
            .Where(a => a.IsEffectiveOn(effectiveDate))
            .ToList();
        var typeIds = allowances.Select(a => a.AllowanceTypeId).Distinct().ToList();
        var allowanceTypes = typeIds.Count == 0
            ? new Dictionary<Guid, AllowanceType>()
            : await _db.AllowanceTypes.Where(t => typeIds.Contains(t.Id)).ToDictionaryAsync(t => t.Id, ct);

        var payDate = await ResolvePayDateAsync(payrollRunId, year, month, ct);
        var profile = await BuildProfileAsync(employeeId, year, month, effectiveDate, payroll, ct);
        // Hoa hồng kỹ thuật đã duyệt (kỳ ≤ tháng lương) -> thu nhập chịu thuế, không đóng bảo hiểm.
        var commission = await CommissionPayrollLinker.AttachAsync(_db, payroll, ct);
        profile = profile with { Commission = commission.Amount, CommissionEntryCount = commission.EntryCount };

        var periodParameters = await _parameters.ResolveAsync(new DateOnly(year, month, 1), ct);
        var payDateParameters = await _parameters.ResolveAsync(payDate, ct);

        var result = ComputeCore(ts, salary, allowances, dependents,
            lateFinePerMinute: 0m,
            allowanceTypes: allowanceTypes,
            periodParameters: periodParameters,
            payDateParameters: payDateParameters,
            profile: profile,
            payDate: payDate);

        payroll.SetInsurableSalary(result.InsurableSalary);
        payroll.SetStatutorySnapshot(BuildSnapshot(result), payDate, result.PitMethod.ToString(),
            result.TaxableGrossIncome);
        payroll.ClearLineItems();
        foreach (var (type, desc, amount, taxable, insurable) in result.Lines)
        {
            payroll.AddLineItem(new PayrollLineItem(payroll.Id, type, desc, amount, taxable, insurable,
                displayOrder: (int)type));
        }

        payroll.ApplyCalculationResult(
            baseSalary: result.BaseSalaryProrated,
            overtimePay: result.OvertimePay,
            totalBonuses: result.OvertimePay + result.TaxableAllowances + result.ExemptAllowances + result.Bonuses
                          + result.Commission,
            insuranceDeduction: result.InsuranceEmployee + result.UnionDuesEmployee,
            taxDeduction: result.Pit,
            otherDeductions: result.OtherDeductions,
            grossPay: result.GrossPay,
            taxableIncome: result.TaxableIncome,
            netPay: result.NetPay,
            regularHours: ts.ActualWorkDays * 8m,
            overtimeHours: result.OvertimeHours);

        return payroll;
    }

    /// <summary>Ngày trả của kỳ lương; kỳ chưa đặt -> ngày <c>PAYROLL_PAY_DAY</c> (mặc định 05) tháng sau.</summary>
    public async Task<DateOnly> ResolvePayDateAsync(Guid? payrollRunId, int year, int month, CancellationToken ct = default)
    {
        var payDay = _settings?.GetInt(PayDaySettingKey, 5) ?? 5;

        if (payrollRunId.HasValue)
        {
            var run = await _db.PayrollRuns.FirstOrDefaultAsync(r => r.Id == payrollRunId.Value, ct);
            if (run is not null) return run.ResolvePayDate(payDay);
        }

        return DefaultPayDate(year, month, payDay);
    }

    /// <summary>Hồ sơ thuế/bảo hiểm: cờ trên <c>Employee</c> + hợp đồng hiệu lực + luỹ kế giờ OT năm.</summary>
    private async Task<PayrollEmployeeProfile> BuildProfileAsync(
        Guid employeeId, int year, int month, DateTime effectiveDate, HR.Domain.Payroll payroll, CancellationToken ct)
    {
        var employee = await _db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == employeeId, ct);

        var contract = await _db.EmploymentContracts.AsNoTracking()
            .Where(c => c.EmployeeId == employeeId
                        && c.Status == ContractStatus.Active
                        && c.StartDate <= effectiveDate
                        && (c.EndDate == null || c.EndDate >= effectiveDate))
            .OrderByDescending(c => c.StartDate)
            .FirstOrDefaultAsync(ct);

        // Luỹ kế giờ OT từ đầu năm đến trước tháng này (trần 200h/năm — BLLĐ Đ.107).
        var ytd = await _db.MonthlyTimesheets.AsNoTracking()
            .Where(t => t.EmployeeId == employeeId && t.Year == year && t.Month < month)
            .SumAsync(t => t.OvertimeHoursWeekday + t.OvertimeHoursSunday + t.OvertimeHoursHoliday
                           + t.OvertimeHoursNight, ct);

        PitMethod? overrideMethod = null;
        if (!string.IsNullOrWhiteSpace(employee?.PitMethodOverride)
            && Enum.TryParse<PitMethod>(employee.PitMethodOverride, ignoreCase: true, out var parsed))
        {
            overrideMethod = parsed;
        }

        return new PayrollEmployeeProfile
        {
            IsStandaloneProbation = contract?.IsStandaloneProbation ?? false,
            IsProbation = contract?.Type == ContractType.Probation,
            ContractMonths = contract?.TermMonths ?? 12,
            IsTaxResident = employee?.IsTaxResident ?? true,
            HasPitCommitment = employee?.HasPitCommitment ?? false,
            IsUnionMember = employee?.IsUnionMember ?? false,
            KeepSiOnUnpaidLeave = payroll.KeepSiOnUnpaidLeave,
            PitMethodOverride = overrideMethod,
            OvertimeHoursYearToDate = ytd,
            Bonuses = payroll.PerformanceBonus + payroll.AttendanceBonus,
            OfficialSalaryForProbation = 0m,
            IsFullTime = contract is null || contract.Type != ContractType.Seasonal
        };
    }

    private static string BuildSnapshot(PayrollCalculationResult result)
        => JsonSerializer.Serialize(new
        {
            schema = "D06/1",
            periodAsOf = result.PeriodMonth,
            payDate = result.PayDate,
            pitMethod = result.PitMethod.ToString(),
            period = result.PeriodParameters,
            payDateParameters = result.PayDateParameters,
            notes = result.Notes
        });

    /// <summary>
    /// Tính ngược Gross từ Net — bisection trên CHÍNH engine đã dùng cho bảng lương (trước W2-25
    /// hàm này gọi <c>VietnameseTaxEngine.CalculatePayroll</c>, tức luật cũ và lấy gross làm căn
    /// cứ đóng bảo hiểm, nên ra số khác bảng lương thật).
    /// </summary>
    public static decimal CalculateGrossFromNet(
        decimal targetNet,
        int numberOfDependents = 0,
        DateOnly? periodMonth = null,
        DateOnly? payDate = null,
        StatutoryParameterSet? periodParameters = null,
        StatutoryParameterSet? payDateParameters = null,
        int maxIterations = 40)
    {
        if (targetNet <= 0) return 0m;

        var period = periodMonth ?? new DateOnly(2026, 1, 1);
        var pay = payDate ?? DefaultPayDate(period.Year, period.Month);
        periodParameters ??= VietnamStatutoryDefaults.Resolve(period);
        payDateParameters ??= VietnamStatutoryDefaults.Resolve(pay);

        decimal low = targetNet, high = targetNet * 3m;

        for (var i = 0; i < maxIterations; i++)
        {
            var mid = (low + high) / 2m;
            var net = NetForGross(mid, numberOfDependents, period, pay, periodParameters, payDateParameters);
            var diff = net - targetNet;
            if (Math.Abs(diff) < 1000m) return Math.Round(mid, 0, MidpointRounding.AwayFromZero);
            if (diff > 0) high = mid; else low = mid;
        }

        return Math.Round((low + high) / 2m, 0, MidpointRounding.AwayFromZero);
    }

    private static decimal NetForGross(
        decimal gross, int dependents, DateOnly period, DateOnly pay,
        StatutoryParameterSet periodParameters, StatutoryParameterSet payDateParameters)
        => PayrollTaxCalculator.Calculate(new PayrollTaxInput
        {
            PeriodMonth = period,
            PayDate = pay,
            BasePay = gross,
            InsurableSalary = gross,
            NumberOfDependents = dependents
        }, periodParameters, payDateParameters).NetPay;
}
