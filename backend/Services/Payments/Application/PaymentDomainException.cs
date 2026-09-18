using System.Net;
using BuildingBlocks.Endpoints;

namespace Payments.Application;

/// <summary>
/// Lỗi nghiệp vụ của Payments mang MÃ RIÊNG, để frontend rẽ nhánh theo `code` chứ không theo câu
/// tiếng Việt (docs/api-conventions.md mục 1). Thân phản hồi vẫn là `application/problem+json`
/// chuẩn do <c>ProblemDetailsFactory</c> dựng — không tự đắp body ở endpoint.
/// </summary>
public sealed class PaymentDomainException : DomainException
{
    private PaymentDomainException(string message, int statusCode, string code)
        : base(message, statusCode, code)
    {
    }

    /// <summary>Phương thức chưa cấu hình / không có chiến lược ⇒ 400. KHÔNG BAO GIỜ URL giả.</summary>
    public static PaymentDomainException MethodUnavailable() => new(
        "Phương thức thanh toán chưa được cấu hình.",
        (int)HttpStatusCode.BadRequest, PaymentErrorCodes.MethodUnavailable);

    /// <summary>Phương thức "dẫn hướng" (trả góp lead-mode) — không tạo lệnh thu tiền.</summary>
    public static PaymentDomainException MethodNotDirect() => new(
        "Phương thức này cần lập hồ sơ trước, không thanh toán trực tiếp.",
        (int)HttpStatusCode.BadRequest, PaymentErrorCodes.MethodNotDirect);

    public static PaymentDomainException OrderCancelled() => new(
        "Đơn hàng đã bị huỷ.", (int)HttpStatusCode.BadRequest, PaymentErrorCodes.OrderCancelled);

    public static PaymentDomainException OrderAlreadyPaid() => new(
        "Đơn hàng đã được thanh toán.", (int)HttpStatusCode.BadRequest, PaymentErrorCodes.OrderAlreadyPaid);

    public static PaymentDomainException InvalidOrderAmount() => new(
        "Tổng tiền đơn hàng không hợp lệ.", (int)HttpStatusCode.BadRequest, PaymentErrorCodes.InvalidOrderAmount);

    public static PaymentDomainException CodLimitExceeded(decimal limit) => new(
        $"Đơn trên {limit:N0}đ không áp dụng thanh toán khi nhận hàng. Vui lòng chọn chuyển khoản.",
        (int)HttpStatusCode.BadRequest, PaymentErrorCodes.CodLimitExceeded);

    /// <summary>Khách vãng lai gọi khi `Payment:GuestToken:Secret` chưa cấu hình ⇒ 503 fail-closed.</summary>
    public static PaymentDomainException GuestPaymentDisabled() => new(
        "Thanh toán cho khách vãng lai chưa được bật.",
        (int)HttpStatusCode.ServiceUnavailable, PaymentErrorCodes.GuestPaymentDisabled);

    public static PaymentDomainException InvalidGuestToken() => new(
        "Liên kết thanh toán không hợp lệ hoặc đã hết hạn.",
        (int)HttpStatusCode.Unauthorized, PaymentErrorCodes.InvalidGuestToken);

    public static PaymentDomainException ProviderConfiguration(string message) => new(
        message, (int)HttpStatusCode.ServiceUnavailable, PaymentErrorCodes.ProviderMisconfigured);
}

/// <summary>Mã lỗi công khai của module Payments — hợp đồng với frontend.</summary>
public static class PaymentErrorCodes
{
    public const string MethodUnavailable = "PAYMENT_METHOD_UNAVAILABLE";
    public const string MethodNotDirect = "PAYMENT_METHOD_NOT_DIRECT";
    public const string OrderCancelled = "ORDER_CANCELLED";
    public const string OrderAlreadyPaid = "ORDER_ALREADY_PAID";
    public const string InvalidOrderAmount = "INVALID_ORDER_AMOUNT";
    public const string CodLimitExceeded = "COD_LIMIT_EXCEEDED";
    public const string GuestPaymentDisabled = "GUEST_PAYMENT_DISABLED";
    public const string InvalidGuestToken = "INVALID_GUEST_TOKEN";
    public const string ProviderMisconfigured = "PAYMENT_PROVIDER_MISCONFIGURED";
    public const string NoPendingCod = "NO_PENDING_COD";
}
