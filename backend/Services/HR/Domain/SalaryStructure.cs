using BuildingBlocks.SharedKernel;

namespace HR.Domain;

/// <summary>
/// Cơ cấu lương của nhân viên tại một khoảng thời gian.
/// Mỗi lần tăng lương / đổi mức đóng BHXH = tạo record mới với EffectiveDate mới,
/// giữ lịch sử để truy vấn "lương tháng X năm Y là bao nhiêu".
/// </summary>
public class SalaryStructure : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public decimal BaseSalary { get; private set; }        // Lương cơ bản (theo HĐ)
    public decimal InsurableSalary { get; private set; }    // Lương đóng BHXH (có thể ≠ base)
    public decimal? Coefficient { get; private set; }       // Hệ số (nếu công ty dùng)
    public DateTime EffectiveDate { get; private set; }
    public DateTime? EndDate { get; private set; }
    public string? Note { get; private set; }

    public SalaryStructure(
        Guid employeeId,
        decimal baseSalary,
        decimal insurableSalary,
        DateTime effectiveDate,
        decimal? coefficient = null,
        DateTime? endDate = null,
        string? note = null)
    {
        if (employeeId == Guid.Empty) throw new ArgumentException("EmployeeId là bắt buộc.");
        if (baseSalary <= 0) throw new ArgumentException("BaseSalary phải > 0.");
        if (insurableSalary <= 0) throw new ArgumentException("InsurableSalary phải > 0.");
        if (endDate.HasValue && endDate.Value < effectiveDate)
            throw new ArgumentException("EndDate không thể trước EffectiveDate.");

        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        BaseSalary = baseSalary;
        InsurableSalary = insurableSalary;
        Coefficient = coefficient;
        EffectiveDate = effectiveDate;
        EndDate = endDate;
        Note = note;
    }

    protected SalaryStructure() { }

    public bool IsEffectiveOn(DateTime date) =>
        date >= EffectiveDate && (EndDate == null || EndDate.Value >= date);

    public void CloseAt(DateTime endDate)
    {
        if (endDate < EffectiveDate)
            throw new ArgumentException("EndDate không thể trước EffectiveDate.");
        EndDate = endDate;
    }
}

public static class SalaryStructureExtensions
{
    /// <summary>Trong 1 tập record lịch sử, lấy mức lương có hiệu lực tại 1 ngày.</summary>
    public static SalaryStructure? GetEffectiveOn(this IEnumerable<SalaryStructure> structures, DateTime date)
        => structures
            .Where(s => s.IsEffectiveOn(date))
            .OrderByDescending(s => s.EffectiveDate)
            .FirstOrDefault();
}
