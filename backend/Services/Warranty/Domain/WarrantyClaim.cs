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

    public void Approve() { Status = ClaimStatus.Approved; }

    public void Reject(string reason)
    {
        Status = ClaimStatus.Rejected;
        ClaimType = Domain.ClaimType.Rejected;
        ResolutionNotes = reason;
        ResolvedDate = DateTime.UtcNow;
    }

    public void Resolve(string notes)
    {
        Status = ClaimStatus.Resolved;
        ResolutionNotes = notes;
        ResolvedDate = DateTime.UtcNow;
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
