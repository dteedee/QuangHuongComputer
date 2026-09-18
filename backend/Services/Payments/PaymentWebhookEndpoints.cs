using Microsoft.AspNetCore.Routing;
using Payments.Webhooks;

namespace Payments;

/// <summary>
/// W0-10 (D04 R4b) — MỘT bộ webhook duy nhất, tất cả FAIL-CLOSED.
///
/// Trước đây có HAI bộ song song (v1 trong `PaymentsEndpoints.cs`, v2 ở đây) và cả hai đều gọi
/// verifier fail-open: bịt một bộ mà để bộ kia là chưa bịt gì. Bộ v1 đã bị XOÁ hoàn toàn
/// (`/api/payments/{vnpay/callback,sepay/webhook,momo/callback}` + `/api/payments/webhook/mock`).
/// Route ZaloPay v2 và `ZaloPayService` cũng đã bị xoá (D04: ZaloPay xuống backlog).
///
/// Luật chung cho mọi route dưới đây:
///  - secret chưa cấu hình  → 503 + log cảnh báo (KHÔNG BAO GIỜ "bỏ qua kiểm tra"),
///  - thiếu/sai chữ ký      → 401,
///  - số tiền cổng ≠ số tiền intent → 409, KHÔNG Succeed (để kế toán đối soát tay),
///  - idempotent theo (Provider, TransactionId) qua <see cref="Application.PaymentWebhookHandler"/>,
///  - không log payload/secret/chữ ký.
/// </summary>
public static class PaymentWebhookEndpoints
{
    public static void MapPaymentWebhookEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapVnPayWebhook();
        app.MapMoMoWebhook();
        app.MapSePayWebhook();
    }
}
