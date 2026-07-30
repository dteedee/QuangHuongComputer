using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

/// <summary>
/// Phase 04: Hồ sơ trả góp.
/// Đơn có PaymentMethod=Installment → tạo hồ sơ này (PendingApproval).
/// Nhân viên duyệt → Approved → khách ký hợp đồng → Active → trả xong → Completed.
/// </summary>
public class InstallmentApplication : Entity<Guid>
{
    public Guid OrderId { get; private set; }
    public string Provider { get; private set; } = string.Empty; // HomeCredit | FeCredit | Manual | VNPayCC
    public int TermMonths { get; private set; }                  // 6 | 9 | 12
    public decimal DownPayment { get; private set; }
    public decimal MonthlyAmount { get; private set; }
    public decimal TotalAmount { get; private set; }
    public InstallmentStatus Status { get; private set; }
    public string? DocumentUrls { get; private set; }            // JSON array — CMND/CCCD/sao kê
    public string? RejectionReason { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? RejectedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public string? ProcessedBy { get; private set; }

    protected InstallmentApplication() { }

    public static InstallmentApplication Create(
        Guid orderId,
        string provider,
        int termMonths,
        decimal downPayment,
        decimal orderTotal,
        string? documentUrls = null)
    {
        if (orderId == Guid.Empty) throw new ArgumentException("orderId bắt buộc", nameof(orderId));
        if (string.IsNullOrWhiteSpace(provider)) throw new ArgumentException("provider bắt buộc", nameof(provider));
        if (termMonths != 6 && termMonths != 9 && termMonths != 12)
            throw new ArgumentException("termMonths chỉ chấp nhận 6, 9, 12", nameof(termMonths));
        if (downPayment < 0) throw new ArgumentException("downPayment không được âm", nameof(downPayment));
        if (orderTotal <= 0) throw new ArgumentException("orderTotal phải > 0", nameof(orderTotal));
        if (downPayment > orderTotal)
            throw new ArgumentException("downPayment không được lớn hơn tổng đơn hàng", nameof(downPayment));

        // Financed amount = orderTotal - downPayment
        // MonthlyAmount tính đơn giản (chia đều, không lãi) — nhà cung cấp thực tính lãi khi duyệt.
        var financed = orderTotal - downPayment;
        var monthly = Math.Round(financed / termMonths, 0);

        return new InstallmentApplication
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            Provider = provider,
            TermMonths = termMonths,
            DownPayment = downPayment,
            TotalAmount = orderTotal,
            MonthlyAmount = monthly,
            Status = InstallmentStatus.PendingApproval,
            DocumentUrls = documentUrls,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Approve(string approverName)
    {
        if (Status != InstallmentStatus.PendingApproval)
            throw new InvalidOperationException($"Chỉ duyệt được hồ sơ đang PendingApproval, hiện tại: {Status}");
        Status = InstallmentStatus.Approved;
        ApprovedAt = DateTime.UtcNow;
        ProcessedBy = approverName;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reject(string reason, string reviewerName)
    {
        if (Status != InstallmentStatus.PendingApproval)
            throw new InvalidOperationException($"Chỉ từ chối được hồ sơ đang PendingApproval, hiện tại: {Status}");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Cần cung cấp lý do từ chối", nameof(reason));
        Status = InstallmentStatus.Rejected;
        RejectedAt = DateTime.UtcNow;
        RejectionReason = reason;
        ProcessedBy = reviewerName;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        if (Status != InstallmentStatus.Approved)
            throw new InvalidOperationException($"Chỉ kích hoạt được hồ sơ đã Approved, hiện tại: {Status}");
        Status = InstallmentStatus.Active;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Complete()
    {
        if (Status != InstallmentStatus.Active)
            throw new InvalidOperationException($"Chỉ complete được hồ sơ đang Active, hiện tại: {Status}");
        Status = InstallmentStatus.Completed;
        CompletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AttachDocuments(string documentUrlsJson)
    {
        DocumentUrls = documentUrlsJson;
        UpdatedAt = DateTime.UtcNow;
    }
}

public enum InstallmentStatus
{
    PendingApproval = 0,
    Approved = 1,
    Rejected = 2,
    Active = 3,
    Completed = 4
}
