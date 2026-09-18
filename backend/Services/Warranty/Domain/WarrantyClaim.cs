using BuildingBlocks.SharedKernel;

namespace Warranty.Domain;

public enum ClaimStatus
{
    Pending,
    Approved,
    Rejected,
    Resolved,
    InProgress // Phase 07: đang xử lý (Repair đã tạo WorkOrder / RMA đã gửi hãng...)
}

public enum ResolutionPreference
{
    Repair,
    Replace,
    Refund
}

/// <summary>Phase 07: phân loại cách xử lý claim để phối hợp Repair/RMA/Exchange.</summary>
public enum ClaimType
{
    RepairAtShop = 1,          // Sửa tại shop → tạo WorkOrder (Repair)
    SendToManufacturer = 2,    // Gửi hãng → tạo WarrantyRma
    ExchangeNew = 3,           // Đổi mới → xuất máy từ kho
    Rejected = 4               // Từ chối (lỗi do người dùng, hết hạn...)
}

public class WarrantyClaim : Entity<Guid>
{
    public Guid CustomerId { get; private set; }
    public string SerialNumber { get; private set; } = string.Empty;
    public string IssueDescription { get; private set; } = string.Empty;
    public ClaimStatus Status { get; private set; }
    public DateTime FiledDate { get; private set; }
    public DateTime? ResolvedDate { get; private set; }
    public string? ResolutionNotes { get; private set; }
    public ResolutionPreference PreferredResolution { get; private set; }
    public List<string> AttachmentUrls { get; private set; } = new();
    public bool IsManagerOverride { get; private set; }

    // Phase 07
    public ClaimType? ClaimType { get; private set; }
    public DateTime? SlaDeadline { get; private set; }
    public Guid? WorkOrderId { get; private set; }       // Sửa tại shop → Repair.WorkOrder
    public Guid? RmaId { get; private set; }             // Gửi hãng → WarrantyRma
    public Guid? LoanerDeviceId { get; private set; }    // Máy cho mượn

    // D08 §4: actor tracking + "hai lớp thời gian".
    public Guid? ApprovedBy { get; private set; }
    public Guid? ResolvedBy { get; private set; }
    public DateTime? DeviceReceivedAt { get; private set; }
    public DateTime? DeviceReturnedAt { get; private set; }
    /// <summary>Số ngày xử lý CÔNG BỐ trên biên nhận (mốc pháp lý Đ30.2.đ) — KHÔNG phải SLA nội bộ.</summary>
    public int? CommittedTurnaroundDays { get; private set; }

    public WarrantyClaim(
        Guid customerId,
        string serialNumber,
        string issueDescription,
        ResolutionPreference preferredResolution = ResolutionPreference.Repair,
        List<string>? attachmentUrls = null,
        bool isManagerOverride = false)
    {
        Id = Guid.NewGuid();
        CustomerId = customerId;
        SerialNumber = serialNumber;
        IssueDescription = issueDescription;
        Status = ClaimStatus.Pending;
        FiledDate = DateTime.UtcNow;
        PreferredResolution = preferredResolution;
        AttachmentUrls = attachmentUrls ?? new List<string>();
        IsManagerOverride = isManagerOverride;
    }

    protected WarrantyClaim() { }

    public void Approve(Guid? approvedBy = null)
    {
        Status = ClaimStatus.Approved;
        ApprovedBy = approvedBy;
    }

    public void Reject(string reason)
    {
        Status = ClaimStatus.Rejected;
        ClaimType = Domain.ClaimType.Rejected;
        ResolutionNotes = reason;
        ResolvedDate = DateTime.UtcNow;
    }

    public void Resolve(string notes, Guid? resolvedBy = null)
    {
        Status = ClaimStatus.Resolved;
        ResolutionNotes = notes;
        ResolvedDate = DateTime.UtcNow;
        ResolvedBy = resolvedBy;
    }

    /// <summary>D08 §4: mốc nhận máy — dùng cộng bù (thời gian xử lý không tính vào hạn BH).</summary>
    public void ReceiveDevice(DateTime? receivedAt = null)
    {
        DeviceReceivedAt = receivedAt ?? DateTime.UtcNow;
    }

    /// <summary>D08 §4: mốc trả máy — số ngày giữa hai mốc này cộng bù vào ProductWarranty.</summary>
    public void ReturnDevice(DateTime? returnedAt = null)
    {
        DeviceReturnedAt = returnedAt ?? DateTime.UtcNow;
    }

    /// <summary>D08 §4: số ngày xử lý IN TRÊN BIÊN NHẬN — mốc pháp lý Đ30.2.đ, không phải SLA nội bộ.</summary>
    public void SetCommittedTurnaround(int days)
    {
        if (days < 0) throw new ArgumentOutOfRangeException(nameof(days));
        CommittedTurnaroundDays = days;
    }

    /// <summary>Số ngày máy đã ở shop/hãng để xử lý claim này (cộng bù hạn BH). Null nếu chưa đủ 2 mốc.</summary>
    public int? ServiceDurationDays()
    {
        if (DeviceReceivedAt is null || DeviceReturnedAt is null) return null;
        var days = (DeviceReturnedAt.Value - DeviceReceivedAt.Value).Days;
        return days > 0 ? days : 0;
    }

    /// <summary>Phase 07: chỉ định cách xử lý + SLA deadline.</summary>
    public void AssignHandling(ClaimType type, int slaTargetHours)
    {
        if (Status != ClaimStatus.Approved)
            throw new InvalidOperationException("Chỉ gán xử lý cho claim đã duyệt.");
        ClaimType = type;
        SlaDeadline = DateTime.UtcNow.AddHours(slaTargetHours);
        Status = ClaimStatus.InProgress;
    }

    public void LinkWorkOrder(Guid workOrderId)
    {
        if (ClaimType != Domain.ClaimType.RepairAtShop)
            throw new InvalidOperationException("Chỉ RepairAtShop gắn được WorkOrder.");
        WorkOrderId = workOrderId;
    }

    public void LinkRma(Guid rmaId)
    {
        if (ClaimType != Domain.ClaimType.SendToManufacturer)
            throw new InvalidOperationException("Chỉ SendToManufacturer gắn được RMA.");
        RmaId = rmaId;
    }

    public void LinkLoanerDevice(Guid loanerDeviceId)
    {
        LoanerDeviceId = loanerDeviceId;
    }

    /// <summary>Đã đạt tỉ lệ % của SLA — dùng để trigger cảnh báo.</summary>
    public bool IsSlaBreachingAt(int warningPercent, DateTime? now = null)
    {
        if (Status == ClaimStatus.Resolved || Status == ClaimStatus.Rejected) return false;
        if (!SlaDeadline.HasValue) return false;
        var reference = now ?? DateTime.UtcNow;
        var elapsed = reference - FiledDate;
        var total = SlaDeadline.Value - FiledDate;
        if (total.TotalMilliseconds <= 0) return true;
        var pct = (elapsed.TotalMilliseconds / total.TotalMilliseconds) * 100.0;
        return pct >= warningPercent;
    }
}
