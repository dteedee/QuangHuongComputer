using BuildingBlocks.TaxEngine;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;
// Phase 06 A hotfix: namespace "HR.Application.Payroll" trùng tên với type HR.Domain.Payroll
// nên C# hiểu 'Payroll' là namespace. Type alias giải quyết mà không đổi API.
using Payroll = HR.Domain.Payroll;

namespace HR.Application.Payroll;

/// <summary>
/// Kết quả tính lương trước khi apply lên entity.
/// </summary>
public class PayrollCalculationResult
{
    public decimal BaseSalaryProrated { get; init; }        // Lương cơ bản × công thực tế/công chuẩn
    public decimal OvertimePay { get; init; }
    public decimal TaxableAllowances { get; init; }         // Phụ cấp chịu thuế
    public decimal ExemptAllowances { get; init; }          // Phụ cấp miễn thuế
    public decimal Bonuses { get; init; }
    public decimal GrossPay { get; init; }                  // Tổng thu nhập trước khấu trừ
    public decimal InsurableSalary { get; init; }
    public decimal InsuranceEmployee { get; init; }         // BHXH+BHYT+BHTN phần NLĐ
    public decimal TaxableIncome { get; init; }             // Thu nhập tính thuế sau giảm trừ
    public decimal Pit { get; init; }                       // Thuế TNCN
    public decimal LateFine { get; init; }
    public decimal AdvanceDeduction { get; init; }
    public decimal OtherDeductions => LateFine + AdvanceDeduction;
    public decimal NetPay { get; init; }
    public int NumberOfDependents { get; init; }
    public List<(PayrollLineType Type, string Desc, decimal Amount, bool Taxable, bool Insurable)> Lines { get; init; } = new();
}

/// <summary>
/// TRUNG TÂM tính lương — dùng VietnameseTaxEngine cho bảo hiểm + PIT.
/// Thuật toán 10 bước theo phase-06 plan:
/// 1. Load Timesheet locked
/// 2. Load SalaryStructure hiệu lực
/// 3. Lương cơ bản × (ActualDays / StandardDays) → BaseSalary line
/// 4. + Tiền OT theo hệ số 150/200/300% × HourlyRate
/// 5. + Allowances (chia taxable / exempt)
/// 6. Gross taxable income
/// 7. − Bảo hiểm ← VietnameseTaxEngine.CalculateInsurance
/// 8. − Giảm trừ bản thân + người phụ thuộc
/// 9. Thu nhập tính thuế
/// 10. − PIT ← VietnameseTaxEngine.CalculateMonthlyPit
/// 11. − Phạt đi muộn + tạm ứng
/// 12. NetPay
/// </summary>
public class PayrollCalculationService
{
    private readonly HRDbContext _db;
    private readonly ITaxSettingsProvider? _taxSettingsProvider;

    // ITaxSettingsProvider optional: null → fallback hằng số luật định trong VietnameseTaxEngine
    // (giữ backward-compat cho unit test khởi tạo trực tiếp không qua DI).
    public PayrollCalculationService(HRDbContext db, ITaxSettingsProvider? taxSettingsProvider = null)
    {
        _db = db;
        _taxSettingsProvider = taxSettingsProvider;
    }

