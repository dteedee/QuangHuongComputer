using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Payments.Domain;
using Payments.Endpoints;

namespace Payments;

/// <summary>
/// Điểm vào của module Payments.
///
/// Bộ webhook/callback **v1** đã bị XOÁ (W0-10, D04 R4/R4b):
///   GET  /api/payments/vnpay/callback
///   POST /api/payments/sepay/webhook
///   POST /api/payments/momo/callback
///   POST /api/payments/webhook/mock   (kèm cả khối `#if DEBUG`)
/// Tất cả đều gọi verifier fail-open. Bộ duy nhất còn lại là `/api/payments/v2/*`
/// (xem <see cref="PaymentWebhookEndpoints"/>), fail-closed.
///
/// Nhánh `else` của `/initiate` — đường "thành công giả" gán `paymentUrl=/payment/mock/{id}` cho MỌI
/// provider không có nhánh riêng — cũng đã bị xoá. W2-4 gỡ nốt `PaymentUrlBuilder` (cái `switch`
/// cuối cùng theo provider) và thay bằng chiến lược <see cref="Application.Providers.IPaymentProvider"/>.
/// </summary>
public static class PaymentsEndpoints
{
    public static void MapPaymentsEndpoints(this IEndpointRouteBuilder app)
    {
        // Nguồn sự thật DUY NHẤT cho checkout/footer/PDP/POS — public (D04 R1).
        app.MapPaymentMethodsEndpoint();

        // Khách vãng lai: token ký cho ĐÚNG một đơn, fail-closed khi chưa cấu hình secret.
        app.MapPaymentGuestEndpoints();

        // W1-10: nhánh /api/payments là "thanh toán đơn của tôi" — initiate và GET /{id}
        // đều tự kiểm tra quyền sở hữu đơn trong handler, nên chỉ cần đăng nhập.
        // Các nhóm con (/admin, /cod/confirm) tự khai báo policy permission tường minh.
        var group = app.MapGroup("/api/payments").RequireAuthorization(SecurityPolicies.Authenticated);

        group.MapInitiatePaymentEndpoint();
        group.MapPaymentQueryEndpoints();
        group.MapPaymentAdminEndpoints();
    }
}

/// <summary>
/// `Amount` của client KHÔNG BAO GIỜ được dùng: số tiền luôn lấy từ đơn hàng qua
/// <see cref="Application.IOrderPaymentInfoProvider"/>. Trường giữ lại để không phá hợp đồng API
/// hiện có của frontend, nhưng bị bỏ qua hoàn toàn ở server.
/// </summary>
public record InitiatePaymentDto(Guid OrderId, decimal Amount, PaymentProvider Provider, string? BankCode = null);

public record PaymentConfigDto(string Key, string Value, string? Description, bool IsSecret);
