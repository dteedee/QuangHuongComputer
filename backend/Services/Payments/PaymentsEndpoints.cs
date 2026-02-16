using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Payments.Domain;
using Payments.Infrastructure;
using Payments.Infrastructure.VNPay;
using Payments.Infrastructure.SePay;
using System.Security.Claims;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;
using BuildingBlocks.Security;
using Microsoft.Extensions.Configuration;

namespace Payments;

public static class PaymentsEndpoints
{
    public static void MapPaymentsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/payments").RequireAuthorization();

        // Initiate payment with VNPay
        group.MapPost("/initiate", async (
            InitiatePaymentDto model, 
            PaymentsDbContext db, 
            ClaimsPrincipal user,
            IConfiguration config,
            HttpContext httpContext) =>
        {
            // Helper to get SePay Config
            async Task<SePayConfig> GetSePayConfig()
            {
                var apiKey = await db.PaymentConfigs.FindAsync("SePay:ApiKey");
                var accNum = await db.PaymentConfigs.FindAsync("SePay:AccountNumber");
                var bank = await db.PaymentConfigs.FindAsync("SePay:BankCode");

                return new SePayConfig
                {
                    ApiKey = apiKey?.Value ?? config["Payment:SePay:ApiKey"] ?? config["SePay:ApiKey"] ?? "",
                    AccountNumber = accNum?.Value ?? config["Payment:SePay:AccountNumber"] ?? config["SePay:AccountNumber"] ?? "0000000000",
                    BankCode = bank?.Value ?? config["Payment:SePay:BankCode"] ?? config["SePay:BankCode"] ?? "MB"
                };
            }
            var payment = PaymentIntent.Create(
                model.OrderId,
                model.Amount,
                "VND",
                model.Provider,
                Guid.NewGuid().ToString() // Idempotency Key
            );

            db.PaymentIntents.Add(payment);
            await db.SaveChangesAsync();

            // Generate VNPay payment URL
            string paymentUrl = "";
            if (model.Provider == PaymentProvider.VnPay)
            {
                // Get base URL for callback - backend handles VNPay callback
                var baseUrl = config["BaseUrl"] ?? $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";

                var vnpayConfig = new VNPayConfig
                {
                    TmnCode = config["Payment:VNPay:TmnCode"] ?? config["VNPay:TmnCode"] ?? "DEMO",
                    HashSecret = config["Payment:VNPay:HashSecret"] ?? config["VNPay:HashSecret"] ?? "DEMOSECRET",
                    PaymentUrl = config["Payment:VNPay:PaymentUrl"] ?? config["VNPay:PaymentUrl"] ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                    ReturnUrl = config["Payment:VNPay:ReturnUrl"] ?? config["VNPay:ReturnUrl"] ?? $"{baseUrl}/api/payments/vnpay/callback"
                };

                var vnpayService = new VNPayService(vnpayConfig);
                var vnpayRequest = new VNPayPaymentRequest
                {
                    TxnRef = payment.Id.ToString(),
                    Amount = model.Amount,
                    OrderInfo = $"Thanh toan don hang {model.OrderId}",
                    OrderType = "billpayment",
                    IpAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                    CreateDate = DateTime.Now,
                    Locale = "vn",
                    BankCode = model.BankCode
                };

                paymentUrl = vnpayService.CreatePaymentUrl(vnpayRequest);
                payment.SetExternalId($"VNPAY-{payment.Id}", "");
                await db.SaveChangesAsync();
            }
            else if (model.Provider == PaymentProvider.SePay)
            {
                var sepayConfig = await GetSePayConfig();
                
                var sepayService = new SePayService(sepayConfig);
                // Use Short Order ID for description: "Thanh toan {ShortOrderId}"
                string description = $"Thanh toan {model.OrderId.ToString().Substring(0, 8).ToUpper()}";
                
                paymentUrl = sepayService.CreatePaymentUrl(null, null, model.Amount, description);
                payment.SetExternalId($"SEPAY-{payment.Id}", description); // Use payment.Description for content
                await db.SaveChangesAsync();
            }
            else
            {
                // Mock for other providers
                payment.SetExternalId($"EXT-{Guid.NewGuid()}", $"secret_{Guid.NewGuid()}");
                await db.SaveChangesAsync();
                paymentUrl = $"/payment/mock/{payment.Id}";
            }

            return Results.Ok(new 
            { 
                PaymentId = payment.Id, 
                payment.ClientSecret,
                payment.Status,
                PaymentUrl = paymentUrl
            });
        });

