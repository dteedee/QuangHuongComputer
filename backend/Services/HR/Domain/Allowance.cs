using BuildingBlocks.SharedKernel;

namespace HR.Domain;

/// <summary>
/// Phụ cấp thực tế của nhân viên: gắn AllowanceType, có khoảng thời gian hiệu lực.
/// PayrollCalculationService sẽ đọc list này để tính phần chịu thuế / miễn thuế.
/// </summary>
public class Allowance : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public Guid AllowanceTypeId { get; private set; }
    public decimal Amount { get; private set; }              // Số tiền/tháng
    public DateTime EffectiveDate { get; private set; }
    public DateTime? EndDate { get; private set; }

    public Allowance(
        Guid employeeId,
        Guid allowanceTypeId,
        decimal amount,
        DateTime effectiveDate,
        DateTime? endDate = null)
    {
        if (employeeId == Guid.Empty) throw new ArgumentException("EmployeeId là bắt buộc.");
        if (allowanceTypeId == Guid.Empty) throw new ArgumentException("AllowanceTypeId là bắt buộc.");
        if (amount < 0) throw new ArgumentException("Amount không thể âm.");
        if (endDate.HasValue && endDate.Value < effectiveDate)
            throw new ArgumentException("EndDate không thể trước EffectiveDate.");

        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        AllowanceTypeId = allowanceTypeId;
        Amount = amount;
        EffectiveDate = effectiveDate;
        EndDate = endDate;
    }

    protected Allowance() { }

    public bool IsEffectiveOn(DateTime date) =>
        date >= EffectiveDate && (EndDate == null || EndDate.Value >= date);

    public void UpdateAmount(decimal amount)
    {
        if (amount < 0) throw new ArgumentException("Amount không thể âm.");
        Amount = amount;
    }

    public void CloseAt(DateTime endDate)
    {
        if (endDate < EffectiveDate)
            throw new ArgumentException("EndDate không thể trước EffectiveDate.");
        EndDate = endDate;
    }
}
