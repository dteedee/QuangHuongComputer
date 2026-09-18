using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Payments.Application;
using Payments.Application.Configuration;
using Payments.Domain;
using Payments.Infrastructure;
using Payments.Infrastructure.SePay;

namespace Payments.Webhooks;

/// <summary>
/// W0-10 (D04 R4c) — webhook SePay, xác thực trên RAW BODY.
///
/// SePay ký `{timestamp}.{bytes gốc của body}`. Nếu minimal API bind sẵn một DTO thì raw body đã
/// bị parse mất và chữ ký sẽ LUÔN lệch ⇒ tự động xác nhận chết âm thầm. Vì vậy ở đây:
/// EnableBuffering → đọc bytes → tính HMAC → mới deserialize thủ công.
///
/// Fail-closed: chưa có `WebhookSecret`/`ApiKey` → 503; chữ ký/API key sai hoặc timestamp ngoài
/// ±300s → 401. Chỉ nhận `transferType = "in"`. Trả 200 `{"success":true}` khi đã ghi nhận
/// (SePay retry tới 7 lần trong 5h nếu không nhận được 200/201).
/// </summary>
public static class SePayWebhookEndpoint
{
    public static void MapSePayWebhook(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/payments/v2/sepay/webhook", async (
            HttpContext ctx,
            PaymentWebhookHandler handler,
            PaymentConfigGuard guard,
            PaymentsDbContext db,
            ILoggerFactory lf,
            CancellationToken ct) =>
        {
            var logger = lf.CreateLogger("SePayWebhook");

            var sepayConfig = new SePayConfig
            {
                WebhookSecret = guard.GetValueOrEmpty("Payment:SePay:WebhookSecret"),
                ApiKey = guard.GetValueOrEmpty("Payment:SePay:ApiKey")
            };

            // 1) RAW BODY trước khi bất cứ thứ gì parse nó.
            ctx.Request.EnableBuffering();
            byte[] rawBody;
            using (var ms = new MemoryStream())
            {
                await ctx.Request.Body.CopyToAsync(ms, ct);
                rawBody = ms.ToArray();
            }
            ctx.Request.Body.Position = 0;

            // 2) Xác thực.
            var headers = new SePayWebhookHeaders(
                Authorization: ctx.Request.Headers["Authorization"].ToString(),
                Signature: ctx.Request.Headers["X-SePay-Signature"].ToString(),
                Timestamp: ctx.Request.Headers["X-SePay-Timestamp"].ToString());

            var verdict = new SePayService(sepayConfig).VerifyWebhook(headers, rawBody, DateTimeOffset.UtcNow);
            if (verdict == SePayVerifyResult.NotConfigured)
            {
                logger.LogError("SePay webhook bị gọi nhưng Payment:SePay:{{WebhookSecret,ApiKey}} CHƯA cấu hình — từ chối 503");
                return Results.Json(
                    new { success = false, error = "PAYMENT_GATEWAY_NOT_CONFIGURED" },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }
            if (verdict != SePayVerifyResult.Valid)
            {
                logger.LogWarning("SePay: xác thực webhook thất bại — từ chối 401");
                return Results.Json(new { success = false, error = "INVALID_SIGNATURE" },
                    statusCode: StatusCodes.Status401Unauthorized);
            }

            // 3) Chỉ SAU khi chữ ký hợp lệ mới deserialize.
            SePayWebhookPayload? payload;
            try
            {
                payload = JsonSerializer.Deserialize<SePayWebhookPayload>(
                    Encoding.UTF8.GetString(rawBody),
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (JsonException) { return Results.BadRequest(new { success = false, error = "INVALID_JSON" }); }
            if (payload is null || payload.Id == 0)
                return Results.BadRequest(new { success = false, error = "INVALID_PAYLOAD" });

            // 4) Audit trail (giữ từ route v1 đã xoá — trang admin đọc bảng này).
            var transaction = new SePayTransaction
            {
                Gateway = payload.Gateway,
                TransactionDate = DateTime.TryParse(payload.TransactionDate, out var d) ? d : DateTime.UtcNow,
                AccountNumber = payload.AccountNumber,
                SubAccount = payload.SubAccount,
                Content = payload.Content,
                TransferType = payload.TransferType,
                TransferAmount = payload.TransferAmount,
                Accumulated = payload.Accumulated,
                Code = payload.Code,
                ReferenceCode = payload.ReferenceCode,
                Description = payload.Description,
                IsProcessed = false,
                IsActive = true
            };
            db.SePayTransactions.Add(transaction);
            await db.SaveChangesAsync(ct);

            // 5) Chỉ tiền VÀO mới xác nhận đơn.
            if (!string.Equals(payload.TransferType, "in", StringComparison.OrdinalIgnoreCase))
            {
                transaction.ProcessingError = $"Bỏ qua: transferType={payload.TransferType}";
                await db.SaveChangesAsync(ct);
                return Results.Ok(new { success = true, matched = false });
            }

            var pendings = await db.PaymentIntents
                .Where(p => p.Status == PaymentStatus.Pending && p.Provider == PaymentProvider.SePay)
                .ToListAsync(ct);

            var matched = SePayPaymentMatcher.Match(
                pendings, payload.TransferAmount, payload.Content, payload.Code, payload.Description);

            if (matched is null)
            {
                transaction.ProcessingError =
                    $"Chưa gán: không khớp mã thanh toán + số tiền {payload.TransferAmount}. Pending: {pendings.Count}";
                await db.SaveChangesAsync(ct);
                logger.LogWarning("SePay: giao dịch {TxnId} chưa gán được đơn (số tiền {Amount})",
                    payload.Id, payload.TransferAmount);
                // 200 để SePay ngừng retry — khoản tiền đã được ghi nhận, kế toán gán tay.
                return Results.Ok(new { success = true, matched = false });
            }

            var result = await handler.ProcessAsync(
                provider: "SePay",
                transactionId: payload.Id.ToString(),
                paymentIntentId: matched.Id,
                success: true,
                failureReason: null,
                gatewayAmount: payload.TransferAmount,
                ct: ct);

            transaction.IsProcessed = result.Processed;
            transaction.RelatedOrderId = matched.OrderId;
            if (result.AmountMismatch) transaction.ProcessingError = "Lệch số tiền — chờ đối soát";
            await db.SaveChangesAsync(ct);

            return Results.Ok(new { success = true, matched = result.Processed, idempotent = result.WasIdempotent });
        }).AllowAnonymous();
    }
}