    /// <summary>Tính cho 1 nhân viên. KHÔNG save (caller quản lý transaction).</summary>
    public async Task<HR.Domain.Payroll> CalculateAsync(
        Guid employeeId,
        int year,
        int month,
        Guid? payrollRunId = null,
        CancellationToken ct = default)
    {
        // 1. Timesheet
        var ts = await _db.MonthlyTimesheets
            .FirstOrDefaultAsync(t => t.EmployeeId == employeeId && t.Year == year && t.Month == month, ct)
            ?? throw new InvalidOperationException(
                $"Chưa có MonthlyTimesheet cho nhân viên {employeeId} kỳ {month}/{year}.");
        if (ts.Status != MonthlyTimesheetStatus.Locked)
            throw new InvalidOperationException(
                $"MonthlyTimesheet {month}/{year} chưa Locked — không thể tính lương.");

        // 2. SalaryStructure hiệu lực đầu tháng
        var effectiveDate = new DateTime(year, month, 1);
        var salary = await _db.SalaryStructures
            .Where(s => s.EmployeeId == employeeId)
            .ToListAsync(ct);
        var effective = salary.GetEffectiveOn(effectiveDate)
            ?? throw new InvalidOperationException(
                $"Không có SalaryStructure hiệu lực tại {effectiveDate:yyyy-MM-dd} cho nhân viên {employeeId}.");

        // 3. Load Payroll draft (hoặc tạo mới)
        var payroll = await _db.Payrolls
            .FirstOrDefaultAsync(p => p.EmployeeId == employeeId && p.Year == year && p.Month == month, ct);
        if (payroll == null)
        {
            payroll = new HR.Domain.Payroll(employeeId, month, year, effective.BaseSalary);
            _db.Payrolls.Add(payroll);
        }
        else if (payroll.Status != PayrollStatus.Draft)
        {
            throw new InvalidOperationException(
                $"Bảng lương {month}/{year} cho NV {employeeId} đã {payroll.Status}, không tính lại.");
        }
        if (payrollRunId.HasValue) payroll.AssignToRun(payrollRunId.Value);

        // 4. Số người phụ thuộc active trong tháng
        var dependents = await _db.Dependents
            .Where(d => d.EmployeeId == employeeId)
            .ToListAsync(ct);
        var effectiveDependents = dependents.Count(d => d.IsActiveOn(effectiveDate));
        payroll.SetDependents(effectiveDependents);

        // 5. Phụ cấp hiệu lực trong tháng
        var allowances = await _db.Allowances
            .Where(a => a.EmployeeId == employeeId)
            .ToListAsync(ct);
        var activeAllowances = allowances.Where(a => a.IsEffectiveOn(effectiveDate)).ToList();

        // 6. Tính — hằng số thuế động từ SystemConfig (category "Tax"), fallback luật định
        var taxSettings = _taxSettingsProvider is null ? null : await _taxSettingsProvider.GetAsync(ct);
        var result = ComputeCore(ts, effective, activeAllowances, effectiveDependents, taxSettings: taxSettings);

        // 7. Ghi kết quả + line items
        payroll.SetInsurableSalary(result.InsurableSalary);
        payroll.ClearLineItems();
        foreach (var (type, desc, amount, taxable, insurable) in result.Lines)
        {
            payroll.AddLineItem(new PayrollLineItem(payroll.Id, type, desc, amount, taxable, insurable,
                displayOrder: (int)type));
        }

        payroll.ApplyCalculationResult(
            baseSalary: result.BaseSalaryProrated,
            overtimePay: result.OvertimePay,
            totalBonuses: result.OvertimePay + result.TaxableAllowances + result.ExemptAllowances + result.Bonuses,
            insuranceDeduction: result.InsuranceEmployee,
            taxDeduction: result.Pit,
            otherDeductions: result.OtherDeductions,
            grossPay: result.GrossPay,
            taxableIncome: result.TaxableIncome,
            netPay: result.NetPay,
            regularHours: ts.ActualWorkDays * 8m,
            overtimeHours: ts.TotalOvertimeHours);

        return payroll;
    }

