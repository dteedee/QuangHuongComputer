using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public enum ContractType
{
    Probation = 1,           // Thử việc
    FixedTerm1Year = 2,       // Xác định hạn 1 năm
    FixedTerm3Year = 3,       // Xác định hạn 3 năm
    Permanent = 4,            // Không xác định thời hạn
    Seasonal = 5              // Theo mùa vụ / dưới 12 tháng
}

public enum ContractStatus
{
    Draft = 0,
    Active = 1,
    Expired = 2,
    Terminated = 3,
    Renewed = 4
}

/// <summary>
/// Hợp đồng lao động — quản lý loại HĐ, thời hạn, mức lương HĐ và mức đóng BHXH.
/// Cảnh báo trước 30 ngày khi HĐ sắp hết hạn.
/// </summary>
public class EmploymentContract : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public string ContractNumber { get; private set; } = string.Empty;
    public ContractType Type { get; private set; }
    public DateTime StartDate { get; private set; }
    public DateTime? EndDate { get; private set; }
    public decimal ContractSalary { get; private set; }
    public decimal InsurableSalary { get; private set; }
    public string? DocumentUrl { get; private set; }
    public ContractStatus Status { get; private set; }
    public DateTime? TerminatedAt { get; private set; }
    public string? TerminationReason { get; private set; }

    public EmploymentContract(
        Guid employeeId,
        string contractNumber,
        ContractType type,
        DateTime startDate,
        DateTime? endDate,
        decimal contractSalary,
        decimal insurableSalary,
        string? documentUrl = null)
    {
        if (employeeId == Guid.Empty) throw new ArgumentException("EmployeeId là bắt buộc.");
        if (string.IsNullOrWhiteSpace(contractNumber)) throw new ArgumentException("Số hợp đồng là bắt buộc.");
        if (contractSalary <= 0) throw new ArgumentException("ContractSalary phải > 0.");
        if (insurableSalary <= 0) throw new ArgumentException("InsurableSalary phải > 0.");
        if (type == ContractType.Permanent && endDate.HasValue)
            throw new ArgumentException("Hợp đồng không xác định thời hạn không có EndDate.");
        if (type != ContractType.Permanent && !endDate.HasValue)
            throw new ArgumentException("Hợp đồng có thời hạn phải có EndDate.");
        if (endDate.HasValue && endDate.Value <= startDate)
            throw new ArgumentException("EndDate phải sau StartDate.");

        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        ContractNumber = contractNumber;
        Type = type;
        StartDate = startDate;
        EndDate = endDate;
        ContractSalary = contractSalary;
        InsurableSalary = insurableSalary;
        DocumentUrl = documentUrl;
        Status = ContractStatus.Draft;
    }

    protected EmploymentContract() { }

    public void Activate()
    {
        if (Status != ContractStatus.Draft && Status != ContractStatus.Renewed)
            throw new InvalidOperationException($"Không thể kích hoạt HĐ ở trạng thái {Status}.");
        Status = ContractStatus.Active;
    }

    public void Terminate(string reason, DateTime terminatedAt)
    {
        if (Status == ContractStatus.Terminated)
            throw new InvalidOperationException("HĐ đã bị chấm dứt trước đó.");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Lý do chấm dứt là bắt buộc.");
        Status = ContractStatus.Terminated;
        TerminationReason = reason;
        TerminatedAt = terminatedAt;
    }

    public void MarkExpired()
    {
        if (!EndDate.HasValue) return;
        if (EndDate.Value < DateTime.UtcNow && Status == ContractStatus.Active)
            Status = ContractStatus.Expired;
    }

    public void MarkRenewed()
    {
        if (Status != ContractStatus.Active && Status != ContractStatus.Expired)
            throw new InvalidOperationException($"Không thể đánh dấu Renewed từ trạng thái {Status}.");
        Status = ContractStatus.Renewed;
    }

    /// <summary>Còn <=days ngày là hết hạn (không tính HĐ Permanent).</summary>
    public bool IsExpiringSoon(int days = 30, DateTime? asOf = null)
    {
        if (!EndDate.HasValue) return false;
        if (Status != ContractStatus.Active) return false;
        var now = asOf ?? DateTime.UtcNow;
        var daysLeft = (EndDate.Value - now).TotalDays;
        return daysLeft >= 0 && daysLeft <= days;
    }
}

/// <summary>Sự kiện phát khi có HĐ sắp hết hạn — dùng cho background worker/notification.</summary>
public record ContractExpiringSoonEvent(
    Guid ContractId,
    Guid EmployeeId,
    string ContractNumber,
    DateTime EndDate,
    int DaysRemaining) : DomainEvent;
