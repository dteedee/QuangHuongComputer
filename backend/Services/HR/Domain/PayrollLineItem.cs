using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public enum PayrollLineType
{
    BaseSalary = 1,         // Lương cơ bản theo công thực tế
    Allowance = 2,          // Phụ cấp (chia thành taxable/exempt qua IsTaxable)
    Overtime = 3,           // Tiền làm thêm giờ
    Bonus = 4,              // Thưởng
    InsuranceEmployee = 5,  // BHXH+BHYT+BHTN phần NLĐ đóng
    PersonalDeduction = 6,  // Giảm trừ bản thân 11tr
    DependentDeduction = 7, // Giảm trừ người phụ thuộc 4.4tr × n
    Pit = 8,                // Thuế TNCN
    LateFine = 9,           // Phạt đi muộn
    Advance = 10,           // Tạm ứng đã nhận
    OtherDeduction = 11     // Khấu trừ khác (bồi thường tài sản...)
}

/// <summary>
/// Chi tiết từng khoản trong bảng lương — cho phép hiển thị breakdown chi tiết trên phiếu lương.
/// IsTaxable / IsInsurable dùng để tổng hợp trong PayrollCalculationService.
/// </summary>
public class PayrollLineItem : Entity<Guid>
{
    public Guid PayrollId { get; private set; }
    public PayrollLineType Type { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public bool IsTaxable { get; private set; }
    public bool IsInsurable { get; private set; }
    public int DisplayOrder { get; private set; }
    public string? Metadata { get; private set; }    // JSON tuỳ chọn (mã phụ cấp, chi tiết...)

    public PayrollLineItem(
        Guid payrollId,
        PayrollLineType type,
        string description,
        decimal amount,
        bool isTaxable = false,
        bool isInsurable = false,
        int displayOrder = 0,
        string? metadata = null)
    {
        if (payrollId == Guid.Empty) throw new ArgumentException("PayrollId là bắt buộc.");
        if (string.IsNullOrWhiteSpace(description)) throw new ArgumentException("Mô tả là bắt buộc.");

        Id = Guid.NewGuid();
        PayrollId = payrollId;
        Type = type;
        Description = description;
        Amount = amount;
        IsTaxable = isTaxable;
        IsInsurable = isInsurable;
        DisplayOrder = displayOrder;
        Metadata = metadata;
    }

    protected PayrollLineItem() { }

    /// <summary>Line thu nhập (BaseSalary/Allowance/Overtime/Bonus) — Amount dương.</summary>
    public bool IsIncome => Type is PayrollLineType.BaseSalary
        or PayrollLineType.Allowance
        or PayrollLineType.Overtime
        or PayrollLineType.Bonus;

    /// <summary>Line khấu trừ — hiển thị âm hoặc trong cột Deduction.</summary>
    public bool IsDeduction => !IsIncome && Type != PayrollLineType.PersonalDeduction && Type != PayrollLineType.DependentDeduction;
}
