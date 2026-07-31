using BuildingBlocks.TaxEngine;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HR.Application.Tax;

/// <summary>
/// Quyết toán thuế TNCN năm — Mẫu 05/QTT-TNCN.
/// Cộng thu nhập / bảo hiểm / thuế đã khấu trừ trong 12 tháng, tính lại thuế theo bậc thuế năm,
/// so với số đã khấu trừ hằng tháng → xác định NLĐ nộp thừa (được hoàn) hay còn thiếu.
/// </summary>
public class PitFinalizationService
{
    private readonly HRDbContext _db;

    public PitFinalizationService(HRDbContext db)
    {
        _db = db;
    }

    public async Task<PitFinalizationResult> FinalizeAsync(Guid employeeId, int year, CancellationToken ct = default)
    {
        var employee = await _db.Employees.FirstOrDefaultAsync(e => e.Id == employeeId, ct)
            ?? throw new InvalidOperationException($"Không tìm thấy nhân viên {employeeId}.");

        // 1. Cộng thu nhập & khấu trừ 12 tháng từ Payroll
        var payrolls = await _db.Payrolls
            .Where(p => p.EmployeeId == employeeId && p.Year == year)
            .ToListAsync(ct);

        var monthlyGross = payrolls.Sum(p => p.BaseSalary + p.Bonuses);
        var monthlyInsurance = payrolls.Sum(p => p.InsuranceDeduction);
        var monthlyPitWithheld = payrolls.Sum(p => p.TaxDeduction);

        // 2. Đếm người phụ thuộc active trong năm (tính theo tháng — tổng "tháng-người phụ thuộc")
        var dependents = await _db.Dependents
            .Where(d => d.EmployeeId == employeeId)
            .ToListAsync(ct);

        var dependentMonths = CountDependentMonths(dependents, year);
        var dependentDeductionsAnnual = VietnameseTaxEngine.DependentDeduction * dependentMonths;

        // 3. Giảm trừ bản thân — 11tr × 12 (giả định nhân viên có mặt cả năm)
        var personalDeductionAnnual = VietnameseTaxEngine.PersonalDeduction * 12m;

        // 4. Tính lại thu nhập chịu thuế năm
        var annualTaxableIncome = monthlyGross - monthlyInsurance - personalDeductionAnnual - dependentDeductionsAnnual;
        if (annualTaxableIncome < 0) annualTaxableIncome = 0;

        // 5. Tính lại PIT năm (bậc thuế × 12)
        var recalculatedPit = VietnameseTaxEngine.CalculateAnnualPit(annualTaxableIncome);

        // 6. So sánh
        var difference = monthlyPitWithheld - recalculatedPit;   // dương = nộp thừa, âm = còn thiếu

        return new PitFinalizationResult
        {
            EmployeeId = employeeId,
            EmployeeName = employee.FullName,
            Year = year,
            AnnualGrossIncome = monthlyGross,
            AnnualInsurance = monthlyInsurance,
            AnnualPersonalDeduction = personalDeductionAnnual,
            AnnualDependentDeduction = dependentDeductionsAnnual,
            DependentMonthCount = dependentMonths,
            AnnualTaxableIncome = annualTaxableIncome,
            RecalculatedAnnualPit = recalculatedPit,
            MonthlyPitWithheldTotal = monthlyPitWithheld,
            PitOverpayment = difference > 0 ? difference : 0m,       // được hoàn
            PitShortfall = difference < 0 ? -difference : 0m,        // phải nộp thêm
            MonthsCounted = payrolls.Count
        };
    }

    public async Task<List<PitFinalizationResult>> GetSummaryAsync(int year, CancellationToken ct = default)
    {
        var employeeIds = await _db.Payrolls
            .Where(p => p.Year == year)
            .Select(p => p.EmployeeId)
            .Distinct()
            .ToListAsync(ct);

        var results = new List<PitFinalizationResult>();
        foreach (var eid in employeeIds)
        {
            results.Add(await FinalizeAsync(eid, year, ct));
        }
        return results;
    }

    /// <summary>Đếm tổng "tháng-người phụ thuộc" trong năm (mỗi dependent active tính theo số tháng active).</summary>
    private static int CountDependentMonths(IEnumerable<Dependent> dependents, int year)
    {
        var total = 0;
        for (int month = 1; month <= 12; month++)
        {
            // Đại diện tháng — lấy ngày cuối tháng để bao phủ trọn tháng
            var probe = new DateTime(year, month, DateTime.DaysInMonth(year, month), 23, 59, 59, DateTimeKind.Utc);
            total += dependents.Count(d => d.IsActiveOn(probe));
        }
        return total;
    }
}

public class PitFinalizationResult
{
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public int Year { get; set; }
    public decimal AnnualGrossIncome { get; set; }
    public decimal AnnualInsurance { get; set; }
    public decimal AnnualPersonalDeduction { get; set; }
    public decimal AnnualDependentDeduction { get; set; }
    public int DependentMonthCount { get; set; }
    public decimal AnnualTaxableIncome { get; set; }
    public decimal RecalculatedAnnualPit { get; set; }
    public decimal MonthlyPitWithheldTotal { get; set; }
    public decimal PitOverpayment { get; set; }     // hoàn thuế
    public decimal PitShortfall { get; set; }       // nộp thêm
    public int MonthsCounted { get; set; }
}
