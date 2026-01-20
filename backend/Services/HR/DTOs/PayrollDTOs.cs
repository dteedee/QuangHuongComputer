using HR.Domain;

namespace HR.DTOs;

// Request DTOs
public record CreatePayrollDto(
    Guid EmployeeId,
    int Month,
    int Year,
    decimal BaseSalary);

public record SetWorkHoursDto(
    decimal RegularHours,
    decimal OvertimeHours,
    decimal HourlyRate);

public record AddBonusDto(
    decimal Amount,
    string Type = "Performance");

public record AddDeductionDto(
    decimal Amount,
    string Type = "Other");

public record ApprovePayrollDto(
    Guid ApprovedBy);

public record ProcessPayrollDto(
    Guid ProcessedBy);

public record GeneratePayrollBatchDto(
    int Month,
    int Year);

// Response DTOs
public record PayrollDto(
    Guid Id,
    Guid EmployeeId,
    int Month,
    int Year,
    string Period,
    decimal BaseSalary,
    decimal Deductions,
    decimal Bonuses,
    decimal NetPay,
    PayrollStatus Status,
    decimal RegularHours,
    decimal OvertimeHours,
    decimal OvertimePay,
    decimal TaxDeduction,
    decimal InsuranceDeduction,
    decimal OtherDeductions,
    decimal PerformanceBonus,
    decimal AttendanceBonus,
    DateTime? CalculatedAt,
    DateTime? ApprovedAt,
    DateTime? ProcessedAt,
    DateTime? PaidAt,
    Guid? ApprovedBy,
    Guid? ProcessedBy,
    string? Notes,
    DateTime CreatedAt,
    DateTime? UpdatedAt)
{
    public static PayrollDto FromDomain(Payroll payroll)
    {
        return new PayrollDto(
            payroll.Id,
            payroll.EmployeeId,
            payroll.Month,
            payroll.Year,
            payroll.GetPeriodDescription(),
            payroll.BaseSalary,
            payroll.Deductions,
            payroll.Bonuses,
            payroll.NetPay,
            payroll.Status,
            payroll.RegularHours,
            payroll.OvertimeHours,
            payroll.OvertimePay,
            payroll.TaxDeduction,
            payroll.InsuranceDeduction,
            payroll.OtherDeductions,
            payroll.PerformanceBonus,
            payroll.AttendanceBonus,
            payroll.CalculatedAt,
            payroll.ApprovedAt,
            payroll.ProcessedAt,
            payroll.PaidAt,
            payroll.ApprovedBy,
            payroll.ProcessedBy,
            payroll.Notes,
            payroll.CreatedAt,
            payroll.UpdatedAt);
    }
}

public record PayrollSummaryDto(
    Guid Id,
    Guid EmployeeId,
    int Month,
    int Year,
    string Period,
    decimal NetPay,
    PayrollStatus Status,
    DateTime? PaidAt)
{
    public static PayrollSummaryDto FromDomain(Payroll payroll)
    {
        return new PayrollSummaryDto(
            payroll.Id,
            payroll.EmployeeId,
            payroll.Month,
            payroll.Year,
            payroll.GetPeriodDescription(),
            payroll.NetPay,
            payroll.Status,
            payroll.PaidAt);
    }
}

public record EmployeePayrollReportDto(
    Guid EmployeeId,
    string EmployeeName,
    string Department,
    string Position,
    List<PayrollSummaryDto> Payrolls,
    decimal TotalNetPay,
    decimal AverageMonthlySalary);

public record PayrollBatchSummaryDto(
    int Month,
    int Year,
    string Period,
    int TotalEmployees,
    decimal TotalNetPay,
    int ProcessedCount,
    int PaidCount,
    int PendingCount);
