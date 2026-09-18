using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using Payments.Application;
using Payments.Application.Configuration;
using Payments.Domain;
using Payments.Infrastructure.MoMo;

namespace Payments.Webhooks;

/// <summary>
/// W0-10 — MoMo IPN (POST JSON), HMAC-SHA256, fail-closed.
/// SecretKey chưa cấu hình → 503. Thiếu/sai `signature` → 401. Lệch `amount` → 409.
/// Trước đây: chữ ký CHỈ được kiểm khi SecretKey khác rỗng ⇒ secret rỗng = ai cũng POST được
/// `{"orderId":"&lt;paymentId&gt;","resultCode":0}` và đơn thành "đã trả".
/// </summary>
public static class MoMoWebhookEndpoint
{
    public static void MapMoMoWebhook(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/payments/v2/momo/callback", async (
            HttpContext ctx,
            PaymentWebhookHandler handler,
            PaymentConfigGuard guard,
            ILoggerFactory lf,
            CancellationToken ct) =>
        {
            var logger = lf.CreateLogger("MoMoWebhook");

            var secrets = guard.WebhookSecrets(PaymentProvider.Momo);
            if (secrets.Count == 0)
            {
                logger.LogError("MoMo IPN bị gọi nhưng Payment:MoMo:SecretKey CHƯA cấu hình — từ chối 503");
                return Results.Json(
                    new { error = "PAYMENT_GATEWAY_NOT_CONFIGURED", message = "Cổng thanh toán chưa được cấu hình" },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            using var reader = new StreamReader(ctx.Request.Body);
            var body = await reader.ReadToEndAsync(ct);
            Dictionary<string, JsonElement>? data;
            try { data = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(body); }
            catch (JsonException) { return Results.BadRequest(new { error = "INVALID_JSON" }); }
            if (data == null) return Results.BadRequest(new { error = "INVALID_JSON" });

            var momoConfig = new MoMoConfig
            {
                PartnerCode = guard.GetValueOrEmpty("Payment:MoMo:PartnerCode"),
                AccessKey = guard.GetValueOrEmpty("Payment:MoMo:AccessKey"),
                SecretKey = secrets[0]
            };

            // Chữ ký là BẮT BUỘC — không có nhánh "bỏ qua".
            if (!data.TryGetValue("signature", out var sigEl))
            {
                logger.LogWarning("MoMo: thiếu signature trong payload — từ chối 401");
                return Results.Json(new { error = "MISSING_SIGNATURE" }, statusCode: StatusCodes.Status401Unauthorized);
            }

            var receivedSig = sigEl.ValueKind == JsonValueKind.String ? sigEl.GetString() ?? "" : "";
            var stringMap = data.ToDictionary(
                k => k.Key,
                k => k.Value.ValueKind == JsonValueKind.String ? k.Value.GetString() ?? "" : k.Value.ToString());

            if (!new MoMoService(momoConfig, new HttpClient()).VerifySignature(stringMap, receivedSig))
            {
                logger.LogWarning("MoMo: chữ ký sai — từ chối 401");
                return Results.Json(new { error = "INVALID_SIGNATURE" }, statusCode: StatusCodes.Status401Unauthorized);
            }

            if (!data.TryGetValue("orderId", out var orderIdEl)) return Results.BadRequest(new { error = "MISSING_ORDER_ID" });
            var orderIdStr = orderIdEl.ValueKind == JsonValueKind.String ? orderIdEl.GetString() ?? "" : orderIdEl.ToString();
            if (!Guid.TryParse(orderIdStr, out var paymentId)) return Results.BadRequest(new { error = "INVALID_ORDER_ID" });

            var resultCode = data.TryGetValue("resultCode", out var rc) && rc.TryGetInt32(out var rcInt) ? rcInt : -1;
            var transId = data.TryGetValue("transId", out var tid) ? tid.ToString() : orderIdStr;
            decimal? amount = data.TryGetValue("amount", out var amtEl) && amtEl.TryGetDecimal(out var amt) ? amt : null;

            var result = await handler.ProcessAsync(
                provider: "MoMo",
                transactionId: transId,
                paymentIntentId: paymentId,
                success: resultCode == 0,
                failureReason: resultCode == 0 ? null : $"MoMo resultCode {resultCode}",
                gatewayAmount: amount,
                ct: ct);

            if (result.AmountMismatch)
            {
                return Results.Json(
                    new { error = "AMOUNT_MISMATCH", message = "Số tiền không khớp, đơn chờ đối soát" },
                    statusCode: StatusCodes.Status409Conflict);
            }

            return result.WasIdempotent ? Results.Ok(new { idempotent = true }) : Results.NoContent();
        }).AllowAnonymous();
    }
}
