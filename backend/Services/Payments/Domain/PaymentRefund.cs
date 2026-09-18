using BuildingBlocks.SharedKernel;

namespace Payments.Domain;

/// <summary>
/// D04 mục 4 — một lần hoàn tiền cho khách.
///
/// Không cổng nào trong phạm vi ra mắt (COD, chuyển khoản VietQR, SePay) có API hoàn tiền, nên
/// đường đi mặc định là **việc cần làm thủ công cho kế toán**: yêu cầu → duyệt → chuyển khoản/tiền mặt
/// → ghi mã tham chiếu → phát <c>PaymentRefunded</c> để Accounting lập credit note.
/// Cổng có API (VNPay — W2-21) gọi <see cref="MarkGatewayFailed"/> khi lỗi để rơi về đúng đường này,
/// thay vì để bản ghi lơ lửng không ai biết tiền đã trả hay chưa.
/// </summary>
public class PaymentRefund : Entity<Guid>
{
    public Guid PaymentIntentId { get; private set; }
    public Guid OrderId { get; private set; }
    public decimal Amount { get; private set; }
    public RefundChannel Channel { get; private set; }
    public RefundStatus Status { get; private set; }

    /// <summary>Lý do khách được hoàn (huỷ đơn đã trả, trả hàng, chuyển thừa...).</summary>
    public string Reason { get; private set; } = string.Empty;

    /// <summary>Mã giao dịch hoàn của ngân hàng/cổng — bằng chứng đã trả tiền.</summary>
    public string? Reference { get; private set; }

    public Guid? RequestedBy { get; private set; }
    public DateTime RequestedAt { get; private set; }
    public Guid? ApprovedBy { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public string? FailureReason { get; private set; }

    /// <summary>Khoá chống tạo trùng khi cùng một sự kiện `RefundRequested` được giao lại.</summary>
    public string IdempotencyKey { get; private set; } = string.Empty;

    protected PaymentRefund() { }

    public static PaymentRefund Request(
        PaymentIntent intent,
        decimal amount,
        RefundChannel channel,
        string reason,
        Guid? requestedBy,
        string idempotencyKey)
    {
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Số tiền hoàn phải lớn hơn 0");
        if (intent.Status is not (PaymentStatus.Succeeded or PaymentStatus.PartiallyRefunded))
            throw new InvalidOperationException("Chỉ hoàn được khoản đã thu");
        if (intent.AmountRefunded + amount > intent.Amount)
            throw new InvalidOperationException("Tổng hoàn vượt quá số tiền đã thu");

        return new PaymentRefund
        {
            Id = Guid.NewGuid(),
            PaymentIntentId = intent.Id,
            OrderId = intent.OrderId,
            Amount = amount,
            Channel = channel,
            Status = RefundStatus.Requested,
            Reason = string.IsNullOrWhiteSpace(reason) ? "Không ghi lý do" : reason.Trim(),
            RequestedBy = requestedBy,
            RequestedAt = DateTime.UtcNow,
            IdempotencyKey = idempotencyKey,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Approve(Guid? approvedBy)
    {
        if (Status != RefundStatus.Requested)
            throw new InvalidOperationException($"Không duyệt được phiếu hoàn ở trạng thái {Status}");
        Status = RefundStatus.Approved;
        ApprovedBy = approvedBy;
        ApprovedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Đã trả tiền cho khách. Mã tham chiếu BẮT BUỘC — không có thì không có bằng chứng.
    ///
    /// Bắt buộc phải qua <see cref="Approve"/> trước (hoặc <see cref="MarkGatewayFailed"/> đẩy phiếu
    /// đã duyệt về việc thủ công). Không có chốt này thì một người cầm `Payments.Refund` tự tạo phiếu
    /// rồi tự ghi "đã trả" trong một nhịp, `ApprovedBy` để trống — tiền ra khỏi quỹ mà không có
    /// người thứ hai ký.
    /// </summary>
    public void Complete(string reference, RefundChannel channel)
    {
        if (Status is RefundStatus.Completed or RefundStatus.Rejected)
            throw new InvalidOperationException($"Phiếu hoàn đã ở trạng thái cuối {Status}");
        if (string.IsNullOrWhiteSpace(reference))
            throw new ArgumentException("Thiếu mã tham chiếu giao dịch hoàn", nameof(reference));
        if (Status is not (RefundStatus.Approved or RefundStatus.Failed))
            throw new InvalidOperationException(
                $"Phiếu hoàn phải được duyệt trước khi ghi nhận đã trả tiền (trạng thái hiện tại: {Status})");

        Channel = channel;
        Reference = reference.Trim();
        Status = RefundStatus.Completed;
        CompletedAt = DateTime.UtcNow;
    }

    public void Reject(string reason)
    {
        if (Status == RefundStatus.Completed)
            throw new InvalidOperationException("Không từ chối được phiếu hoàn đã trả tiền");
        Status = RefundStatus.Rejected;
        FailureReason = string.IsNullOrWhiteSpace(reason) ? "Không ghi lý do" : reason.Trim();
    }

    /// <summary>Cổng trả lỗi → giữ phiếu lại thành việc thủ công cho kế toán (D04 mục 4).</summary>
    public void MarkGatewayFailed(string reason)
    {
        Status = RefundStatus.Failed;
        Channel = RefundChannel.ManualTransfer;
        FailureReason = reason;
    }
}
