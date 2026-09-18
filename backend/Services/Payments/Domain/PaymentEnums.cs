using BuildingBlocks.SharedKernel;

namespace Payments.Domain;

/// <summary>
/// W2-4 — tách khỏi <c>PaymentIntent.cs</c> để file entity dưới 200 dòng.
/// GIÁ TRỊ SỐ LÀ HỢP ĐỒNG DỮ LIỆU: cột `Provider`/`Status` lưu int, không bao giờ chèn giữa.
/// </summary>
public enum PaymentProvider
{
    /// <summary>D04: đã xoá code (Stripe không mở tài khoản ở Việt Nam). Giữ số enum cho dữ liệu cũ.</summary>
    [Obsolete("D04: Stripe đã bị gỡ khỏi hệ thống. Giữ giá trị enum để không dịch số các giá trị sau.")]
    Stripe,

    VnPay,

    Momo,

    COD,

    /// <summary>
    /// D04 tầng 0b/1 — **chuyển khoản ngân hàng (VietQR)**. Tên thành viên giữ nguyên `SePay`
    /// vì cột `Provider` đã lưu giá trị 4 trên dữ liệu thật; SePay chỉ là KÊNH TỰ ĐỘNG XÁC NHẬN
    /// của phương thức này (khách không bao giờ thấy chữ "SePay" — D04 mục 2 tầng 1).
    /// Khoá cấu hình của phương thức là `Payment:BankTransfer:*`.
    /// </summary>
    SePay,

    /// <summary>D04: đã xoá code (ZaloPay cần hợp đồng trước khi có khoá test). Giữ số enum.</summary>
    [Obsolete("D04: ZaloPay đã bị gỡ khỏi hệ thống. Giữ giá trị enum để không dịch số các giá trị sau.")]
    ZaloPay,

    /// <summary>
    /// D10/D04 mục 5 — trả góp ở chế độ "lead": KHÔNG có API tín dụng, không tạo PaymentIntent.
    /// Chỉ xuất hiện trong <c>GET /api/payments/methods</c> khi danh sách đối tác của D10 khác rỗng.
    /// </summary>
    Installment
}

public enum PaymentStatus
{
    Pending,
    Succeeded,
    Failed,
    Cancelled,
    Refunded,

    /// <summary>D04 mục 4 — đã hoàn một phần; phần còn lại vẫn là doanh thu đã thu.</summary>
    PartiallyRefunded
}

/// <summary>D04 mục 4 (COD) — tiền mặt đã thu hộ nhưng chưa về tài khoản công ty.</summary>
public enum CodSettlementStatus
{
    /// <summary>Không phải khoản COD.</summary>
    NotApplicable,

    /// <summary>Đã thu của khách, đang chờ nộp quỹ / hãng vận chuyển hoàn tiền về.</summary>
    AwaitingRemittance,

    /// <summary>Kế toán đã tick "đã nhận tiền đối soát".</summary>
    Remitted
}

/// <summary>D04 mục 4 — kênh hoàn tiền thực tế.</summary>
public enum RefundChannel
{
    /// <summary>Gọi API hoàn tiền của cổng (VNPay 02/03 — W2-21).</summary>
    Gateway,

    /// <summary>Kế toán chuyển khoản tay.</summary>
    ManualTransfer,

    /// <summary>Trả tiền mặt tại quầy.</summary>
    Cash
}

public enum RefundStatus
{
    /// <summary>Đã yêu cầu, chờ người có quyền `Payments.Refund` duyệt.</summary>
    Requested,

    /// <summary>Đã duyệt, chờ thực hiện (việc cần làm của kế toán).</summary>
    Approved,

    /// <summary>Đã trả tiền cho khách, có mã tham chiếu.</summary>
    Completed,

    /// <summary>Từ chối hoàn.</summary>
    Rejected,

    /// <summary>Cổng trả lỗi — đã chuyển thành việc thủ công.</summary>
    Failed
}

// Events
public record PaymentSucceededDomainEvent(Guid PaymentId, Guid OrderId, decimal Amount) : DomainEvent;

public record PaymentFailedDomainEvent(Guid PaymentId, Guid OrderId, string Reason) : DomainEvent;

public record PaymentRefundedDomainEvent(Guid PaymentId, Guid OrderId, decimal Amount, bool Full) : DomainEvent;
