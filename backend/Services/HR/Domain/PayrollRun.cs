using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public enum PayrollRunStatus
{
    Draft = 0,          // Vừa tạo, chưa tính
    Calculated = 1,     // Đã chạy PayrollCalculationService cho toàn bộ nhân viên
    Approved = 2,       // Kế toán trưởng/Giám đốc duyệt
    Paid = 3,           // Đã chi trả (đã xuất file chuyển khoản)
    Cancelled = 4       // Huỷ bỏ (chỉ ở Draft/Calculated)
}

/// <summary>
/// Kỳ lương tháng — chứa danh sách Payroll của tất cả nhân viên.
/// Sau khi Approved: BẤT BIẾN. Muốn sửa phải tạo PayrollAdjustment (Phase sau).
/// </summary>
public class PayrollRun : Entity<Guid>
{
    public int Year { get; private set; }
    public int Month { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public PayrollRunStatus Status { get; private set; }
    public DateTime? CalculatedAt { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? PaidAt { get; private set; }
    public Guid? ApprovedBy { get; private set; }
    public Guid? PaidBy { get; private set; }
    public string? Notes { get; private set; }

    // Aggregates (denormalized cho báo cáo nhanh)
    public int EmployeeCount { get; private set; }
    public decimal TotalGrossPay { get; private set; }
    public decimal TotalNetPay { get; private set; }
    public decimal TotalTax { get; private set; }
    public decimal TotalInsurance { get; private set; }

    private readonly List<Payroll> _payrolls = new();
    public IReadOnlyCollection<Payroll> Payrolls => _payrolls.AsReadOnly();

    public PayrollRun(int year, int month, string? name = null)
    {
        if (year < 2000 || year > 2100) throw new ArgumentException("Year không hợp lệ.");
        if (month < 1 || month > 12) throw new ArgumentException("Month 1..12.");

        Id = Guid.NewGuid();
        Year = year;
        Month = month;
        Name = name ?? $"Kỳ lương {month:D2}/{year}";
        Status = PayrollRunStatus.Draft;
    }

    protected PayrollRun() { }

    public void AddPayroll(Payroll payroll)
    {
        if (Status != PayrollRunStatus.Draft && Status != PayrollRunStatus.Calculated)
            throw new InvalidOperationException($"Không thể thêm Payroll khi Run ở {Status}.");
        if (payroll.Year != Year || payroll.Month != Month)
            throw new ArgumentException("Payroll không thuộc kỳ này.");
        if (_payrolls.Any(p => p.EmployeeId == payroll.EmployeeId))
            throw new InvalidOperationException($"Nhân viên {payroll.EmployeeId} đã có bảng lương trong kỳ.");
        _payrolls.Add(payroll);
    }

    /// <summary>Chuyển Draft → Calculated. Cập nhật tổng hợp.</summary>
    public void MarkCalculated()
    {
        if (Status != PayrollRunStatus.Draft)
            throw new InvalidOperationException($"Chỉ được MarkCalculated từ Draft, hiện tại {Status}.");
        RecalculateTotals();
        Status = PayrollRunStatus.Calculated;
        CalculatedAt = DateTime.UtcNow;
    }

    public void RecalculateTotals()
    {
        EmployeeCount = _payrolls.Count;
        TotalGrossPay = _payrolls.Sum(p => p.GrossPay);
        TotalNetPay = _payrolls.Sum(p => p.NetPay);
        TotalTax = _payrolls.Sum(p => p.TaxDeduction);
        TotalInsurance = _payrolls.Sum(p => p.InsuranceDeduction);
    }

    public void Approve(Guid approvedBy)
    {
        if (Status != PayrollRunStatus.Calculated)
            throw new InvalidOperationException($"Chỉ duyệt được từ Calculated, hiện tại {Status}.");
        // Approve tất cả payroll con
        foreach (var p in _payrolls)
        {
            if (p.Status == PayrollStatus.Calculated)
                p.Approve(approvedBy);
        }
        Status = PayrollRunStatus.Approved;
        ApprovedAt = DateTime.UtcNow;
        ApprovedBy = approvedBy;
    }

    public void MarkAsPaid(Guid paidBy)
    {
        if (Status != PayrollRunStatus.Approved)
            throw new InvalidOperationException($"Chỉ MarkAsPaid được từ Approved, hiện tại {Status}.");
        // Process + Pay từng payroll
        foreach (var p in _payrolls)
        {
            if (p.Status == PayrollStatus.Approved)
            {
                p.Process(paidBy);
                p.MarkAsPaid();
            }
        }
        Status = PayrollRunStatus.Paid;
        PaidAt = DateTime.UtcNow;
        PaidBy = paidBy;
    }

    public void Cancel(string reason)
    {
        if (Status == PayrollRunStatus.Paid || Status == PayrollRunStatus.Approved)
            throw new InvalidOperationException($"Không huỷ được kỳ lương đã {Status}.");
        Status = PayrollRunStatus.Cancelled;
        Notes = reason;
    }

    public void UpdateNotes(string? notes) => Notes = notes;
}
