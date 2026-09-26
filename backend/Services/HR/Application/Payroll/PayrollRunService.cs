using BuildingBlocks.Configuration;
using HR.Domain;
using HR.Infrastructure;
using BuildingBlocks.Endpoints;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HR.Application.Payroll;

/// <summary>Điều phối chạy kỳ lương hàng loạt cho tất cả nhân viên active.</summary>
public class PayrollRunService
{
    private const string PayDaySettingKey = "PAYROLL_PAY_DAY";

    private readonly HRDbContext _db;
    private readonly PayrollCalculationService _calculator;
    private readonly IAppSettings? _settings;

    private readonly ILogger<PayrollRunService>? _logger;

    public PayrollRunService(HRDbContext db, PayrollCalculationService calculator, IAppSettings? settings = null,
        ILogger<PayrollRunService>? logger = null)
    {
        _db = db;
        _calculator = calculator;
        _settings = settings;
        _logger = logger;
    }

    /// <summary>
    /// Tạo kỳ lương. W2-25/D06 §3: kỳ lương LUÔN có <c>PayDate</c> — thuế TNCN tra tham số theo
    /// NGÀY TRẢ, nên bỏ trống ngày này là bỏ trống một đầu vào pháp lý. Mặc định ngày
    /// <c>PAYROLL_PAY_DAY</c> (05) của tháng kế tiếp.
    /// </summary>
    public async Task<PayrollRun> CreateRunAsync(
        int year,
        int month,
        DateOnly? payDate = null,
        CancellationToken ct = default)
    {
        var existing = await _db.PayrollRuns
            .FirstOrDefaultAsync(r => r.Year == year && r.Month == month, ct);
        if (existing != null)
            throw new InvalidOperationException($"Kỳ lương {month}/{year} đã tồn tại (Id={existing.Id}).");

        var run = new PayrollRun(year, month);
        var payDay = _settings?.GetInt(PayDaySettingKey, 5) ?? 5;
        run.SetPayDate(payDate ?? PayrollCalculationService.DefaultPayDate(year, month, payDay));

        _db.PayrollRuns.Add(run);
        await _db.SaveChangesAsync(ct);
        return run;
    }

    /// <summary>Đổi ngày trả của một kỳ lương chưa duyệt (thay đổi bộ tham số thuế được áp dụng).</summary>
    public async Task<PayrollRun> SetPayDateAsync(Guid runId, DateOnly payDate, CancellationToken ct = default)
    {
        var run = await _db.PayrollRuns.FirstOrDefaultAsync(r => r.Id == runId, ct)
            ?? throw new InvalidOperationException($"Không tìm thấy kỳ lương {runId}.");

        run.SetPayDate(payDate);
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
                // Lỗi nghiệp vụ (message tiếng Việt của domain) giữ nguyên; lỗi EF/thư viện bị ẩn + log đủ (M6).
                summary.Errors.Add($"{emp.EmployeeCode ?? emp.Id.ToString()}: {ClientSafeError.MessageOrGeneric(ex, _logger)}");
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
