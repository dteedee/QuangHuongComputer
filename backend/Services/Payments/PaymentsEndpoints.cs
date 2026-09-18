using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Payments.Domain;
using Payments.Endpoints;

namespace Payments;

/// <summary>
/// W0-10 (D04 R4/R4b) — điểm vào của module Payments.
///
/// Bộ webhook/callback **v1** đã bị XOÁ khỏi file này:
///   GET  /api/payments/vnpay/callback
///   POST /api/payments/sepay/webhook
///   POST /api/payments/momo/callback
///   POST /api/payments/webhook/mock   (kèm cả khối `#if DEBUG`)
/// Tất cả đều gọi verifier fail-open. Bộ duy nhất còn lại là `/api/payments/v2/*`
/// (xem <see cref="PaymentWebhookEndpoints"/>), fail-closed.
///
/// Nhánh `else` của `/initiate` — đường "thành công giả" thật sự, gán `EXT-&lt;guid&gt;` +
/// `paymentUrl=/payment/mock/{id}` cho MỌI provider không có nhánh riêng — cũng đã bị xoá.
/// </summary>
public static class PaymentsEndpoints
{
    public static void MapPaymentsEndpoints(this IEndpointRouteBuilder app)
    {
        // Nguồn sự thật DUY NHẤT cho checkout/footer/PDP/POS — public (D04 R1).
        app.MapPaymentMethodsEndpoint();

        var group = app.MapGroup("/api/payments").RequireAuthorization();

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
