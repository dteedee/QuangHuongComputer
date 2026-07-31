using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public enum DependentRelation
{
    Child = 1,       // Con
    Spouse = 2,      // Vợ/chồng
    Parent = 3,      // Cha/mẹ
    Other = 4        // Người phụ thuộc khác (ông bà, anh chị em...)
}

/// <summary>
/// Người phụ thuộc — dùng để giảm trừ gia cảnh 4.4tr/tháng theo TT 111/2013.
/// Chỉ được tính giảm trừ trong khoảng [DeductionStartDate, DeductionEndDate ?? now].
/// </summary>
public class Dependent : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public string FullName { get; private set; } = string.Empty;
    public DependentRelation Relation { get; private set; }
    public DateTime BirthDate { get; private set; }
    public string? TaxCode { get; private set; }                 // Mã số thuế người phụ thuộc (10 chữ số)
    public DateTime DeductionStartDate { get; private set; }
    public DateTime? DeductionEndDate { get; private set; }

    public Dependent(
        Guid employeeId,
        string fullName,
        DependentRelation relation,
        DateTime birthDate,
        DateTime deductionStartDate,
        DateTime? deductionEndDate = null,
        string? taxCode = null)
    {
        if (employeeId == Guid.Empty) throw new ArgumentException("EmployeeId là bắt buộc.");
        if (string.IsNullOrWhiteSpace(fullName)) throw new ArgumentException("Họ tên là bắt buộc.");
        if (deductionEndDate.HasValue && deductionEndDate.Value < deductionStartDate)
            throw new ArgumentException("DeductionEndDate phải sau DeductionStartDate.");
        if (!string.IsNullOrWhiteSpace(taxCode) && !(taxCode.All(char.IsDigit) && taxCode.Length == 10))
            throw new ArgumentException("TaxCode người phụ thuộc phải đủ 10 chữ số.");

        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        FullName = fullName;
        Relation = relation;
        BirthDate = birthDate;
        DeductionStartDate = deductionStartDate;
        DeductionEndDate = deductionEndDate;
        TaxCode = taxCode;
    }

    protected Dependent() { }

    /// <summary>Đang áp dụng giảm trừ tại thời điểm asOf.</summary>
    public bool IsActiveOn(DateTime asOf) =>
        asOf >= DeductionStartDate && (DeductionEndDate == null || DeductionEndDate.Value >= asOf);

    public bool IsActiveNow() => IsActiveOn(DateTime.UtcNow);

    public void EndDeduction(DateTime endDate)
    {
        if (endDate < DeductionStartDate)
            throw new ArgumentException("EndDate không thể trước StartDate.");
        DeductionEndDate = endDate;
    }

    public void UpdateInfo(string fullName, DependentRelation relation, DateTime birthDate, string? taxCode)
    {
        if (string.IsNullOrWhiteSpace(fullName)) throw new ArgumentException("Họ tên là bắt buộc.");
        if (!string.IsNullOrWhiteSpace(taxCode) && !(taxCode.All(char.IsDigit) && taxCode.Length == 10))
            throw new ArgumentException("TaxCode người phụ thuộc phải đủ 10 chữ số.");
        FullName = fullName;
        Relation = relation;
        BirthDate = birthDate;
        TaxCode = taxCode;
    }
}
