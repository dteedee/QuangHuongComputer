using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Payments.Application.Configuration;
using Payments.Domain;
using Payments.Infrastructure.MoMo;
using Payments.Infrastructure.SePay;
using Payments.Infrastructure.VNPay;

namespace Payments.Endpoints;

/// <summary>
/// W0-10 — sinh URL thanh toán cho MỘT provider đã được <see cref="PaymentConfigGuard"/> xác nhận
/// là có đủ khoá THẬT. Tách khỏi <see cref="PaymentInitiateEndpoint"/> để giữ mỗi file dưới 200 dòng.
/// </summary>
internal static class PaymentUrlBuilder
{
    /// <summary>
    /// Sinh URL thanh toán cho provider ĐÃ được <see cref="PaymentConfigGuard"/> xác nhận là có đủ khoá
    /// thật. Không còn fallback `?? "DEMO"` / `?? "DEMOSECRET"` / `?? "MOMO"` / `?? "0000000000"` /
    /// `?? "MB"`, và không còn nhánh `else` trả URL mock.
    /// </summary>
    public static async Task<string> BuildAsync(
        InitiatePaymentDto model,
        PaymentIntent payment,
        decimal amount,
        PaymentConfigGuard guard,
        IConfiguration config,
        HttpContext httpContext)
    {
        var baseUrl = config["BaseUrl"] ?? $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
        var frontendUrl = config["Frontend:Url"] ?? config["Cors:AllowedOrigins:0"] ?? "http://localhost:3000";

        switch (model.Provider)
        {
            case PaymentProvider.COD:
                payment.SetExternalId($"COD-{payment.Id}", null);
                return "";

            case PaymentProvider.SePay:
            {
                var sepay = new SePayService(new SePayConfig
                {
                    AccountNumber = guard.GetValueOrEmpty("Payment:SePay:AccountNumber"),
                    BankCode = guard.GetValueOrEmpty("Payment:SePay:BankCode")
                });
                var code = $"Thanh toan {payment.OrderId.ToString("N")[..8].ToUpperInvariant()}";
                payment.SetExternalId($"SEPAY-{payment.Id}", code);
                return sepay.CreatePaymentUrl(null, null, amount, code);
            }

            case PaymentProvider.VnPay:
            {
                var vnpay = new VNPayService(new VNPayConfig
                {
                    TmnCode = guard.GetValueOrEmpty("Payment:VNPay:TmnCode"),
                    HashSecret = guard.GetValueOrEmpty("Payment:VNPay:HashSecret"),
                    PaymentUrl = config["Payment:VNPay:PaymentUrl"] ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                    ReturnUrl = config["Payment:VNPay:ReturnUrl"] ?? $"{baseUrl}/api/payments/v2/vnpay/callback"
                });
                payment.SetExternalId($"VNPAY-{payment.Id}", null);
                return vnpay.CreatePaymentUrl(new VNPayPaymentRequest
                {
                    TxnRef = payment.Id.ToString(),
                    Amount = amount,
                    OrderInfo = $"Thanh toan don hang {payment.OrderId}",
                    OrderType = "billpayment",
                    IpAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                    CreateDate = DateTime.Now,
                    Locale = "vn",
                    BankCode = model.BankCode
                });
            }

            case PaymentProvider.Momo:
            {
                var momo = new MoMoService(new MoMoConfig
                {
                    PartnerCode = guard.GetValueOrEmpty("Payment:MoMo:PartnerCode"),
                    AccessKey = guard.GetValueOrEmpty("Payment:MoMo:AccessKey"),
                    SecretKey = guard.GetValueOrEmpty("Payment:MoMo:SecretKey"),
                    Endpoint = config["Payment:MoMo:Endpoint"] ?? "https://test-payment.momo.vn/v2/gateway/api/create",
                    ReturnUrl = config["Payment:MoMo:ReturnUrl"] ?? $"{frontendUrl}/payment/callback?provider=momo",
                    IpnUrl = config["Payment:MoMo:IpnUrl"] ?? $"{baseUrl}/api/payments/v2/momo/callback"
                }, new HttpClient());

                var result = await momo.CreatePayment(amount, payment.Id.ToString(), $"Thanh toan don hang {payment.OrderId}");
                if (result.ResultCode != 0)
                {
                    payment.Fail(result.Message);
                    return "";
                }
                payment.SetExternalId($"MOMO-{payment.Id}", null);
                return result.PayUrl;
            }

            default:
                // Không thể tới đây: PaymentConfigGuard đã chặn mọi provider không có spec.
                throw new InvalidOperationException($"Provider {model.Provider} không được hỗ trợ");
        }
    }
}
