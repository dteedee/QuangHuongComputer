using System.Security.Cryptography;
using System.Text;
using Payments.Domain;

namespace IntegrationTests.Infrastructure;

/// <summary>
/// Dựng body + chữ ký webhook SePay đúng như cổng thật ký (D04): HMAC-SHA256 trên
/// chuỗi "{timestamp}." + BYTES GỐC của body.
/// </summary>
public static class SePayWebhookRequests
{
    public const string Url = "/api/payments/v2/sepay/webhook";

    public static string RandomTransactionId() =>
        Random.Shared.NextInt64(1_000_000, long.MaxValue).ToString();

    /// <summary>Nội dung chuyển khoản mang 8 ký tự đầu của mã đơn — đúng cách SePayPaymentMatcher dò.</summary>
    public static string BuildBody(string transactionId, PaymentIntent intent)
    {
        var code = intent.OrderId.ToString("N")[..8].ToUpperInvariant();
        var amount = decimal.ToInt64(intent.Amount);
        return "{" +
               $"\"id\":{transactionId}," +
               "\"gateway\":\"MBBank\"," +
               $"\"transactionDate\":\"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}\"," +
               "\"accountNumber\":\"0123456789\"," +
               $"\"content\":\"CK {code} thanh toan don hang\"," +
               "\"transferType\":\"in\"," +
               $"\"transferAmount\":{amount}," +
               $"\"accumulated\":{amount}," +
               $"\"code\":\"{code}\"," +
               $"\"referenceCode\":\"REF{transactionId}\"," +
               "\"description\":\"test\"" +
               "}";
    }

    public static HttpRequestMessage SignedRequest(string body, DateTimeOffset timestamp)
    {
        var unix = timestamp.ToUnixTimeSeconds().ToString();
        var payload = Encoding.UTF8.GetBytes(unix + "." + body);
        var signature = Convert.ToHexString(
                HMACSHA256.HashData(Encoding.UTF8.GetBytes(IntegrationTestConfiguration.SePayWebhookSecret), payload))
            .ToLowerInvariant();

        var request = new HttpRequestMessage(HttpMethod.Post, Url)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.Add("X-SePay-Timestamp", unix);
        request.Headers.Add("X-SePay-Signature", "sha256=" + signature);
        return request;
    }
}