        // VNPay callback endpoint (Public)
        app.MapGet("/api/payments/vnpay/callback", async (
            HttpContext httpContext,
            PaymentsDbContext db,
            IPublishEndpoint publishEndpoint,
            IConfiguration config) =>
        {
            var queryParams = httpContext.Request.Query.ToDictionary(x => x.Key, x => x.Value.ToString());

            var vnpayConfig = new VNPayConfig
            {
                TmnCode = config["Payment:VNPay:TmnCode"] ?? config["VNPay:TmnCode"] ?? "DEMO",
                HashSecret = config["Payment:VNPay:HashSecret"] ?? config["VNPay:HashSecret"] ?? "DEMOSECRET"
            };

            var vnpayService = new VNPayService(vnpayConfig);
            var response = vnpayService.ProcessCallback(queryParams);

            if (!response.IsValidSignature)
            {
                return Results.BadRequest(new { Error = "Invalid signature" });
            }

            var paymentId = Guid.Parse(response.TxnRef);
            var payment = await db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == paymentId);
            
            if (payment == null)
            {
                return Results.NotFound(new { Error = "Payment not found" });
            }

            if (response.Success)
            {
                payment.Succeed();
                payment.SetExternalId(response.TransactionNo, "");
                await publishEndpoint.Publish(new PaymentSucceededEvent(
                    payment.Id, 
                    payment.OrderId, 
                    payment.Amount, 
                    DateTime.UtcNow));
            }
            else
            {
                var errorMessage = GetVNPayErrorMessage(response.ResponseCode);
                payment.Fail(errorMessage);
                await publishEndpoint.Publish(new PaymentFailedEvent(
                    payment.Id, 
                    payment.OrderId, 
                    errorMessage, 
                    DateTime.UtcNow));
            }

            await db.SaveChangesAsync();

            // Redirect to frontend with result
            var frontendUrl = config["Frontend:Url"] ?? config["Cors:AllowedOrigins:0"] ?? "http://localhost:3000";
            var redirectUrl = response.Success 
                ? $"{frontendUrl}/payment/success?orderId={payment.OrderId}"
                : $"{frontendUrl}/payment/failed?orderId={payment.OrderId}&error={response.ResponseCode}";

            return Results.Redirect(redirectUrl);
        }).AllowAnonymous();

        // SePay Webhook Endpoint
        app.MapPost("/api/payments/sepay/webhook", async (
            SePayWebhookPayload payload,
            PaymentsDbContext db,
            IPublishEndpoint publishEndpoint,
            IConfiguration config,
            HttpRequest request) =>
        {
            var apiKey = await db.PaymentConfigs.FindAsync("SePay:ApiKey");
            var sepayConfig = new SePayConfig
            {
                ApiKey = apiKey?.Value ?? config["Payment:SePay:ApiKey"] ?? config["SePay:ApiKey"] ?? ""
            };
            var sepayService = new SePayService(sepayConfig);

            // Verify authentication
            string authHeader = request.Headers["Authorization"].ToString();
            if (!sepayService.VerifyWebhook(authHeader))
            {
                return Results.Unauthorized(); 
            }

            // 1. Log the incoming transaction (Audit Trail)
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
            await db.SaveChangesAsync(); // Save immediately

            // 2. Logic to match payment
            // Parse content to find OrderId
            // Expected format: "Thanh toan {ShortOrderId}" or similar
            // Best strategy: Search for Pending payments with SePay provider
            var pendingPayments = await db.PaymentIntents
                .Where(p => p.Status == PaymentStatus.Pending && p.Provider == PaymentProvider.SePay)
                .ToListAsync();

            // Find the payment where the payload content contains the tracking code we generated
            // We generated: "Thanh toan {OrderId_substring}" and stored it in ExternalId suffix or ClientSecret
            
            // NOTE: SePay content is user-entered, might be cleaner. 
            // We use the short OrderId to match.
            var matchedPayment = pendingPayments.FirstOrDefault(p => 
                payload.Content.Contains(p.OrderId.ToString().Substring(0, 8).ToUpper(), StringComparison.OrdinalIgnoreCase)
                && p.Amount <= payload.TransferAmount); // Check amount too (allowing overpayment)

            if (matchedPayment == null)
            {
                transaction.ProcessingError = "No matching pending payment found for content: " + payload.Content;
                await db.SaveChangesAsync();
                return Results.Ok(new { success = false, message = "No matching pending payment found" });
            }

            // Success!
            matchedPayment.Succeed();
            matchedPayment.SetExternalId($"SEPAY-{payload.Id}", payload.ReferenceCode); // Update with real SePay ID
            
            // Update transaction log
            transaction.IsProcessed = true;
            transaction.RelatedOrderId = matchedPayment.OrderId;
            
            await publishEndpoint.Publish(new PaymentSucceededEvent(
                matchedPayment.Id, 
                matchedPayment.OrderId, 
                matchedPayment.Amount, 
                DateTime.UtcNow));
            
            await db.SaveChangesAsync();

            return Results.Ok(new { success = true });
        }).AllowAnonymous();

        // ==================== ADMIN ENDPOINTS ====================
        var adminGroup = group.MapGroup("/admin").RequireAuthorization(Permissions.System.ManageConfig);

        // Get SePay Transactions
        adminGroup.MapGet("/sepay-transactions", async (PaymentsDbContext db) =>
        {
            var transactions = await db.SePayTransactions
                .OrderByDescending(t => t.TransactionDate)
                .Take(100)
                .ToListAsync();
            return Results.Ok(transactions);
        });
        
        // Get SePay Stats
        adminGroup.MapGet("/sepay-stats", async (PaymentsDbContext db) =>
        {
            var totalRevenue = await db.SePayTransactions
                .Where(t => t.TransferType == "in" && t.IsProcessed)
                .SumAsync(t => t.TransferAmount);
                
            var todayRevenue = await db.SePayTransactions
                .Where(t => t.TransferType == "in" && t.IsProcessed && t.TransactionDate.Date == DateTime.Today)
                .SumAsync(t => t.TransferAmount);

            var totalTransactions = await db.SePayTransactions.CountAsync();
            var successTransactions = await db.SePayTransactions.CountAsync(t => t.IsProcessed);
            
            return Results.Ok(new 
            {
                TotalRevenue = totalRevenue,
                TodayRevenue = todayRevenue,
                TotalTransactions = totalTransactions,
                SuccessRate = totalTransactions > 0 ? (successTransactions * 100.0 / totalTransactions) : 0
            });
        });

        // Get Payment Configs
        adminGroup.MapGet("/config", async (PaymentsDbContext db) =>
        {
            var configs = await db.PaymentConfigs.ToListAsync();
            // Mask secrets if needed? For now return as is for admin editing
            return Results.Ok(configs);
        });

        // Update Payment Config
        adminGroup.MapPost("/config", async (PaymentConfigDto model, PaymentsDbContext db) =>
        {
            var config = await db.PaymentConfigs.FindAsync(model.Key);
            if (config == null)
            {
                config = new PaymentConfig(model.Key);
                db.PaymentConfigs.Add(config);
            }
            
            config.Value = model.Value;
            config.Description = model.Description ?? "";
            config.IsSecret = model.IsSecret;
            config.UpdatedAt = DateTime.UtcNow;
            
            await db.SaveChangesAsync();
            return Results.Ok(config);
        });

        // Mock Webhook (for testing without VNPay)
        app.MapPost("/api/payments/webhook/mock", async (
            WebhookDto model, 
            PaymentsDbContext db, 
            IPublishEndpoint publishEndpoint) =>
        {
            var payment = await db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == model.PaymentId);
            if (payment == null) return Results.NotFound();

            if (model.Success)
            {
                payment.Succeed();
                await publishEndpoint.Publish(new PaymentSucceededEvent(
                    payment.Id, 
                    payment.OrderId, 
                    payment.Amount, 
                    DateTime.UtcNow));
            }
            else
            {
                payment.Fail("Webhook reported failure");
                await publishEndpoint.Publish(new PaymentFailedEvent(
                    payment.Id, 
                    payment.OrderId, 
                    "Webhook reported failure", 
                    DateTime.UtcNow));
            }

            await db.SaveChangesAsync();
            return Results.Ok();
        }).AllowAnonymous();

        // Get payment status
        group.MapGet("/{id:guid}", async (Guid id, PaymentsDbContext db) =>
        {
            var payment = await db.PaymentIntents.FindAsync(id);
            if (payment == null) return Results.NotFound();

            return Results.Ok(new
            {
                payment.Id,
                payment.OrderId,
                payment.Amount,
                payment.Currency,
                payment.Status,
                payment.Provider,
                payment.ExternalId,
                payment.CreatedAt
            });
        });
    }

    private static string GetVNPayErrorMessage(string responseCode)
    {
        return responseCode switch
        {
            "00" => "Giao dịch thành công",
            "07" => "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).",
            "09" => "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.",
            "10" => "Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần",
            "11" => "Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.",
            "12" => "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.",
            "13" => "Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).",
            "24" => "Giao dịch không thành công do: Khách hàng hủy giao dịch",
            "51" => "Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.",
            "65" => "Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.",
            "75" => "Ngân hàng thanh toán đang bảo trì.",
            "79" => "Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.",
            _ => $"Giao dịch thất bại (Mã lỗi: {responseCode})"
        };
    }
}

public record InitiatePaymentDto(Guid OrderId, decimal Amount, PaymentProvider Provider, string? BankCode = null);
public record WebhookDto(Guid PaymentId, bool Success);
public record PaymentConfigDto(string Key, string Value, string? Description, bool IsSecret);
