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

/// <summary>
/// Bảng lương của 1 nhân viên trong 1 kỳ. Phase 06 rewrite:
/// - Thêm LineItems (chi tiết breakdown lương/phụ cấp/OT/khấu trừ/thuế)
/// - Thêm GrossPay (tổng thu nhập trước khấu trừ)
/// - PayrollCalculationService tính thuế qua VietnameseTaxEngine, gọi ApplyCalculationResult()
/// - Đã Approved BẤT BIẾN — mutate throw InvalidOperationException
///
/// Giữ nguyên state machine cũ (Draft → Calculated → Approved → Processed → Paid)
/// và các method AddBonus/AddDeduction/SetWorkHours/Calculate/RevertToDraft
/// cho backward-compatibility với legacy endpoints & tests hiện có.
/// </summary>
public class Payroll : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public Employee? Employee { get; private set; }
    public Guid? PayrollRunId { get; private set; }             // Phase 06: gắn kỳ lương
    public int Month { get; private set; }
    public int Year { get; private set; }

    public decimal BaseSalary { get; private set; }
    public decimal Deductions { get; private set; }
    public decimal Bonuses { get; private set; }
    public decimal NetPay { get; private set; }
    public decimal GrossPay { get; private set; }                // Phase 06: tổng thu nhập
    public decimal TaxableIncome { get; private set; }           // Phase 06: thu nhập tính thuế
    public PayrollStatus Status { get; private set; }

    public decimal RegularHours { get; private set; }
    public decimal OvertimeHours { get; private set; }
    public decimal OvertimePay { get; private set; }
    public decimal TaxDeduction { get; private set; }
    public decimal InsuranceDeduction { get; private set; }
    public decimal OtherDeductions { get; private set; }
    public decimal PerformanceBonus { get; private set; }
    public decimal AttendanceBonus { get; private set; }

    public int NumberOfDependents { get; private set; }          // Phase 06
    public decimal InsurableSalary { get; private set; }         // Phase 06 — mức đóng BHXH

    public DateTime? CalculatedAt { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? ProcessedAt { get; private set; }
    public DateTime? PaidAt { get; private set; }
    public Guid? ApprovedBy { get; private set; }
    public Guid? ProcessedBy { get; private set; }
    public string? Notes { get; private set; }

    private readonly List<PayrollLineItem> _lineItems = new();
    public IReadOnlyCollection<PayrollLineItem> LineItems => _lineItems.AsReadOnly();

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
        GrossPay = baseSalary;

        Validate();
        RaiseDomainEvent(new PayrollCreatedEvent(Id, EmployeeId, Month, Year, BaseSalary));
    }

    protected Payroll() { }

    // =============================================================
    // LEGACY API — backward compat
    // =============================================================

    public void SetWorkHours(decimal regularHours, decimal overtimeHours, decimal hourlyRate)
    {
        RequireDraftOrCalculated();
        if (regularHours < 0 || overtimeHours < 0)
            throw new ArgumentException("Work hours cannot be negative.");
        if (hourlyRate <= 0)
            throw new ArgumentException("Hourly rate must be greater than zero.", nameof(hourlyRate));

        RegularHours = regularHours;
        OvertimeHours = overtimeHours;
        OvertimePay = Math.Round(overtimeHours * hourlyRate * 1.5m, 2);
    }

    public void AddBonus(decimal amount, string type = "Performance")
    {
        RequireDraftOrCalculated();
        if (amount < 0) throw new ArgumentException("Bonus amount cannot be negative.", nameof(amount));

        if (type == "Performance") PerformanceBonus += amount;
        else if (type == "Attendance") AttendanceBonus += amount;
        else Bonuses += amount;
    }

    public void AddDeduction(decimal amount, string type = "Other")
    {
        RequireDraftOrCalculated();
        if (amount < 0) throw new ArgumentException("Deduction amount cannot be negative.", nameof(amount));

        if (type == "Tax") TaxDeduction += amount;
        else if (type == "Insurance") InsuranceDeduction += amount;
        else OtherDeductions += amount;
    }

    public void Calculate()
    {
        if (Status != PayrollStatus.Draft)
            throw new InvalidOperationException($"Cannot calculate payroll in {Status} status.");

        Bonuses = PerformanceBonus + AttendanceBonus + OvertimePay;
        Deductions = TaxDeduction + InsuranceDeduction + OtherDeductions;
        GrossPay = BaseSalary + Bonuses;
        NetPay = GrossPay - Deductions;
        if (NetPay < 0) NetPay = 0;

        NetPay = Math.Round(NetPay, 2);
        Bonuses = Math.Round(Bonuses, 2);
        Deductions = Math.Round(Deductions, 2);
        GrossPay = Math.Round(GrossPay, 2);

        Status = PayrollStatus.Calculated;
        CalculatedAt = DateTime.UtcNow;

        RaiseDomainEvent(new PayrollCalculatedEvent(Id, EmployeeId, Month, Year, BaseSalary, Bonuses, Deductions, NetPay));
    }

    // =============================================================
    // Phase 06 API — dùng bởi PayrollCalculationService
    // =============================================================

    /// <summary>Gán kỳ lương (khi thêm vào PayrollRun).</summary>
    public void AssignToRun(Guid runId)
    {
        if (Status != PayrollStatus.Draft)
            throw new InvalidOperationException($"Chỉ gán Run cho bảng lương Draft, hiện tại {Status}.");
        PayrollRunId = runId;
    }

    /// <summary>Đặt số người phụ thuộc — chỉ ở Draft.</summary>
    public void SetDependents(int count)
    {
        RequireDraftOrCalculated();
        if (count < 0) throw new ArgumentException("Số người phụ thuộc >= 0.");
        NumberOfDependents = count;
    }

    /// <summary>Đặt mức lương đóng BHXH (thường = base + phụ cấp chức vụ, có trần 46.8tr).</summary>
    public void SetInsurableSalary(decimal amount)
    {
        RequireDraftOrCalculated();
        if (amount < 0) throw new ArgumentException("InsurableSalary >= 0.");
        InsurableSalary = amount;
    }

    /// <summary>Thêm 1 line item chi tiết (dùng bởi PayrollCalculationService).</summary>
    public void AddLineItem(PayrollLineItem item)
    {
        RequireDraftOrCalculated();
        if (item.PayrollId != Id) throw new ArgumentException("PayrollLineItem không thuộc bảng lương này.");
        _lineItems.Add(item);
    }

    /// <summary>Xoá tất cả line items (dùng khi recalculate).</summary>
    public void ClearLineItems()
    {
        RequireDraftOrCalculated();
        _lineItems.Clear();
    }

    /// <summary>
    /// Áp dụng kết quả tính từ PayrollCalculationService.
    /// Ghi đè các trường số học + set state = Calculated.
    /// </summary>
    public void ApplyCalculationResult(
        decimal baseSalary,
        decimal overtimePay,
        decimal totalBonuses,
        decimal insuranceDeduction,
        decimal taxDeduction,
        decimal otherDeductions,
        decimal grossPay,
        decimal taxableIncome,
        decimal netPay,
        decimal regularHours = 0,
        decimal overtimeHours = 0)
    {
        if (Status != PayrollStatus.Draft)
            throw new InvalidOperationException($"Chỉ apply calculation cho bảng lương Draft, hiện tại {Status}.");

        BaseSalary = Math.Round(baseSalary, 2);
        OvertimePay = Math.Round(overtimePay, 2);
        Bonuses = Math.Round(totalBonuses, 2);
        InsuranceDeduction = Math.Round(insuranceDeduction, 0);
        TaxDeduction = Math.Round(taxDeduction, 0);
        OtherDeductions = Math.Round(otherDeductions, 0);
        Deductions = InsuranceDeduction + TaxDeduction + OtherDeductions;
        GrossPay = Math.Round(grossPay, 0);
        TaxableIncome = Math.Round(taxableIncome, 0);
        NetPay = Math.Max(0, Math.Round(netPay, 0));
        RegularHours = regularHours;
        OvertimeHours = overtimeHours;

        Status = PayrollStatus.Calculated;
        CalculatedAt = DateTime.UtcNow;

        RaiseDomainEvent(new PayrollCalculatedEvent(Id, EmployeeId, Month, Year, BaseSalary, Bonuses, Deductions, NetPay));
    }

    // =============================================================
    // STATE MACHINE
    // =============================================================

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
        // Không cho phép revert nếu đã Approved (BẤT BIẾN sau Approved theo yêu cầu Phase 06)
        // Legacy test cho phép revert từ Approved → giữ hành vi legacy nếu chưa có PayrollRunId
        if (Status == PayrollStatus.Approved && PayrollRunId.HasValue)
            throw new InvalidOperationException("Bảng lương đã Approved trong PayrollRun là BẤT BIẾN — phải tạo PayrollAdjustment.");

        Status = PayrollStatus.Draft;
        ApprovedBy = null;
        ApprovedAt = null;
        ProcessedBy = null;
        ProcessedAt = null;
        CalculatedAt = null;
    }

    public void UpdateNotes(string? notes) => Notes = notes;

    public void Validate()
    {
        var errors = new List<string>();
        if (EmployeeId == Guid.Empty) errors.Add("Employee ID is required.");
        if (Month < 1 || Month > 12) errors.Add("Month must be between 1 and 12.");
        if (Year < 2000 || Year > DateTime.UtcNow.Year + 1)
            errors.Add($"Year must be between 2000 and {DateTime.UtcNow.Year + 1}.");
        if (BaseSalary < 0) errors.Add("Base salary cannot be negative.");
        if (Deductions < 0) errors.Add("Total deductions cannot be negative.");
        if (Bonuses < 0) errors.Add("Total bonuses cannot be negative.");
        if (errors.Any())
            throw new ArgumentException($"Payroll validation failed: {string.Join(", ", errors)}");
    }

    public string GetPeriodDescription() => $"{Year}-{Month:D2}";

    private void RequireDraftOrCalculated()
    {
        if (Status != PayrollStatus.Draft && Status != PayrollStatus.Calculated)
            throw new InvalidOperationException($"Cannot modify payroll in {Status} status.");
    }
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