    /// <summary>
    /// Core computation — tách khỏi DB để test độc lập.
    /// </summary>
    public static PayrollCalculationResult ComputeCore(
        MonthlyTimesheet ts,
        SalaryStructure salary,
        IReadOnlyCollection<Allowance> allowances,
        int numberOfDependents,
        decimal lateFinePerMinute = 0,
        TaxSettings? taxSettings = null)
    {
        var lines = new List<(PayrollLineType, string, decimal, bool, bool)>();

        // 3. Lương cơ bản theo công thực tế
        var standardDays = ts.StandardWorkDays > 0 ? ts.StandardWorkDays : 22m;
        var attendanceRatio = standardDays > 0
            ? (ts.ActualWorkDays + (decimal)ts.LeaveDaysPaid) / standardDays
            : 0m;
        attendanceRatio = Math.Min(1m, Math.Max(0m, attendanceRatio));
        var baseSalaryProrated = Math.Round(salary.BaseSalary * attendanceRatio, 0);
        lines.Add((PayrollLineType.BaseSalary,
            $"Lương cơ bản {salary.BaseSalary:N0} × {ts.ActualWorkDays + ts.LeaveDaysPaid:F1}/{standardDays:F1}",
            baseSalaryProrated, true, true));

        // 4. Tiền OT theo hệ số 150/200/300% × HourlyRate
        // HourlyRate = BaseSalary / (standardDays * 8h). Dùng công chuẩn của tháng.
        var hourlyRate = standardDays > 0 ? Math.Round(salary.BaseSalary / (standardDays * 8m), 0) : 0m;
        var otWeekdayPay = Math.Round(ts.OvertimeHoursWeekday * hourlyRate * 1.5m, 0);
        var otSundayPay = Math.Round(ts.OvertimeHoursSunday * hourlyRate * 2.0m, 0);
        var otHolidayPay = Math.Round(ts.OvertimeHoursHoliday * hourlyRate * 3.0m, 0);
        var otNightBonusPay = Math.Round(ts.OvertimeHoursNight * hourlyRate * 0.3m, 0);
        var overtimePay = otWeekdayPay + otSundayPay + otHolidayPay + otNightBonusPay;

        if (overtimePay > 0)
            lines.Add((PayrollLineType.Overtime,
                $"OT: {ts.OvertimeHoursWeekday}h thường + {ts.OvertimeHoursSunday}h CN + {ts.OvertimeHoursHoliday}h lễ + {ts.OvertimeHoursNight}h đêm",
                overtimePay, true, false));

        // 5. Phụ cấp — chia taxable / exempt
        var taxableAllowances = 0m;
        var exemptAllowances = 0m;
        // Chỉ tách theo TaxExemptCap trên loại — model đơn giản hoá vì phase 06 chưa có AllowanceType master
        foreach (var a in allowances)
        {
            // Toàn bộ Amount cộng vào gross
            var amount = a.Amount;
            // Hiện tại Allowance chưa có TaxExemptCap → default all taxable
            // TODO(Phase 08): join với AllowanceType để lấy cap
            taxableAllowances += amount;
            lines.Add((PayrollLineType.Allowance, $"Phụ cấp ({a.Id.ToString()[..8]})", amount, true, false));
        }

        // 6. Gross
        var grossPay = baseSalaryProrated + overtimePay + taxableAllowances + exemptAllowances;

        // 7. Bảo hiểm — dùng InsurableSalary (không phải grossPay). Trần 46.8tr xử lý trong engine.
        var insurableSalary = salary.InsurableSalary;
        var insurance = VietnameseTaxEngine.CalculateInsurance(insurableSalary);
        var empInsurance = insurance.Employee.Total;
        lines.Add((PayrollLineType.InsuranceEmployee,
            $"BHXH 8% + BHYT 1.5% + BHTN 1% trên {insurance.InsurableSalary:N0}",
            empInsurance, false, false));

        // 8. Giảm trừ (chỉ để hiển thị breakdown — engine đã trừ trong CalculateMonthlyPit)
        var personalDed = taxSettings?.PersonalDeduction ?? VietnameseTaxEngine.PersonalDeduction;
        var dependentDedUnit = taxSettings?.DependentDeduction ?? VietnameseTaxEngine.DependentDeduction;
        var dependentDed = dependentDedUnit * numberOfDependents;
        lines.Add((PayrollLineType.PersonalDeduction, "Giảm trừ bản thân", personalDed, false, false));
        if (numberOfDependents > 0)
            lines.Add((PayrollLineType.DependentDeduction,
                $"Giảm trừ {numberOfDependents} người phụ thuộc × {dependentDedUnit / 1_000_000m:0.#}tr",
                dependentDed, false, false));

        // 9-10. PIT — chỉ tính trên phần THU NHẬP CHỊU THUẾ (grossPay - exempt allowances)
        var taxableGross = baseSalaryProrated + overtimePay + taxableAllowances;
        var pitResult = VietnameseTaxEngine.CalculateMonthlyPit(
            grossSalary: taxableGross,
            numberOfDependents: numberOfDependents,
            socialInsurance: insurance.Employee.SocialInsurance,
            healthInsurance: insurance.Employee.HealthInsurance,
            unemploymentInsurance: insurance.Employee.UnemploymentInsurance,
            personalDeduction: taxSettings?.PersonalDeduction,
            dependentDeduction: taxSettings?.DependentDeduction);
        var pit = pitResult.PitAmount;
        if (pit > 0)
            lines.Add((PayrollLineType.Pit,
                $"Thuế TNCN (TN chịu thuế {pitResult.TaxableIncome:N0})", pit, false, false));

        // 11. Phạt đi muộn
        var lateFine = Math.Round(ts.TotalLateMinutes * lateFinePerMinute, 0);
        if (lateFine > 0)
            lines.Add((PayrollLineType.LateFine,
                $"Phạt đi muộn {ts.TotalLateMinutes} phút × {lateFinePerMinute:N0}",
                lateFine, false, false));

        // 12. Net pay
        var netPay = grossPay - empInsurance - pit - lateFine;

        return new PayrollCalculationResult
        {
            BaseSalaryProrated = baseSalaryProrated,
            OvertimePay = overtimePay,
            TaxableAllowances = taxableAllowances,
            ExemptAllowances = exemptAllowances,
            Bonuses = 0m,
            GrossPay = grossPay,
            InsurableSalary = insurableSalary,
            InsuranceEmployee = empInsurance,
            TaxableIncome = pitResult.TaxableIncome,
            Pit = pit,
            LateFine = lateFine,
            AdvanceDeduction = 0m,
            NetPay = Math.Max(0m, netPay),
            NumberOfDependents = numberOfDependents,
            Lines = lines
        };
    }

    /// <summary>
    /// Tính ngược Gross từ Net — bisection loop.
    /// Dùng khi nhân viên thoả thuận lương net và HR cần biết mức đóng BHXH tương ứng.
    /// </summary>
    public static decimal CalculateGrossFromNet(
        decimal targetNet,
        int numberOfDependents = 0,
        decimal maxIterations = 40)
    {
        if (targetNet <= 0) return 0m;

        decimal low = targetNet;
        decimal high = targetNet * 3m;  // gross tối đa 3× net (biên trên rộng)

        for (var i = 0; i < maxIterations; i++)
        {
            var mid = (low + high) / 2m;
            var res = VietnameseTaxEngine.CalculatePayroll(mid, numberOfDependents);
            var diff = res.NetSalary - targetNet;
            if (Math.Abs(diff) < 1000m) return Math.Round(mid, 0);   // sai số ≤ 1000đ
            if (diff > 0) high = mid;
            else low = mid;
        }
        return Math.Round((low + high) / 2m, 0);
    }
}
