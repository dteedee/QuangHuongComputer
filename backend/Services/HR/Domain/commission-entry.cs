using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public enum CommissionStatus
{
    Pending = 0,    // Vừa ghi nhận, chờ HR/quản lý duyệt
    Approved = 1,   // Đã duyệt — kỳ lương kế tiếp sẽ trả
    Paid = 2,       // Đã trả qua bảng lương (PayrollId trỏ tới bảng lương đó)
    Reversed = 3    // Huỷ (phiếu sửa bị huỷ sau thanh toán, hoặc HR huỷ tay)
}

/// <summary>Nguồn phát sinh hoa hồng. Chuỗi, không phải enum: nguồn mới không đổi schema.</summary>
public static class CommissionSourceTypes
{
    /// <summary>Phiếu sửa chữa đã thanh toán — SourceId = WorkOrder.Id của module Repair.</summary>
    public const string RepairWorkOrder = "RepairWorkOrder";

    /// <summary>Bút toán thu hồi (số âm) khi phiếu sửa đã trả hoa hồng bị huỷ sau đó.</summary>
    public const string RepairWorkOrderClawback = "RepairWorkOrderClawback";
}

/// <summary>
/// Một khoản hoa hồng của một nhân viên, phát sinh từ đúng MỘT chứng từ nguồn.
/// (SourceType, SourceId) là khoá nghiệp vụ duy nhất — ghi nhận lại cùng phiếu sửa là no-op.
/// Tiền là số nguyên VND (làm tròn khi tính, lưu numeric(18,0)).
/// </summary>
public class CommissionEntry : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public string SourceType { get; private set; } = string.Empty;
    public Guid SourceId { get; private set; }
    /// <summary>Mã hiển thị của chứng từ nguồn (số phiếu TKT-...), để HR đối chiếu.</summary>
    public string SourceReference { get; private set; } = string.Empty;
    /// <summary>Căn cứ tính: tiền công + phí dịch vụ, KHÔNG gồm linh kiện.</summary>
    public decimal BaseAmount { get; private set; }
    public decimal RatePercent { get; private set; }
    public decimal FixedAmount { get; private set; }
    public decimal Amount { get; private set; }
    /// <summary>Kỳ ghi nhận yyyy-MM theo giờ Việt Nam của thời điểm thanh toán.</summary>
    public string Period { get; private set; } = string.Empty;
    public DateTime EarnedAt { get; private set; }
    public CommissionStatus Status { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public string? ApprovedBy { get; private set; }
    public DateTime? ReversedAt { get; private set; }
    public string? ReversalReason { get; private set; }
    /// <summary>Bảng lương đã (hoặc đang) đưa khoản này vào. Null = chưa vào bảng lương nào.</summary>
    public Guid? PayrollId { get; private set; }
    public DateTime? PaidAt { get; private set; }

    public CommissionEntry(Guid employeeId, string sourceType, Guid sourceId, string sourceReference,
        decimal baseAmount, decimal ratePercent, decimal fixedAmount, decimal amount,
        string period, DateTime earnedAt)
    {
        if (employeeId == Guid.Empty) throw new ArgumentException("EmployeeId là bắt buộc.");
        if (string.IsNullOrWhiteSpace(sourceType)) throw new ArgumentException("SourceType là bắt buộc.");
        if (sourceId == Guid.Empty) throw new ArgumentException("SourceId là bắt buộc.");
        if (!CommissionPeriod.IsValid(period)) throw new ArgumentException("Kỳ phải có dạng yyyy-MM.");

        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        SourceType = sourceType;
        SourceId = sourceId;
        SourceReference = sourceReference ?? string.Empty;
        BaseAmount = baseAmount;
        RatePercent = ratePercent;
        FixedAmount = fixedAmount;
        Amount = amount;
        Period = period;
        EarnedAt = earnedAt;
        Status = CommissionStatus.Pending;
    }

    protected CommissionEntry() { }

    public void Approve(string? approvedBy, DateTime now)
    {
        if (Status != CommissionStatus.Pending)
            throw new InvalidOperationException($"Chỉ duyệt được hoa hồng đang chờ duyệt (hiện: {Status}).");
        Status = CommissionStatus.Approved;
        ApprovedAt = now;
        ApprovedBy = approvedBy;
        UpdatedAt = now;
    }

    /// <summary>Huỷ khoản chưa trả. Khoản đã trả thì không huỷ được — phải thu hồi bằng bút toán âm.</summary>
    public void Reverse(string reason, DateTime now)
    {
        if (Status == CommissionStatus.Reversed) return;
        if (Status == CommissionStatus.Paid)
            throw new InvalidOperationException("Hoa hồng đã trả qua bảng lương, không huỷ được — dùng bút toán thu hồi.");
        Status = CommissionStatus.Reversed;
        ReversedAt = now;
        ReversalReason = string.IsNullOrWhiteSpace(reason) ? "Không rõ lý do" : reason.Trim();
        UpdatedAt = now;
    }

    public void LinkToPayroll(Guid payrollId)
    {
        if (Status != CommissionStatus.Approved)
            throw new InvalidOperationException("Chỉ hoa hồng đã duyệt mới được đưa vào bảng lương.");
        PayrollId = payrollId;
    }

    public void UnlinkFromPayroll()
    {
        if (Status == CommissionStatus.Paid)
            throw new InvalidOperationException("Hoa hồng đã trả, không gỡ khỏi bảng lương được.");
        PayrollId = null;
    }

    public void MarkPaid(DateTime now)
    {
        if (Status != CommissionStatus.Approved || PayrollId is null)
            throw new InvalidOperationException("Chỉ hoa hồng đã duyệt và đã vào bảng lương mới được đánh dấu đã trả.");
        Status = CommissionStatus.Paid;
        PaidAt = now;
        UpdatedAt = now;
    }
}
