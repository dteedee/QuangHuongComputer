using BuildingBlocks.TaxEngine;
using HR.Domain;

// Namespace CỐ Ý là HR.Application.Payroll (không phải ...Tax): đây là nửa THUẦN của
// PayrollCalculationService, tách ra cho file dưới 200 dòng. File nằm trong Application/Tax/**
// theo ranh giới sở hữu của W2-25.
namespace HR.Application.Payroll;

/// <summary>
/// W2-25 / D06 §4 — hồ sơ thuế/bảo hiểm của một người cho MỘT kỳ lương. Ánh xạ từ
/// <c>Employee</c> + <c>EmploymentContract</c> + <c>Payroll</c>; không chạm DB.
/// </summary>
public sealed record PayrollEmployeeProfile
{
    /// <summary>HỢP ĐỒNG THỬ VIỆC RIÊNG — miễn toàn bộ BHXH/BHYT/BHTN và khấu trừ 10% (D06 §4).</summary>
    public bool IsStandaloneProbation { get; init; }

    /// <summary>Thời hạn HĐLĐ tính bằng tháng; &lt; 3 -> khấu trừ 10%.</summary>
    public int ContractMonths { get; init; } = 12;

    public bool IsTaxResident { get; init; } = true;
    public bool HasPitCommitment { get; init; }
    public bool IsUnionMember { get; init; }
    public bool KeepSiOnUnpaidLeave { get; init; }
    public PitMethod? PitMethodOverride { get; init; }

    /// <summary>Luỹ kế giờ làm thêm từ đầu năm (áp trần 200h/năm của BLLĐ Đ.107).</summary>
    public decimal OvertimeHoursYearToDate { get; init; }

    /// <summary>Thưởng chịu thuế 100%, không đóng bảo hiểm (doanh số, lương tháng 13).</summary>
    public decimal Bonuses { get; init; }

    /// <summary>Lương chính thức của vị trí — dùng kiểm tra lương thử việc ≥ 85% (BLLĐ Đ.26).</summary>
    public decimal OfficialSalaryForProbation { get; init; }

    /// <summary>Là hợp đồng thử việc (dù riêng hay ghi trong HĐLĐ) — bật kiểm tra 85%.</summary>
    public bool IsProbation { get; init; }

    /// <summary>HĐLĐ toàn thời gian — bật kiểm tra lương ≥ lương tối thiểu vùng.</summary>
    public bool IsFullTime { get; init; } = true;

    public static readonly PayrollEmployeeProfile Default = new();
}

