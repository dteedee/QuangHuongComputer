using BuildingBlocks.TaxEngine;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HR.Application.Tax;

/// <summary>
/// Quyết toán thuế TNCN năm — Mẫu 05/QTT-TNCN.
///
/// W2-25 / D06 §4: giảm trừ bản thân/người phụ thuộc và biểu thuế KHÔNG còn là hằng số
/// (<c>VietnameseTaxEngine.PersonalDeduction * 12</c> — luật cũ 11tr) mà resolve qua
/// <see cref="IStatutoryParameterProvider"/> tại **31/12 của năm quyết toán**, đúng cùng một nguồn
/// với bảng lương tháng và với mẫu 05/KK-TNCN bên Reporting. Ba đường tính không thể lệch nhau nữa.
///
/// TV6 (D06 §5): 1 NV lương 30tr × 12 tháng, 0 NPT, năm 2026 -> giảm trừ 186.000.000,
/// bảo hiểm 37.800.000, TN tính thuế 136.200.000, TNCN năm 7.620.000.
/// </summary>
public class PitFinalizationService
{
    private readonly HRDbContext _db;
    private readonly IStatutoryParameterProvider _parameters;

    public PitFinalizationService(HRDbContext db, IStatutoryParameterProvider? parameters = null)
    {
        _db = db;
        _parameters = parameters ?? DefaultStatutoryParameterProvider.Instance;
    }

    /// <summary>Tham số áp dụng cho một năm quyết toán = bộ có hiệu lực tại 31/12 năm đó (D06 §3).</summary>
    public Task<StatutoryParameterSet> GetYearParametersAsync(int year, CancellationToken ct = default)
        => _parameters.ResolveAsync(new DateOnly(year, 12, 31), ct);

    public async Task<PitFinalizationResult> FinalizeAsync(Guid employeeId, int year, CancellationToken ct = default)
    {
        var employee = await _db.Employees.FirstOrDefaultAsync(e => e.Id == employeeId, ct)
            ?? throw new InvalidOperationException($"Không tìm thấy nhân viên {employeeId}.");

        var parameters = await GetYearParametersAsync(year, ct);

        var payrolls = await _db.Payrolls
            .Where(p => p.EmployeeId == employeeId && p.Year == year)
            .ToListAsync(ct);

        var annualTaxableIncome = SumTaxableIncome(payrolls);
        var annualInsurance = payrolls.Sum(p => p.InsuranceDeduction);
        var withheld = payrolls.Sum(p => p.TaxDeduction);

        var dependents = await _db.Dependents
            .Where(d => d.EmployeeId == employeeId)
            .ToListAsync(ct);

        var dependentMonths = CountDependentMonths(dependents, year);
        var dependentDeductionAnnual = parameters.PitDependentDeduction * dependentMonths;
        var personalDeductionAnnual = parameters.PitPersonalDeduction * 12m;

        var assessable = annualTaxableIncome - annualInsurance - personalDeductionAnnual - dependentDeductionAnnual;
        if (assessable < 0) assessable = 0;

        var recalculated = PitCalculator.Annual(assessable, parameters.PitBrackets);
        var difference = withheld - recalculated;

        return new PitFinalizationResult
        {
            EmployeeId = employeeId,
            EmployeeName = employee.FullName,
            TaxCode = employee.TaxCode,
            Year = year,
            ParametersAsOf = parameters.AsOf,
            PersonalDeductionMonthly = parameters.PitPersonalDeduction,
            DependentDeductionMonthly = parameters.PitDependentDeduction,
            AnnualGrossIncome = annualTaxableIncome,
            AnnualInsurance = annualInsurance,
            AnnualPersonalDeduction = personalDeductionAnnual,
            AnnualDependentDeduction = dependentDeductionAnnual,
            DependentMonthCount = dependentMonths,
            AnnualTaxableIncome = assessable,
            RecalculatedAnnualPit = recalculated,
            MonthlyPitWithheldTotal = withheld,
            PitOverpayment = difference > 0 ? difference : 0m,
            PitShortfall = difference < 0 ? -difference : 0m,
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

    /// <summary>
    /// Thu nhập CHỊU thuế năm. Bảng lương tính bởi W2-25 đã lưu sẵn <c>TaxableGrossIncome</c>
    /// (đã loại OT/đêm và phụ cấp miễn thuế); bảng lương cũ chưa có cột đó thì quay về
    /// <c>BaseSalary + Bonuses</c> như trước để không mất dữ liệu lịch sử.
    /// </summary>
    internal static decimal SumTaxableIncome(IEnumerable<Domain.Payroll> payrolls)
        => payrolls.Sum(p => p.TaxableGrossIncome > 0m ? p.TaxableGrossIncome : p.BaseSalary + p.Bonuses);

    /// <summary>Đếm tổng "tháng-người phụ thuộc" trong năm (mỗi dependent active tính theo số tháng active).</summary>
    private static int CountDependentMonths(IEnumerable<Dependent> dependents, int year)
    {
        var total = 0;
        for (int month = 1; month <= 12; month++)
        {
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
    public string? TaxCode { get; set; }
    public int Year { get; set; }

    /// <summary>Ngày đã dùng để tra tham số (31/12 của năm quyết toán).</summary>
    public DateOnly ParametersAsOf { get; set; }
    public decimal PersonalDeductionMonthly { get; set; }
    public decimal DependentDeductionMonthly { get; set; }

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
