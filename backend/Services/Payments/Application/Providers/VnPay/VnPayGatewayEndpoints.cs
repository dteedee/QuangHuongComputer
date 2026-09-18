using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Payments.Application.Configuration;
using Payments.Domain;

namespace Payments.Application.Providers.VnPay;

/// <summary>
/// W2-21 bước 3-4 — hai route VNPay, thuộc bộ webhook v2 hợp nhất của W2-4 (v1 đã xoá hẳn).
///
/// | route | ai gọi | được ghi DB? |
/// |---|---|---|
/// | `GET /api/payments/v2/vnpay/ipn` | máy chủ VNPay (server-to-server, HTTPS bắt buộc) | **CÓ — duy nhất** |
/// | `GET /api/payments/v2/vnpay/return` | trình duyệt của khách | **KHÔNG** |
///
/// Route return ở đây **về mặt cấu trúc không ghi được gì**: handler của nó không nhận
/// `PaymentsDbContext`, không nhận `PaymentWebhookHandler`, không nhận bus. Khách đóng tab, mở lại
/// URL return, hay sửa `vnp_ResponseCode` đều không đổi được kết quả — kết quả chỉ đến từ IPN, và
/// frontend poll `GET /api/payments/{id}` để biết.
///
/// IPN luôn trả **HTTP 200 + JSON `{RspCode, Message}`** (kể cả khi từ chối): VNPay đọc `RspCode`,
/// không đọc HTTP status. Ngoại lệ duy nhất là 503 khi chưa cấu hình `HashSecret` — lúc đó không
/// có cách nào xác thực nên không được phép trả lời như một cổng đang hoạt động.
/// </summary>
public static class VnPayGatewayEndpoints
{
    public static IEndpointRouteBuilder MapVnPayGatewayRoutes(this IEndpointRouteBuilder app)
    {
        // `PaymentWebhookHandler` đã được W2-4 đăng ký scoped; processor dựng tại chỗ để track này
        // không phải sửa `DependencyInjection.cs` (D04 mục 10 ý 5: chỉ thêm file, không sửa DI).
        app.MapGet(VnPayOptions.IpnPath, async (
            HttpContext ctx,
            PaymentWebhookHandler handler,
            PaymentConfigGuard guard,
            ILoggerFactory loggerFactory,
            CancellationToken ct) =>
        {
            var logger = loggerFactory.CreateLogger("VNPayIpn");
            var secrets = guard.WebhookSecrets(PaymentProvider.VnPay);
            if (secrets.Count == 0)
            {
                logger.LogError(
                    "VNPay IPN bị gọi nhưng {Key} CHƯA cấu hình — từ chối 503", VnPayOptions.HashSecretKey);
                return Results.Json(
                    new { error = "PAYMENT_GATEWAY_NOT_CONFIGURED", message = "Cổng thanh toán chưa được cấu hình" },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            var processor = new VnPayIpnProcessor(handler, loggerFactory.CreateLogger<VnPayIpnProcessor>());
            var ack = await processor.ProcessAsync(ReadQuery(ctx), secrets[0], ct);
            return Results.Json(new { RspCode = ack.RspCode, Message = ack.Message });
        })
        .AllowAnonymous()
        .WithName("VnPayIpn");

        app.MapGet(VnPayOptions.ReturnPath, (
            HttpContext ctx,
            PaymentConfigGuard guard,
            IConfiguration config,
            ILoggerFactory loggerFactory) =>
        {
            var logger = loggerFactory.CreateLogger("VNPayReturn");
            var frontend = FrontendUrl(config);

            var secrets = guard.WebhookSecrets(PaymentProvider.VnPay);
            if (secrets.Count == 0)
            {
                logger.LogError("VNPay return bị gọi nhưng {Key} CHƯA cấu hình", VnPayOptions.HashSecretKey);
                return Results.Redirect($"{frontend}/payment/result?error=PAYMENT_GATEWAY_NOT_CONFIGURED");
            }

            var query = ReadQuery(ctx);
            if (!VnPaySignature.Verify(secrets[0], query, VnPaySignature.ExtractHash(query)))
            {
                // Chữ ký hỏng ⇒ không tin bất kỳ tham số nào, kể cả mã đơn.
                logger.LogWarning("VNPay return: chữ ký không hợp lệ — không tiết lộ thông tin đơn");
                return Results.Redirect($"{frontend}/payment/result?error=INVALID_SIGNATURE");
            }

            var txnRef = query.TryGetValue("vnp_TxnRef", out var r) ? r : null;
            if (!VnPayPaymentUrlBuilder.TryParseIntentId(txnRef, out var intentId))
                return Results.Redirect($"{frontend}/payment/result?error=INVALID_TXN_REF");

            var code = query.TryGetValue("vnp_ResponseCode", out var c) ? c : null;
            var status = query.TryGetValue("vnp_TransactionStatus", out var s) ? s : null;

            // `pending` là câu trả lời ĐÚNG ngay cả khi VNPay nói 00: chỉ IPN mới xác nhận được.
            // Frontend poll `GET /api/payments/{id}` cho tới khi trạng thái thật xuất hiện.
            var outcome = VnPayResponseCodes.IsPaid(code, status) ? "pending" : "failed";
            var url = $"{frontend}/payment/result?paymentId={intentId:N}&outcome={outcome}"
                      + $"&code={Uri.EscapeDataString(code ?? string.Empty)}";
            return Results.Redirect(url);
        })
        .AllowAnonymous()
        .WithName("VnPayReturn");

        return app;
    }

    private static Dictionary<string, string?> ReadQuery(HttpContext ctx)
        => ctx.Request.Query.ToDictionary(
            kv => kv.Key, kv => (string?)kv.Value.ToString(), StringComparer.Ordinal);

    private static string FrontendUrl(IConfiguration config)
        => (config["Frontend:Url"] ?? config["Cors:AllowedOrigins:0"] ?? "http://localhost:3000").TrimEnd('/');
}
