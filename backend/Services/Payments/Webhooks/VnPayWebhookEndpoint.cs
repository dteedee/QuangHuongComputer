using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Payments.Application;
using Payments.Application.Configuration;
using Payments.Domain;
using Payments.Infrastructure.VNPay;

namespace Payments.Webhooks;

/// <summary>
/// W0-10 — VNPay return/callback (GET), HMAC-SHA512, fail-closed.
/// HashSecret chưa cấu hình → 503. Thiếu/sai `vnp_SecureHash` → 401. Lệch `vnp_Amount` → 409.
/// </summary>
public static class VnPayWebhookEndpoint
{
    public static void MapVnPayWebhook(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/payments/v2/vnpay/callback", async (
            HttpContext ctx,
            PaymentWebhookHandler handler,
            PaymentConfigGuard guard,
            IConfiguration config,
            ILoggerFactory lf,
            CancellationToken ct) =>
        {
            var logger = lf.CreateLogger("VNPayWebhook");

            var secrets = guard.WebhookSecrets(PaymentProvider.VnPay);
            if (secrets.Count == 0)
            {
                logger.LogError("VNPay webhook bị gọi nhưng Payment:VNPay:HashSecret CHƯA cấu hình — từ chối 503");
                return Results.Json(
                    new { error = "PAYMENT_GATEWAY_NOT_CONFIGURED", message = "Cổng thanh toán chưa được cấu hình" },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            var query = ctx.Request.Query.ToDictionary(x => x.Key, x => x.Value.ToString());
            var response = new VNPayService(new VNPayConfig { HashSecret = secrets[0] }).ProcessCallback(query);

            if (!response.HasSignature)
            {
                logger.LogWarning("VNPay: callback thiếu vnp_SecureHash — từ chối 401");
                return Results.Json(new { error = "MISSING_SIGNATURE" }, statusCode: StatusCodes.Status401Unauthorized);
            }
            if (!response.IsValidSignature)
            {
                logger.LogWarning("VNPay: chữ ký không hợp lệ — từ chối 401");
                return Results.Json(new { error = "INVALID_SIGNATURE" }, statusCode: StatusCodes.Status401Unauthorized);
            }
            if (!Guid.TryParse(response.TxnRef, out var paymentId))
                return Results.BadRequest(new { error = "INVALID_TXN_REF" });

            var txnId = string.IsNullOrEmpty(response.TransactionNo) ? response.TxnRef : response.TransactionNo;
            var result = await handler.ProcessAsync(
                provider: "VNPay",
                transactionId: txnId,
                paymentIntentId: paymentId,
                success: response.Success,
                failureReason: response.Success ? null : VNPayErrorMessages.Describe(response.ResponseCode),
                gatewayAmount: response.Amount > 0 ? response.Amount : null,
                ct: ct);

            if (result.AmountMismatch)
            {
                return Results.Json(
                    new { error = "AMOUNT_MISMATCH", message = "Số tiền không khớp, đơn chờ đối soát" },
                    statusCode: StatusCodes.Status409Conflict);
            }

            var frontendUrl = config["Frontend:Url"] ?? config["Cors:AllowedOrigins:0"] ?? "http://localhost:3000";
            var target = response.Success
                ? $"{frontendUrl}/payment/success?orderId={result.OrderId}"
                : $"{frontendUrl}/payment/failed?orderId={result.OrderId}&error={response.ResponseCode}";
            return Results.Redirect(target);
        }).AllowAnonymous();
    }
}
