using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HR.Application.Payroll;

/// <summary>
/// Phiếu lương (JSON payload — frontend render PDF).
/// Không dùng QuestPDF/iText để không thêm dependency (YAGNI).
/// </summary>
public class PayslipDto
{
    public Guid PayrollId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? EmployeeCode { get; set; }
    public string? Department { get; set; }
    public string? Position { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public string Period => $"{Month:D2}/{Year}";
    public int NumberOfDependents { get; set; }
    public decimal InsurableSalary { get; set; }

    // Summary
    public decimal GrossPay { get; set; }
    public decimal TotalIncomeLines { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal NetPay { get; set; }
    public decimal TaxableIncome { get; set; }

    // Breakdown
    public List<PayslipLineDto> Incomes { get; set; } = new();
    public List<PayslipLineDto> Deductions { get; set; } = new();
    public List<PayslipLineDto> TaxCalculation { get; set; } = new();

    public DateTime? CalculatedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string CompanyName { get; set; } = "Quang Hưởng Computer";
}

public class PayslipLineDto
{
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public bool IsTaxable { get; set; }
}

public class PayslipGenerator
{
    private readonly HRDbContext _db;

    public PayslipGenerator(HRDbContext db) => _db = db;

    public async Task<PayslipDto> GenerateAsync(Guid payrollId, CancellationToken ct = default)
    {
        var payroll = await _db.Payrolls
            .Include(p => p.Employee)
            .Include(p => p.LineItems)
            .FirstOrDefaultAsync(p => p.Id == payrollId, ct)
            ?? throw new InvalidOperationException($"Không tìm thấy bảng lương {payrollId}.");

        var dto = new PayslipDto
        {
            PayrollId = payroll.Id,
            EmployeeName = payroll.Employee?.FullName ?? "Unknown",
            EmployeeCode = payroll.Employee?.EmployeeCode,
            Department = payroll.Employee?.Department,
            Position = payroll.Employee?.Position,
            Month = payroll.Month,
            Year = payroll.Year,
            NumberOfDependents = payroll.NumberOfDependents,
            InsurableSalary = payroll.InsurableSalary,
            GrossPay = payroll.GrossPay,
            TotalDeductions = payroll.Deductions,
            NetPay = payroll.NetPay,
            TaxableIncome = payroll.TaxableIncome,
            CalculatedAt = payroll.CalculatedAt,
            ApprovedAt = payroll.ApprovedAt
        };

        foreach (var line in payroll.LineItems.OrderBy(l => l.DisplayOrder))
        {
            var dtoLine = new PayslipLineDto
            {
                Type = line.Type.ToString(),
                Description = line.Description,
                Amount = line.Amount,
                IsTaxable = line.IsTaxable
            };

            if (line.IsIncome) dto.Incomes.Add(dtoLine);
            else if (line.Type == PayrollLineType.PersonalDeduction || line.Type == PayrollLineType.DependentDeduction)
                dto.TaxCalculation.Add(dtoLine);
            else dto.Deductions.Add(dtoLine);
        }

        dto.TotalIncomeLines = dto.Incomes.Sum(i => i.Amount);
        return dto;
    }
}
