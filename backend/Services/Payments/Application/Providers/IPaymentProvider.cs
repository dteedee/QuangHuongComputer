using Payments.Domain;

namespace Payments.Application.Providers;

/// <summary>
/// D04 R2 — MỘT chiến lược cho mỗi cổng. Endpoint không bao giờ `switch` theo provider nữa:
/// nó hỏi <see cref="PaymentProviderRegistry"/> và được trả về đúng một cài đặt, hoặc không gì cả.
///
/// "Không có cài đặt" là một câu trả lời HỢP LỆ và nó có nghĩa là **400**, không bao giờ là một URL
/// giả. Cổng chưa cấu hình không được đăng ký (<see cref="Configuration.PaymentConfigGuard"/>),
/// nên nhánh code "thành công giả" không tồn tại để lỡ tay bật.
/// </summary>
public interface IPaymentProvider
{
    PaymentProvider Provider { get; }

    /// <summary>Cổng có API hoàn tiền thật hay không. false ⇒ hoàn tiền là việc thủ công của kế toán.</summary>
    bool SupportsGatewayRefund => false;

    /// <summary>
    /// Chuẩn bị một lần thanh toán cho intent ĐÃ tạo (số tiền đã lấy từ đơn hàng ở server).
    /// Cài đặt được phép gắn ExternalId/PaymentCode lên intent; KHÔNG được SaveChanges.
    /// </summary>
    Task<PaymentInstruction> CreateAsync(PaymentCreationContext context, CancellationToken ct = default);

    /// <summary>Hoàn tiền qua cổng. Mặc định: không hỗ trợ ⇒ rơi về phiếu hoàn thủ công.</summary>
    Task<GatewayRefundResult> RefundAsync(PaymentIntent intent, decimal amount, string reason, CancellationToken ct = default)
        => Task.FromResult(GatewayRefundResult.NotSupported());

    /// <summary>
    /// Hỏi cổng về trạng thái thật của một intent còn treo (đối soát). Mặc định: không hỗ trợ.
    /// KHÔNG BAO GIỜ được tự xác nhận chỉ vì số tiền trùng — đó là luật D04.
    /// </summary>
    Task<GatewayQueryResult> QueryAsync(PaymentIntent intent, CancellationToken ct = default)
        => Task.FromResult(GatewayQueryResult.Unknown());
}

/// <summary>Mọi thứ một cổng cần để dựng lệnh thanh toán, lấy từ server.</summary>
public sealed record PaymentCreationContext(
    PaymentIntent Intent,
    decimal Amount,
    string OrderReference,
    string? BankCode,
    string BaseUrl,
    string FrontendUrl,
    string ClientIpAddress);

/// <summary>
/// Hướng dẫn trả về cho khách. `RedirectUrl` cho cổng chuyển hướng; `Transfer` cho chuyển khoản
/// (D04 mục 3b: QR KHÔNG BAO GIỜ là đủ — luôn kèm STK, tên chủ TK, ngân hàng, số tiền, mã thanh toán).
/// </summary>
public sealed record PaymentInstruction(
    string Kind,
    string? RedirectUrl = null,
    BankTransferInstruction? Transfer = null,
    string? Message = null)
{
    public static PaymentInstruction None(string message) => new("none", Message: message);

    public static PaymentInstruction Redirect(string url) => new("redirect", RedirectUrl: url);

    public static PaymentInstruction BankTransfer(BankTransferInstruction transfer) =>
        new("bank_transfer", Transfer: transfer);
}

/// <summary>D04 mục 3b — dữ liệu màn chuyển khoản. `QrPayload` là chuỗi EMVCo, FE/BE dựng ảnh từ đó.</summary>
public sealed record BankTransferInstruction(
    string BankBin,
    string BankName,
    string AccountNumber,
    string AccountName,
    decimal Amount,
    string PaymentCode,
    string QrPayload,
    string QrImageUrl,
    DateTime? ExpiresAt);

public sealed record GatewayRefundResult(bool Supported, bool Succeeded, string? Reference, string? Error)
{
    public static GatewayRefundResult NotSupported() => new(false, false, null, null);

    public static GatewayRefundResult Ok(string reference) => new(true, true, reference, null);

    public static GatewayRefundResult Failed(string error) => new(true, false, null, error);
}

public sealed record GatewayQueryResult(bool Known, bool Succeeded, decimal? Amount, string? Reference, string? Error)
{
    public static GatewayQueryResult Unknown() => new(false, false, null, null, null);

    public static GatewayQueryResult Paid(decimal amount, string reference) => new(true, true, amount, reference, null);

    public static GatewayQueryResult NotPaid(string? error = null) => new(true, false, null, null, error);
}
