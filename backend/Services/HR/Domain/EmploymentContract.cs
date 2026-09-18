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

    /// <summary>
    /// W2-25 / D06 §4 — HỢP ĐỒNG THỬ VIỆC RIÊNG (ký riêng, không phải nội dung thử việc ghi trong
    /// HĐLĐ theo BLLĐ Đ.24). CHỈ khi cờ này bật thì người lao động mới nằm ngoài BHXH/BHYT/BHTN bắt
    /// buộc (NĐ 158/2025 Đ.3.5; Luật Việc làm 74/2025 Đ.31.2) và mới khấu trừ thuế 10% mỗi lần chi.
    ///
    /// Thử việc ghi TRONG HĐLĐ -> đóng đủ bảo hiểm; HĐLĐ ≥ 3 tháng -> tính thuế luỹ tiến.
    /// <c>ContractType.Probation</c> một mình KHÔNG đủ để quyết định.
    /// </summary>
    public bool IsStandaloneProbation { get; private set; }

    /// <summary>Số tháng thời hạn hợp đồng — &lt; 3 tháng thì khấu trừ 10% thay vì luỹ tiến (D06 §4).</summary>
    public int TermMonths
    {
        get
        {
            if (Type == ContractType.Permanent || !EndDate.HasValue) return 120;
            var months = ((EndDate.Value.Year - StartDate.Year) * 12) + EndDate.Value.Month - StartDate.Month;
            if (EndDate.Value.Day >= StartDate.Day) months += 1;
            return Math.Max(0, months);
        }
    }

    /// <summary>W2-25 — đánh dấu/bỏ đánh dấu hợp đồng thử việc riêng.</summary>
    public void SetStandaloneProbation(bool isStandalone)
    {
        if (isStandalone && Type != ContractType.Probation)
            throw new ArgumentException("Chỉ hợp đồng loại Probation mới đánh dấu được là hợp đồng thử việc riêng.");
        IsStandaloneProbation = isStandalone;
    }

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

    /// <summary>Sửa các trường hồ sơ hợp đồng — W2-7 khoản 8 (PUT /api/hr/contracts/{id}).
    /// Không cho sửa khi đã Terminated/Renewed (lịch sử bất biến).</summary>
    public void UpdateTerms(DateTime? endDate, decimal contractSalary, decimal insurableSalary, string? documentUrl)
    {
        if (Status == ContractStatus.Terminated || Status == ContractStatus.Renewed)
            throw new InvalidOperationException($"Không thể sửa HĐ ở trạng thái {Status}.");
        if (contractSalary <= 0) throw new ArgumentException("ContractSalary phải > 0.");
        if (insurableSalary <= 0) throw new ArgumentException("InsurableSalary phải > 0.");
        if (Type == ContractType.Permanent && endDate.HasValue)
            throw new ArgumentException("Hợp đồng không xác định thời hạn không có EndDate.");
        if (endDate.HasValue && endDate.Value <= StartDate)
            throw new ArgumentException("EndDate phải sau StartDate.");

        EndDate = endDate;
        ContractSalary = contractSalary;
        InsurableSalary = insurableSalary;
        DocumentUrl = documentUrl;
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
