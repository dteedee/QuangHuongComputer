using BuildingBlocks.TaxEngine;
using HR.Domain;

// Nửa còn lại của phần THUẦN trong PayrollCalculationService — xem PayrollComputeCore.cs.
namespace HR.Application.Payroll;

/// <summary>Kết quả tính lương trước khi apply lên entity (W2-25 mở rộng theo D06 §4).</summary>
public class PayrollCalculationResult
{
    public DateOnly PeriodMonth { get; init; }
    public DateOnly PayDate { get; init; }
    public PitMethod PitMethod { get; init; }

    public decimal BaseSalaryProrated { get; init; }
    public decimal OvertimePay { get; init; }
    public decimal OvertimeHours { get; init; }

    /// <summary>Lương giờ đã làm tròn về đồng TRƯỚC khi nhân hệ số (D06 §4 — thứ tự quyết định kết quả).</summary>
    public decimal OvertimeHourlyRate { get; init; }

    /// <summary>Tiền OT/làm đêm ĐƯỢC MIỄN thuế trong phạm vi giờ hợp pháp (Luật 109/2025 Đ.4.8).</summary>
    public decimal OvertimeExemptPay { get; init; }
    public decimal OvertimeTaxablePay { get; init; }

    public decimal TaxableAllowances { get; init; }
    public decimal ExemptAllowances { get; init; }
    public decimal Bonuses { get; init; }
    /// <summary>Hoa hồng kỹ thuật (đã nằm trong GrossPay/TaxableGrossIncome qua kernel).</summary>
    public decimal Commission { get; init; }
    public decimal GrossPay { get; init; }
    public decimal InsurableSalary { get; init; }
    public decimal InsuranceEmployee { get; init; }
    public decimal InsuranceEmployer { get; init; }
    public decimal UnionDuesEmployee { get; init; }
    public decimal UnionFeeEmployer { get; init; }

    /// <summary>Thu nhập CHỊU thuế (đã loại OT/đêm và phụ cấp được miễn, chưa trừ bảo hiểm/giảm trừ).</summary>
    public decimal TaxableGrossIncome { get; init; }

    /// <summary>Thu nhập TÍNH thuế (sau bảo hiểm và giảm trừ).</summary>
    public decimal TaxableIncome { get; init; }
    public decimal Pit { get; init; }
    public decimal LateFine { get; init; }
    public decimal AdvanceDeduction { get; init; }
    public decimal OtherDeductions => LateFine + AdvanceDeduction;
    public decimal NetPay { get; init; }
    public decimal TotalEmployerCost { get; init; }
    public int NumberOfDependents { get; init; }

    public IReadOnlyList<string> Notes { get; init; } = Array.Empty<string>();
    public List<(PayrollLineType Type, string Desc, decimal Amount, bool Taxable, bool Insurable)> Lines { get; init; } = new();

    /// <summary>Bộ tham số đã dùng — nguồn của <c>Payroll.StatutorySnapshotJson</c>.</summary>
    public StatutoryParameterSet? PeriodParameters { get; init; }
    public StatutoryParameterSet? PayDateParameters { get; init; }
}

public partial class PayrollCalculationService
{
    private readonly record struct AllowanceBuckets(
        decimal MealCash,
        decimal Taxable,
        decimal NonTaxable,
        decimal InsurableAllowances);

    /// <summary>
    /// Tách phụ cấp thành 4 nhóm. Ăn ca/ăn trưa bằng TIỀN đi riêng vì hạn mức miễn thuế của nó
    /// hiệu lực theo ngày (730.000 đến 30/06/2026, 1.200.000 từ 01/07/2026 — NĐ 253/2026 Đ.8.2.g
    /// + Đ.69.1.b), không phải hằng số trên <c>AllowanceType</c>.
    /// </summary>
    private static AllowanceBuckets SplitAllowances(
        IReadOnlyCollection<Allowance> allowances,
        IReadOnlyDictionary<Guid, AllowanceType>? allowanceTypes,
        List<(PayrollLineType, string, decimal, bool, bool)> lines)
    {
        decimal meal = 0m, taxable = 0m, nonTaxable = 0m, insurable = 0m;

        foreach (var a in allowances)
        {
            var type = allowanceTypes is not null && allowanceTypes.TryGetValue(a.AllowanceTypeId, out var t) ? t : null;
            var amount = a.Amount;
            var name = type?.Name ?? a.Id.ToString()[..8];

            if (type is not null && type.IsInsurable) insurable += amount;

            if (type is not null && string.Equals(type.Code, "LUNCH", StringComparison.OrdinalIgnoreCase))
            {
                meal += amount;
            }
            else if (type is null || type.IsTaxable)
            {
                // Không xác định được loại (dữ liệu cũ) -> an toàn về phía ngân sách: chịu thuế.
                taxable += amount;
            }
            else if (type.TaxFreeMonthlyLimit <= 0m)
            {
                nonTaxable += amount;
            }
            else
            {
                var exempt = Math.Min(amount, type.TaxFreeMonthlyLimit);
                nonTaxable += exempt;
                taxable += amount - exempt;
            }

            lines.Add((PayrollLineType.Allowance, $"Phụ cấp {name}", amount,
                type?.IsTaxable ?? true, type?.IsInsurable ?? false));
        }

        return new AllowanceBuckets(meal, taxable, nonTaxable, insurable);
    }

