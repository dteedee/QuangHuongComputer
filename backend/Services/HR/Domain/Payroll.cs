using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public enum PayrollStatus
{
    Draft,
    Calculated,
    Approved,
    Processed,
    Paid
}

public class Payroll : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public Employee? Employee { get; private set; } // Navigation property
    public int Month { get; private set; }
    public int Year { get; private set; }
    public decimal BaseSalary { get; private set; }
    public decimal Deductions { get; private set; }
    public decimal Bonuses { get; private set; }
    public decimal NetPay { get; private set; }
    public PayrollStatus Status { get; private set; }

    // Detailed breakdown
    public decimal RegularHours { get; private set; }
    public decimal OvertimeHours { get; private set; }
    public decimal OvertimePay { get; private set; }
    public decimal TaxDeduction { get; private set; }
    public decimal InsuranceDeduction { get; private set; }
    public decimal OtherDeductions { get; private set; }
    public decimal PerformanceBonus { get; private set; }
    public decimal AttendanceBonus { get; private set; }

    public DateTime? CalculatedAt { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? ProcessedAt { get; private set; }
    public DateTime? PaidAt { get; private set; }
    public Guid? ApprovedBy { get; private set; }
    public Guid? ProcessedBy { get; private set; }
    public string? Notes { get; private set; }

    public Payroll(
        Guid employeeId,
        int month,
        int year,
        decimal baseSalary)
    {
        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        Month = month;
        Year = year;
        BaseSalary = baseSalary;
        Status = PayrollStatus.Draft;
        Deductions = 0;
        Bonuses = 0;
        NetPay = baseSalary;

        Validate();
        RaiseDomainEvent(new PayrollCreatedEvent(Id, EmployeeId, Month, Year, BaseSalary));
    }

    // EF Core constructor
    protected Payroll()
    {
    }

    public void SetWorkHours(decimal regularHours, decimal overtimeHours, decimal hourlyRate)
    {
        if (Status != PayrollStatus.Draft)
            throw new InvalidOperationException($"Cannot modify payroll in {Status} status.");

        if (regularHours < 0 || overtimeHours < 0)
            throw new ArgumentException("Work hours cannot be negative.");

        if (hourlyRate <= 0)
            throw new ArgumentException("Hourly rate must be greater than zero.", nameof(hourlyRate));

        RegularHours = regularHours;
        OvertimeHours = overtimeHours;

        // Overtime typically paid at 1.5x rate
        OvertimePay = Math.Round(overtimeHours * hourlyRate * 1.5m, 2);
    }

    public void AddBonus(decimal amount, string type = "Performance")
    {
        if (Status != PayrollStatus.Draft && Status != PayrollStatus.Calculated)
            throw new InvalidOperationException($"Cannot add bonus in {Status} status.");

        if (amount < 0)
            throw new ArgumentException("Bonus amount cannot be negative.", nameof(amount));

        if (type == "Performance")
            PerformanceBonus += amount;
        else if (type == "Attendance")
            AttendanceBonus += amount;
        else
            Bonuses += amount;
    }

    public void AddDeduction(decimal amount, string type = "Other")
    {
        if (Status != PayrollStatus.Draft && Status != PayrollStatus.Calculated)
            throw new InvalidOperationException($"Cannot add deduction in {Status} status.");

        if (amount < 0)
            throw new ArgumentException("Deduction amount cannot be negative.", nameof(amount));

        if (type == "Tax")
            TaxDeduction += amount;
        else if (type == "Insurance")
            InsuranceDeduction += amount;
        else
            OtherDeductions += amount;
    }

    public void Calculate()
    {
        if (Status != PayrollStatus.Draft)
            throw new InvalidOperationException($"Cannot calculate payroll in {Status} status.");

        // Sum up all bonuses
        Bonuses = PerformanceBonus + AttendanceBonus + OvertimePay;

        // Sum up all deductions
        Deductions = TaxDeduction + InsuranceDeduction + OtherDeductions;

        // Calculate net pay
        NetPay = BaseSalary + Bonuses - Deductions;

        // Ensure net pay is not negative
        if (NetPay < 0)
            NetPay = 0;

        // Round to 2 decimal places
        NetPay = Math.Round(NetPay, 2);
        Bonuses = Math.Round(Bonuses, 2);
        Deductions = Math.Round(Deductions, 2);

        Status = PayrollStatus.Calculated;
        CalculatedAt = DateTime.UtcNow;

        RaiseDomainEvent(new PayrollCalculatedEvent(Id, EmployeeId, Month, Year, BaseSalary, Bonuses, Deductions, NetPay));
    }

    public void Approve(Guid approvedBy)
    {
        if (Status != PayrollStatus.Calculated)
            throw new InvalidOperationException($"Cannot approve payroll in {Status} status. Must be calculated first.");

        Status = PayrollStatus.Approved;
        ApprovedBy = approvedBy;
        ApprovedAt = DateTime.UtcNow;

        RaiseDomainEvent(new PayrollApprovedEvent(Id, EmployeeId, Month, Year, approvedBy, NetPay));
    }

    public void Process(Guid processedBy)
    {
        if (Status != PayrollStatus.Approved)
            throw new InvalidOperationException($"Cannot process payroll in {Status} status. Must be approved first.");

        Status = PayrollStatus.Processed;
        ProcessedBy = processedBy;
        ProcessedAt = DateTime.UtcNow;

        RaiseDomainEvent(new PayrollProcessedEvent(Id, EmployeeId, Month, Year, processedBy, NetPay));
    }

    public void MarkAsPaid()
    {
        if (Status != PayrollStatus.Processed)
            throw new InvalidOperationException($"Cannot mark payroll as paid in {Status} status. Must be processed first.");

        Status = PayrollStatus.Paid;
        PaidAt = DateTime.UtcNow;

        RaiseDomainEvent(new PayrollPaidEvent(Id, EmployeeId, Month, Year, NetPay, PaidAt.Value));
    }

    public void RevertToDraft()
    {
        if (Status == PayrollStatus.Paid)
            throw new InvalidOperationException("Cannot revert paid payroll to draft.");

        Status = PayrollStatus.Draft;
        ApprovedBy = null;
        ApprovedAt = null;
        ProcessedBy = null;
        ProcessedAt = null;
        CalculatedAt = null;
    }

    public void UpdateNotes(string? notes)
    {
        Notes = notes;
    }

    public void Validate()
    {
        var errors = new List<string>();

        if (EmployeeId == Guid.Empty)
            errors.Add("Employee ID is required.");

        if (Month < 1 || Month > 12)
            errors.Add("Month must be between 1 and 12.");

        if (Year < 2000 || Year > DateTime.UtcNow.Year + 1)
            errors.Add($"Year must be between 2000 and {DateTime.UtcNow.Year + 1}.");

        if (BaseSalary < 0)
            errors.Add("Base salary cannot be negative.");

        if (Deductions < 0)
            errors.Add("Total deductions cannot be negative.");

        if (Bonuses < 0)
            errors.Add("Total bonuses cannot be negative.");

        if (errors.Any())
            throw new ArgumentException($"Payroll validation failed: {string.Join(", ", errors)}");
    }

    public string GetPeriodDescription() => $"{Year}-{Month:D2}";
}

// Domain Events
public record PayrollCreatedEvent(
    Guid PayrollId,
    Guid EmployeeId,
    int Month,
    int Year,
    decimal BaseSalary) : DomainEvent;

public record PayrollCalculatedEvent(
    Guid PayrollId,
    Guid EmployeeId,
    int Month,
    int Year,
    decimal BaseSalary,
    decimal Bonuses,
    decimal Deductions,
    decimal NetPay) : DomainEvent;

public record PayrollApprovedEvent(
    Guid PayrollId,
    Guid EmployeeId,
    int Month,
    int Year,
    Guid ApprovedBy,
    decimal NetPay) : DomainEvent;

public record PayrollProcessedEvent(
    Guid PayrollId,
    Guid EmployeeId,
    int Month,
    int Year,
    Guid ProcessedBy,
    decimal NetPay) : DomainEvent;

public record PayrollPaidEvent(
    Guid PayrollId,
    Guid EmployeeId,
    int Month,
    int Year,
    decimal NetPay,
    DateTime PaidAt) : DomainEvent;
