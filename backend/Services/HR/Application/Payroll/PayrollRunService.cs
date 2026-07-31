using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HR.Application.Payroll;

/// <summary>Điều phối chạy kỳ lương hàng loạt cho tất cả nhân viên active.</summary>
public class PayrollRunService
{
    private readonly HRDbContext _db;
    private readonly PayrollCalculationService _calculator;

    public PayrollRunService(HRDbContext db, PayrollCalculationService calculator)
    {
        _db = db;
        _calculator = calculator;
    }

    public async Task<PayrollRun> CreateRunAsync(int year, int month, CancellationToken ct = default)
    {
        var existing = await _db.PayrollRuns
            .FirstOrDefaultAsync(r => r.Year == year && r.Month == month, ct);
        if (existing != null)
            throw new InvalidOperationException($"Kỳ lương {month}/{year} đã tồn tại (Id={existing.Id}).");

        var run = new PayrollRun(year, month);
        _db.PayrollRuns.Add(run);
        await _db.SaveChangesAsync(ct);
        return run;
    }

    /// <summary>Chạy tính lương cho TẤT CẢ nhân viên active có MonthlyTimesheet đã Locked.</summary>
    public async Task<PayrollRunCalculationSummary> CalculateAllAsync(
        Guid runId,
        CancellationToken ct = default)
    {
        var run = await _db.PayrollRuns
            .Include(r => r.Payrolls)
            .FirstOrDefaultAsync(r => r.Id == runId, ct)
            ?? throw new InvalidOperationException($"Không tìm thấy kỳ lương {runId}.");
        if (run.Status != PayrollRunStatus.Draft)
            throw new InvalidOperationException($"Chỉ tính được kỳ lương Draft, hiện tại {run.Status}.");

        var employees = await _db.Employees
            .Where(e => e.Status == EmployeeStatus.Active)
            .ToListAsync(ct);

        var summary = new PayrollRunCalculationSummary { Year = run.Year, Month = run.Month };
        foreach (var emp in employees)
        {
            try
            {
                var payroll = await _calculator.CalculateAsync(emp.Id, run.Year, run.Month, run.Id, ct);
                if (!run.Payrolls.Any(p => p.EmployeeId == emp.Id))
                    run.AddPayroll(payroll);
                summary.Successful++;
                summary.TotalNet += payroll.NetPay;
            }
            catch (InvalidOperationException ex)
            {
                summary.Skipped++;
                summary.Errors.Add($"{emp.EmployeeCode ?? emp.Id.ToString()}: {ex.Message}");
            }
        }

        run.MarkCalculated();
        await _db.SaveChangesAsync(ct);
        return summary;
    }
}

public class PayrollRunCalculationSummary
{
    public int Year { get; set; }
    public int Month { get; set; }
    public int Successful { get; set; }
    public int Skipped { get; set; }
    public decimal TotalNet { get; set; }
    public List<string> Errors { get; set; } = new();
}
