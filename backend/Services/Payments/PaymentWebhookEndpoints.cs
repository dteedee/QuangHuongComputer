using System.Text.Json;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Payments.Application;
using Payments.Domain;
using Payments.Infrastructure;
using Payments.Infrastructure.MoMo;
using Payments.Infrastructure.SePay;
using Payments.Infrastructure.VNPay;
using Payments.Infrastructure.ZaloPay;

namespace Payments;

/// <summary>
/// Phase 04 luồng B — Webhook 4 cổng thanh toán:
/// - VNPay:  HMAC-SHA512 (VNPayService.ProcessCallback đã verify).
/// - MoMo:   HMAC-SHA256 signature.
/// - ZaloPay: HMAC-SHA256 với Key2.
/// - SePay:  token trong header Authorization.
/// Idempotent theo (Provider, TransactionId) — cùng webhook gửi 2 lần → chỉ ghi 1.
/// KHÔNG log payload có thông tin nhạy cảm.
/// </summary>
public static class PaymentWebhookEndpoints
{
    public static void MapPaymentWebhookEndpoints(this IEndpointRouteBuilder app)
    {
        // -------- VNPay --------
        app.MapGet("/api/payments/v2/vnpay/callback", async (
            HttpContext ctx,
            PaymentWebhookHandler handler,
            PaymentsDbContext db,
            IConfiguration config,
            ILoggerFactory lf,
            CancellationToken ct) =>
        {
            var logger = lf.CreateLogger("VNPayWebhook");
            var query = ctx.Request.Query.ToDictionary(x => x.Key, x => x.Value.ToString());

            var vnpayConfig = new VNPayConfig
            {
                HashSecret = config["Payment:VNPay:HashSecret"] ?? config["VNPay:HashSecret"] ?? "DEMOSECRET"
            };
            var response = new VNPayService(vnpayConfig).ProcessCallback(query);

            if (!response.IsValidSignature)
            {
                logger.LogWarning("VNPay: chữ ký không hợp lệ, từ chối");
                return Results.BadRequest(new { Error = "Invalid signature" });
            }

            if (!Guid.TryParse(response.TxnRef, out var paymentId))
                return Results.BadRequest(new { Error = "Invalid TxnRef" });

            var txnId = string.IsNullOrEmpty(response.TransactionNo) ? response.TxnRef : response.TransactionNo;
            var result = await handler.ProcessAsync(
                provider: "VNPay",
                transactionId: txnId,
                paymentIntentId: paymentId,
                success: response.Success,
                failureReason: response.Success ? null : $"VNPay code {response.ResponseCode}",
                ct: ct);

            var frontendUrl = config["Frontend:Url"] ?? config["Cors:AllowedOrigins:0"] ?? "http://localhost:3000";
            var target = response.Success
                ? $"{frontendUrl}/payment/success?orderId={result.OrderId}"
                : $"{frontendUrl}/payment/failed?orderId={result.OrderId}&error={response.ResponseCode}";
            return Results.Redirect(target);
        }).AllowAnonymous();

        // -------- MoMo IPN --------
        app.MapPost("/api/payments/v2/momo/callback", async (
            HttpContext ctx,
            PaymentWebhookHandler handler,
            IConfiguration config,
            ILoggerFactory lf,
            CancellationToken ct) =>
        {
            var logger = lf.CreateLogger("MoMoWebhook");
            using var reader = new StreamReader(ctx.Request.Body);
            var body = await reader.ReadToEndAsync(ct);
            Dictionary<string, JsonElement>? data;
            try
            {
                data = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(body);
            }
            catch (JsonException) { return Results.BadRequest(); }
            if (data == null) return Results.BadRequest();

            var momoConfig = new MoMoConfig
            {
                PartnerCode = config["Payment:MoMo:PartnerCode"] ?? "",
                AccessKey = config["Payment:MoMo:AccessKey"] ?? "",
                SecretKey = config["Payment:MoMo:SecretKey"] ?? ""
            };

            // Verify signature bắt buộc nếu SecretKey config có.
            if (!string.IsNullOrEmpty(momoConfig.SecretKey))
            {
                if (!data.TryGetValue("signature", out var sigEl))
                {
                    logger.LogWarning("MoMo: thiếu signature trong payload");
                    return Results.Unauthorized();
                }
                var receivedSig = sigEl.GetString() ?? "";
                var svc = new MoMoService(momoConfig, new HttpClient());
                var stringMap = data.ToDictionary(k => k.Key, k => k.Value.ToString());
                if (!svc.VerifySignature(stringMap, receivedSig))
                {
                    logger.LogWarning("MoMo: chữ ký sai");
                    return Results.Unauthorized();
                }
            }

            if (!data.TryGetValue("orderId", out var orderIdEl))
                return Results.BadRequest();
            var orderIdStr = orderIdEl.GetString() ?? "";
            if (!Guid.TryParse(orderIdStr, out var paymentId))
                return Results.BadRequest();

            var resultCode = data.TryGetValue("resultCode", out var rc) ? rc.GetInt32() : -1;
            var transId = data.TryGetValue("transId", out var tid) ? tid.ToString() : orderIdStr;

            var result = await handler.ProcessAsync(
                provider: "MoMo",
                transactionId: transId,
                paymentIntentId: paymentId,
                success: resultCode == 0,
                failureReason: resultCode == 0 ? null : $"MoMo resultCode {resultCode}",
                ct: ct);
            return result.WasIdempotent ? Results.Ok(new { idempotent = true }) : Results.NoContent();
        }).AllowAnonymous();

        // -------- ZaloPay callback --------
        app.MapPost("/api/payments/v2/zalopay/callback", async (
            HttpContext ctx,
            PaymentWebhookHandler handler,
            IConfiguration config,
            ILoggerFactory lf,
            CancellationToken ct) =>
        {
            var logger = lf.CreateLogger("ZaloPayWebhook");
            using var reader = new StreamReader(ctx.Request.Body);
            var body = await reader.ReadToEndAsync(ct);
            Dictionary<string, JsonElement>? payload;
            try { payload = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(body); }
            catch (JsonException) { return Results.BadRequest(); }
            if (payload == null || !payload.TryGetValue("data", out var dataEl) ||
                !payload.TryGetValue("mac", out var macEl))
                return Results.BadRequest(new { return_code = -1, return_message = "invalid" });

            var data = dataEl.GetString() ?? "";
            var mac = macEl.GetString() ?? "";

            var zaloConfig = new ZaloPayConfig
            {
                AppId = config["Payment:ZaloPay:AppId"] ?? "",
                Key1 = config["Payment:ZaloPay:Key1"] ?? "",
                Key2 = config["Payment:ZaloPay:Key2"] ?? ""
            };
            var svc = new ZaloPayService(zaloConfig, new HttpClient());
            if (!svc.VerifyCallback(data, mac))
            {
                logger.LogWarning("ZaloPay: MAC sai");
                return Results.Json(new { return_code = -1, return_message = "mac not equal" });
            }

            // Parse inner data JSON để lấy app_trans_id + zp_trans_id + status.
            Dictionary<string, JsonElement>? inner;
            try { inner = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(data); }
            catch (JsonException) { return Results.BadRequest(); }
            if (inner == null) return Results.BadRequest();

            var appTransId = inner.TryGetValue("app_trans_id", out var atid) ? atid.GetString() ?? "" : "";
            var zpTransId = inner.TryGetValue("zp_trans_id", out var ztid) ? ztid.ToString() : appTransId;
            // Trong ZaloPay: chỉ khi có callback là thanh toán thành công.
            var success = true;
            if (!Guid.TryParse(appTransId, out var paymentId))
            {
                // app_trans_id thường có prefix yyMMdd_{guid} — cắt phần guid ở cuối.
                var parts = appTransId.Split('_');
                Guid.TryParse(parts.LastOrDefault(), out paymentId);
            }

            await handler.ProcessAsync(
                provider: "ZaloPay",
                transactionId: string.IsNullOrEmpty(zpTransId) ? appTransId : zpTransId,
                paymentIntentId: paymentId == Guid.Empty ? null : paymentId,
                success: success,
                failureReason: null,
                ct: ct);
            return Results.Json(new { return_code = 1, return_message = "success" });
        }).AllowAnonymous();

        // -------- SePay webhook (token in Authorization header) --------
        app.MapPost("/api/payments/v2/sepay/webhook", async (
            SePayWebhookPayload payload,
            HttpRequest request,
            PaymentWebhookHandler handler,
            PaymentsDbContext db,
            IConfiguration config,
            ILoggerFactory lf,
            CancellationToken ct) =>
        {
            var logger = lf.CreateLogger("SePayWebhook");
            var apiKeyEntry = await db.PaymentConfigs.FindAsync(new object[] { "SePay:ApiKey" }, ct);
            var sepayConfig = new SePayConfig
            {
                ApiKey = apiKeyEntry?.Value ?? config["Payment:SePay:ApiKey"] ?? config["SePay:ApiKey"] ?? ""
            };
            var authHeader = request.Headers["Authorization"].ToString();
            if (!new SePayService(sepayConfig).VerifyWebhook(authHeader))
            {
                logger.LogWarning("SePay: token Authorization không hợp lệ");
                return Results.Unauthorized();
            }

            // SePay ID (unique per giao dịch) là transactionId cho idempotency.
            var txnId = payload.Id.ToString();
            // Match với pending PaymentIntent trong bảng (giữ logic multi-strategy trong PaymentsEndpoints cũ).
            var pendings = await db.PaymentIntents
                .Where(p => p.Status == PaymentStatus.Pending && p.Provider == PaymentProvider.SePay)
                .ToListAsync(ct);

            var content = (payload.Content ?? "").ToUpper();
            var descr = (payload.Description ?? "").ToUpper();
            var code = (payload.Code ?? "").ToUpper();
            var searchText = $"{content} {code} {descr}";

            var matched = pendings.FirstOrDefault(p =>
                p.Amount == payload.TransferAmount
                && searchText.Contains(p.OrderId.ToString()[..8].ToUpper()));
            matched ??= pendings.FirstOrDefault(p =>
                p.Amount == payload.TransferAmount
                && !string.IsNullOrEmpty(p.ClientSecret)
                && searchText.Contains(p.ClientSecret.ToUpper()));

            var result = await handler.ProcessAsync(
                provider: "SePay",
                transactionId: txnId,
                paymentIntentId: matched?.Id,
                success: matched != null,
                failureReason: matched == null ? "No matching pending payment" : null,
                ct: ct);
            return Results.Ok(new { success = result.Processed, idempotent = result.WasIdempotent });
        }).AllowAnonymous();
    }
}