public partial class PayrollCalculationService
{
    /// <summary>
    /// W2-25 / D06 §4 — MỘT đường tính lương duy nhất. Toàn bộ phép tính nằm ở
    /// <see cref="PayrollTaxCalculator"/> (BuildingBlocks, W1-15); hàm này chỉ ánh xạ entity HR
    /// sang <see cref="PayrollTaxInput"/>, tách phụ cấp và dựng line items.
    ///
    /// Hai bộ tham số khác nhau vì luật đổi theo hai mốc (D06 §3): bảo hiểm/LTT vùng/hệ số OT tra
    /// tại NGÀY 01 THÁNG LƯƠNG, thuế TNCN tra tại NGÀY TRẢ.
    /// </summary>
    public static PayrollCalculationResult ComputeCore(
        MonthlyTimesheet ts,
        SalaryStructure salary,
        IReadOnlyCollection<Allowance> allowances,
        int numberOfDependents,
        decimal lateFinePerMinute = 0,
        IReadOnlyDictionary<Guid, AllowanceType>? allowanceTypes = null,
        StatutoryParameterSet? periodParameters = null,
        StatutoryParameterSet? payDateParameters = null,
        PayrollEmployeeProfile? profile = null,
        DateOnly? payDate = null)
    {
        profile ??= PayrollEmployeeProfile.Default;
        var periodMonth = new DateOnly(ts.Year, ts.Month, 1);
        var effectivePayDate = payDate ?? DefaultPayDate(ts.Year, ts.Month);
        periodParameters ??= VietnamStatutoryDefaults.Resolve(periodMonth);
        payDateParameters ??= VietnamStatutoryDefaults.Resolve(effectivePayDate);

        var lines = new List<(PayrollLineType, string, decimal, bool, bool)>();

        // 1. Lương theo công thực tế.
        var standardDays = ts.StandardWorkDays > 0 ? ts.StandardWorkDays : 22m;
        var ratio = Math.Clamp((ts.ActualWorkDays + ts.LeaveDaysPaid) / standardDays, 0m, 1m);
        var basePay = Round(salary.BaseSalary * ratio);
        lines.Add((PayrollLineType.BaseSalary,
            $"Lương cơ bản {salary.BaseSalary:N0} × {ts.ActualWorkDays + ts.LeaveDaysPaid:F1}/{standardDays:F1}",
            basePay, true, true));

        // 2. Phụ cấp — ăn ca bằng tiền đi theo hạn mức hiệu lực theo ngày, phần còn lại tách
        //    chịu thuế / miễn thuế theo AllowanceType.
        var buckets = SplitAllowances(allowances, allowanceTypes, lines);

        // 3. Đầu vào thuần cho kernel.
        var input = new PayrollTaxInput
        {
            PeriodMonth = periodMonth,
            PayDate = effectivePayDate,
            BasePay = basePay,
            InsurableSalary = salary.InsurableSalary,
            OvertimeHourlyBase = salary.BaseSalary + buckets.InsurableAllowances,
            MealAllowanceCash = buckets.MealCash,
            OtherTaxableAllowances = buckets.Taxable,
            NonTaxableAllowances = buckets.NonTaxable,
            Bonuses = profile.Bonuses,
            StandardWorkingDays = standardDays,
            HoursPerDay = 8m,
            Overtime = BuildOvertimeEntries(ts),
            NightHours = ts.NightShiftHours,
            OvertimeHoursYearToDate = profile.OvertimeHoursYearToDate,
            UnpaidLeaveWorkingDays = ts.LeaveDaysUnpaid,
            KeepSiOnUnpaidLeave = profile.KeepSiOnUnpaidLeave,
            IsStandaloneProbation = profile.IsStandaloneProbation,
            IsTaxResident = profile.IsTaxResident,
            ContractMonths = profile.ContractMonths,
            HasPitCommitment = profile.HasPitCommitment,
            IsUnionMember = profile.IsUnionMember,
            NumberOfDependents = numberOfDependents,
            PitMethodOverride = profile.PitMethodOverride
        };

        GuardStatutoryMinimums(salary, profile, periodParameters);

        var b = PayrollTaxCalculator.Calculate(input, periodParameters, payDateParameters);
        AddEngineLines(lines, b, payDateParameters, numberOfDependents, profile.Bonuses);

        // 4. Phạt đi muộn nằm NGOÀI thu nhập tính thuế (là khấu trừ kỷ luật, không phải giảm trừ).
        var lateFine = Round(ts.TotalLateMinutes * lateFinePerMinute);
        if (lateFine > 0)
        {
            lines.Add((PayrollLineType.LateFine,
                $"Phạt đi muộn {ts.TotalLateMinutes} phút × {lateFinePerMinute:N0}", lateFine, false, false));
        }

        return new PayrollCalculationResult
        {
            PeriodMonth = periodMonth,
            PayDate = effectivePayDate,
            PitMethod = b.PitMethod,
            BaseSalaryProrated = basePay,
            OvertimePay = b.Overtime.TotalPay + b.Overtime.NightPremiumPay,
            OvertimeHours = b.Overtime.TotalHours,
            OvertimeHourlyRate = b.Overtime.HourlyRate,
            OvertimeExemptPay = b.Overtime.ExemptPay,
            OvertimeTaxablePay = b.Overtime.TaxablePay,
            TaxableAllowances = buckets.Taxable + buckets.MealCash,
            ExemptAllowances = buckets.NonTaxable,
            Bonuses = profile.Bonuses,
            GrossPay = b.GrossPay,
            InsurableSalary = b.Insurance.SocialInsuranceBase,
            InsuranceEmployee = b.Insurance.EmployeeTotal,
            InsuranceEmployer = b.Insurance.EmployerTotal,
            UnionDuesEmployee = b.UnionDuesEmployee,
            UnionFeeEmployer = b.UnionFeeEmployer,
            TaxableGrossIncome = b.TaxableIncome,
            TaxableIncome = b.AssessableIncome,
            Pit = b.PersonalIncomeTax,
            LateFine = lateFine,
            AdvanceDeduction = 0m,
            NetPay = Math.Max(0m, b.NetPay - lateFine),
            TotalEmployerCost = b.TotalEmployerCost,
            NumberOfDependents = numberOfDependents,
            Notes = b.Notes,
            Lines = lines,
            PeriodParameters = periodParameters,
            PayDateParameters = payDateParameters
        };
    }

    /// <summary>Ngày trả mặc định: ngày 05 tháng kế tiếp (D06 §3, cấu hình <c>PAYROLL_PAY_DAY</c>).</summary>
    public static DateOnly DefaultPayDate(int year, int month, int payDay = 5)
    {
        var next = new DateOnly(year, month, 1).AddMonths(1);
        return new DateOnly(next.Year, next.Month,
            Math.Clamp(payDay, 1, DateTime.DaysInMonth(next.Year, next.Month)));
    }

    private static decimal Round(decimal v) => Math.Round(v, 0, MidpointRounding.AwayFromZero);
}
