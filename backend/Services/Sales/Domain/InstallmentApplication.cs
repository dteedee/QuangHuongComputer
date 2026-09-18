using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

/// <summary>
/// W2-20 — Hồ sơ trả góp CHẾ ĐỘ LEAD (không tích hợp API công ty tài chính - D04 mục 5, D10 quy tắc 6).
/// Khách nộp tên/SĐT/đối tác/kỳ hạn/trả trước + đồng ý chuyển thông tin cho CTTC (Luật 91/2025);
/// KHÔNG thu CCCD/sao kê qua web - hồ sơ tín dụng thật làm tại quầy/cổng của CTTC.
///
/// Đơn giữ <see cref="ExpiresAt"/> (mặc định 72h, <c>Installment:LeadHoldHours</c>). Nhân viên
/// duyệt (<see cref="Approve"/>) ghi số hợp đồng CTTC rồi ứng dụng gọi
/// <c>OrderLifecycleService.RecordTenderAsync</c> để đơn thành Paid - domain này KHÔNG tự thu tiền.
/// Từ chối/hết hạn -> huỷ đơn, nhả tồn (ở tầng ứng dụng, ngoài aggregate này).
/// </summary>
public class InstallmentApplication : Entity<Guid>
{
    public Guid OrderId { get; private set; }
    public string Provider { get; private set; } = string.Empty; // mã đối tác, khớp Sales:Installment:Partners
    public int TermMonths { get; private set; }                  // 6 | 9 | 12
    public decimal DownPayment { get; private set; }
    public decimal MonthlyAmount { get; private set; }
    public decimal TotalAmount { get; private set; }
    public InstallmentStatus Status { get; private set; }
    public string? RejectionReason { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? RejectedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public string? ProcessedBy { get; private set; }

    /// <summary>D10 quy tắc 6 — số hợp đồng CTTC, bắt buộc khi duyệt. Cột có sẵn từ migration W2-3.</summary>
    public string? FinanceContractNumber { get; private set; }

    /// <summary>Hạn giữ đơn/hồ sơ - quá hạn mà còn PendingApproval thì bị Expire tự động.
    /// Kiểu <c>DateTime?</c> để khớp đúng cấu hình EF cột hiện có ở
    /// <c>SalesAfterSalesModelConfiguration.cs</c> (W2-3 sở hữu) - luôn có giá trị sau
    /// <see cref="Create"/>, domain không bao giờ để null.</summary>
    public DateTime? ExpiresAt { get; private set; }

    /// <summary>Mốc khách bấm "đồng ý" (Luật 91/2025 Đ13) - luôn có giá trị sau <see cref="Create"/>
    /// (xem ghi chú kiểu ở <see cref="ExpiresAt"/>).</summary>
    public DateTime? ConsentAt { get; private set; }

    /// <summary>Sản phẩm cũ từng thu CCCD/sao kê qua web - đã xoá khỏi luồng nộp (D10 quy tắc 6).
    /// Property giữ lại (không xoá) chỉ vì cấu hình EF của nó nằm ở
    /// <c>Infrastructure/Data/SalesAfterSalesModelConfiguration.cs</c>, file DbContext dùng chung do
    /// W2-3 sở hữu (`plan.md` §6: "first track owns DI, DbContext and migrations") - xoá property ở
    /// đây mà không sửa được dòng cấu hình đó sẽ vỡ build của track khác. Không còn ai đọc/ghi field
    /// này (xem IR đã ghi trong report). Cột DB sẽ được W2-3 DROP khi áp IR.</summary>
    [Obsolete("Đã ngừng dùng - đợi IR: drop cột + xoá dòng cấu hình EF ở SalesAfterSalesModelConfiguration.cs")]
    public string? DocumentUrls { get; private set; }

    protected InstallmentApplication() { }

    public static InstallmentApplication Create(
        Guid orderId,
        string provider,
        int termMonths,
        decimal downPayment,
        decimal orderTotal,
        bool consentGiven,
        DateTime now,
        int leadHoldHours = 72)
    {
        if (orderId == Guid.Empty) throw new ArgumentException("orderId bắt buộc", nameof(orderId));
        if (string.IsNullOrWhiteSpace(provider)) throw new ArgumentException("provider bắt buộc", nameof(provider));
        if (termMonths != 6 && termMonths != 9 && termMonths != 12)
            throw new ArgumentException("termMonths chỉ chấp nhận 6, 9, 12", nameof(termMonths));
        if (downPayment < 0) throw new ArgumentException("downPayment không được âm", nameof(downPayment));
        if (orderTotal <= 0) throw new ArgumentException("orderTotal phải > 0", nameof(orderTotal));
        if (downPayment > orderTotal)
            throw new ArgumentException("downPayment không được lớn hơn tổng đơn hàng", nameof(downPayment));
        if (!consentGiven)
            throw new ArgumentException(
                "Cần đồng ý cho phép cửa hàng chuyển thông tin cho công ty tài chính (Luật 91/2025)",
                nameof(consentGiven));
        if (leadHoldHours <= 0) leadHoldHours = 72;

        // Financed amount = orderTotal - downPayment
        // MonthlyAmount ƯỚC TÍNH, chia đều không lãi - CTTC quyết định số thật lúc duyệt hồ sơ.
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
            ConsentAt = now,
            ExpiresAt = now.AddHours(leadHoldHours),
            CreatedAt = now
        };
    }

    /// <summary>Duyệt: bắt buộc số hợp đồng CTTC. KHÔNG tự thu tiền - tầng ứng dụng gọi
    /// <c>OrderLifecycleService.RecordTenderAsync</c> ngay sau lời gọi này.</summary>
    public void Approve(string approverName, string financeContractNumber, DateTime now)
    {
        if (Status != InstallmentStatus.PendingApproval)
            throw new InvalidOperationException($"Chỉ duyệt được hồ sơ đang PendingApproval, hiện tại: {Status}");
        if (string.IsNullOrWhiteSpace(financeContractNumber))
            throw new ArgumentException("Cần nhập số hợp đồng công ty tài chính", nameof(financeContractNumber));

        FinanceContractNumber = financeContractNumber.Trim();
        Status = InstallmentStatus.Approved;
        ApprovedAt = now;
        ProcessedBy = approverName;
        UpdatedAt = now;
    }

    public void Reject(string reason, string reviewerName, DateTime now)
    {
        if (Status != InstallmentStatus.PendingApproval)
            throw new InvalidOperationException($"Chỉ từ chối được hồ sơ đang PendingApproval, hiện tại: {Status}");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Cần cung cấp lý do từ chối", nameof(reason));
        Status = InstallmentStatus.Rejected;
        RejectedAt = now;
        RejectionReason = reason;
        ProcessedBy = reviewerName;
        UpdatedAt = now;
    }

    /// <summary>Hết hạn giữ hàng (W2-10's order-timeout job / sweep thủ công) - chỉ áp dụng khi
    /// hồ sơ còn PendingApproval; đã Approved thì coi như đã xong (đơn đã Paid), không hết hạn nữa.</summary>
    public void Expire(DateTime now)
    {
        if (Status != InstallmentStatus.PendingApproval)
            throw new InvalidOperationException($"Chỉ hết hạn được hồ sơ đang PendingApproval, hiện tại: {Status}");
        Status = InstallmentStatus.Expired;
        UpdatedAt = now;
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
}

public enum InstallmentStatus
{
    PendingApproval = 0,
    Approved = 1,
    Rejected = 2,
    Active = 3,
    Completed = 4,
    Expired = 5
}