    /// <summary>
    /// Sáu khối giờ làm thêm: ba loại ngày × ca ngày/ca đêm. "Ngày nghỉ hằng tuần" là cột
    /// <c>OvertimeHoursSunday</c> (theo lịch ca, không mặc định Chủ nhật — D06 §4).
    /// </summary>
    private static IReadOnlyList<OvertimeEntry> BuildOvertimeEntries(MonthlyTimesheet ts)
    {
        var (nightWeekday, nightRestDay, nightHoliday) = ts.EffectiveNightOvertime();

        return new List<OvertimeEntry>
        {
            new(OvertimeDayType.Weekday, ts.OvertimeHoursWeekday),
            new(OvertimeDayType.RestDay, ts.OvertimeHoursSunday),
            new(OvertimeDayType.Holiday, ts.OvertimeHoursHoliday),
            new(OvertimeDayType.Weekday, nightWeekday, AtNight: true),
            new(OvertimeDayType.RestDay, nightRestDay, AtNight: true),
            new(OvertimeDayType.Holiday, nightHoliday, AtNight: true)
        }.Where(e => e.Hours > 0m).ToList();
    }

    /// <summary>Line items sinh ra từ kết quả kernel (phiếu lương phải hiện đủ từng khoản).</summary>
    private static void AddEngineLines(
        List<(PayrollLineType, string, decimal, bool, bool)> lines,
        PayrollBreakdown b,
        StatutoryParameterSet payDateParameters,
        int numberOfDependents,
        decimal bonuses)
    {
        if (b.Overtime.TotalPay + b.Overtime.NightPremiumPay > 0m)
        {
            lines.Add((PayrollLineType.Overtime,
                $"Làm thêm {b.Overtime.TotalHours:0.##}h (miễn thuế {b.Overtime.ExemptHours:0.##}h = {b.Overtime.ExemptPay:N0}đ)",
                b.Overtime.TotalPay + b.Overtime.NightPremiumPay, true, false));
        }

        if (bonuses > 0m)
            lines.Add((PayrollLineType.Bonus, "Thưởng (chịu thuế, không đóng bảo hiểm)", bonuses, true, false));

        if (b.Insurance.EmployeeTotal > 0m)
        {
            lines.Add((PayrollLineType.InsuranceEmployee,
                $"BHXH 8% + BHYT 1,5% trên {b.Insurance.SocialInsuranceBase:N0} · BHTN 1% trên {b.Insurance.UnemploymentBase:N0}",
                b.Insurance.EmployeeTotal, false, false));
        }

        if (b.PitMethod == PitMethod.Progressive)
        {
            lines.Add((PayrollLineType.PersonalDeduction, "Giảm trừ bản thân",
                payDateParameters.PitPersonalDeduction, false, false));

            if (numberOfDependents > 0)
            {
                lines.Add((PayrollLineType.DependentDeduction,
                    $"Giảm trừ {numberOfDependents} người phụ thuộc × {payDateParameters.PitDependentDeduction:N0}",
                    payDateParameters.PitDependentDeduction * numberOfDependents, false, false));
            }
        }

        if (b.PersonalIncomeTax > 0m)
        {
            var label = b.PitMethod switch
            {
                PitMethod.Flat10 => $"Khấu trừ {payDateParameters.PitFlatRate:P0} (HĐ thử việc riêng / HĐ < 3 tháng)",
                PitMethod.NonResident20 => $"Thuế TNCN không cư trú {payDateParameters.PitNonResidentRate:P0}",
                _ => $"Thuế TNCN luỹ tiến (TN tính thuế {b.AssessableIncome:N0})"
            };
            lines.Add((PayrollLineType.Pit, label, b.PersonalIncomeTax, false, false));
        }

        if (b.UnionDuesEmployee > 0m)
            lines.Add((PayrollLineType.OtherDeduction, "Đoàn phí công đoàn", b.UnionDuesEmployee, false, false));
    }

    /// <summary>
    /// D06 §4 — hai mức sàn pháp lý. Vi phạm thì DỪNG kỳ lương của người đó (kỳ lương hàng loạt
    /// ghi lỗi theo từng nhân viên thay vì âm thầm trả lương dưới luật).
    /// </summary>
    private static void GuardStatutoryMinimums(
        SalaryStructure salary,
        PayrollEmployeeProfile profile,
        StatutoryParameterSet periodParameters)
    {
        if (profile.IsFullTime && !profile.IsProbation)
        {
            var minWage = periodParameters.MinWageFor(periodParameters.CompanyWageRegion).MonthlyWage;
            if (salary.BaseSalary < minWage)
            {
                throw new InvalidOperationException(
                    $"Lương hợp đồng {salary.BaseSalary:N0}đ thấp hơn lương tối thiểu vùng "
                    + $"{periodParameters.CompanyWageRegion} ({minWage:N0}đ, NĐ 293/2025) — không tính lương được.");
            }
        }

        if (profile.IsProbation && profile.OfficialSalaryForProbation > 0m)
        {
            var floor = Math.Round(profile.OfficialSalaryForProbation * periodParameters.ProbationMinRatio,
                0, MidpointRounding.AwayFromZero);
            if (salary.BaseSalary < floor)
            {
                throw new InvalidOperationException(
                    $"Lương thử việc {salary.BaseSalary:N0}đ thấp hơn {periodParameters.ProbationMinRatio:P0} "
                    + $"lương chính thức ({floor:N0}đ, BLLĐ Đ.26) — không tính lương được.");
            }
        }
    }
}
