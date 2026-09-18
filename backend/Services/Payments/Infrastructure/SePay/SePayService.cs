using Payments.Application.Webhooks;

namespace Payments.Infrastructure.SePay;

public class SePayConfig
{
    public string AccountNumber { get; set; } = string.Empty;
    public string BankCode { get; set; } = string.Empty;

    /// <summary>Secret HMAC-SHA256 (ưu tiên) — header `X-SePay-Signature: sha256=&lt;hex&gt;`.</summary>
    public string WebhookSecret { get; set; } = string.Empty;

    /// <summary>API key — header `Authorization: Apikey &lt;KEY&gt;` (KHÔNG phải Bearer).</summary>
    public string ApiKey { get; set; } = string.Empty;
}

public class SePayWebhookPayload
{
    public long Id { get; set; }                                  // SePay transaction ID
    public string Gateway { get; set; } = string.Empty;           // ví dụ "MBBank"
    public string TransactionDate { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? SubAccount { get; set; }
    public string Content { get; set; } = string.Empty;           // nội dung chuyển khoản
    public string TransferType { get; set; } = string.Empty;      // "in" | "out"
    public decimal TransferAmount { get; set; }
    public decimal Accumulated { get; set; }
    public string? Code { get; set; }
    public string? ReferenceCode { get; set; }
    public string? Description { get; set; }
}

/// <summary>Header cần để xác thực webhook SePay.</summary>
public readonly record struct SePayWebhookHeaders(string? Authorization, string? Signature, string? Timestamp);

public enum SePayVerifyResult
{
    /// <summary>Chữ ký/API key hợp lệ.</summary>
    Valid,

    /// <summary>Chưa có secret nào được cấu hình ⇒ endpoint PHẢI trả 503 (KHÔNG được nhận webhook).</summary>
    NotConfigured,

    /// <summary>Thiếu header xác thực hoặc chữ ký sai/hết hạn ⇒ 401.</summary>
    Invalid
}

public class SePayService
{
    /// <summary>Cửa sổ chấp nhận cho `X-SePay-Timestamp` (tài liệu SePay: ±300s).</summary>
    public const int TimestampWindowSeconds = 300;

    private readonly SePayConfig _config;

    public SePayService(SePayConfig config)
    {
        _config = config;
    }

    // W2-4: `CreatePaymentUrl` đã bị XOÁ. Nó dựng `https://qr.sepay.vn/img?acc=…&amount=…&des=…`,
    // tức là đẩy số tài khoản, số tiền và nội dung chuyển khoản của từng khách sang máy chủ bên thứ
    // ba mỗi lần mở màn thanh toán. Mã QR bây giờ do
    // `Application/Providers/BankTransfer/VietQrPayloadBuilder` + `Endpoints/PaymentQrImageService`
    // tự dựng và tự vẽ trong tiến trình. Phương thức cũ không còn người gọi nào; giữ lại chỉ là để
    // sẵn một khẩu súng đã lên đạn cho lần sửa sau.

    /// <summary>
    /// W0-10 / D04 R4c — xác thực webhook SePay FAIL-CLOSED.
    ///
    /// Trước đây: `if (string.IsNullOrEmpty(ApiKey)) return true;` (khoá rỗng = nhận MỌI webhook)
    /// và `authHeader.Contains(key)` (khớp chuỗi con). Cả hai đã bị xoá.
    ///
    /// Bây giờ, theo đúng tài liệu hãng:
    ///  - HMAC-SHA256 trên `{timestamp}.{raw body BYTES GỐC}`, header `X-SePay-Signature: sha256=&lt;hex&gt;`,
    ///    kèm `X-SePay-Timestamp` trong ±300s; hoặc
    ///  - `Authorization: Apikey &lt;KEY&gt;` khớp CHÍNH XÁC (không phải Bearer, không phải Contains).
    ///  - Mọi so sánh bằng CryptographicOperations.FixedTimeEquals.
    /// </summary>
    public SePayVerifyResult VerifyWebhook(SePayWebhookHeaders headers, byte[] rawBody, DateTimeOffset now)
    {
        var hasHmac = WebhookSignature.IsConfiguredSecret(_config.WebhookSecret);
        var hasApiKey = WebhookSignature.IsConfiguredSecret(_config.ApiKey);

        if (!hasHmac && !hasApiKey) return SePayVerifyResult.NotConfigured;

        if (hasHmac && !string.IsNullOrWhiteSpace(headers.Signature))
        {
            if (!WebhookSignature.IsFreshTimestamp(headers.Timestamp, now, TimestampWindowSeconds))
                return SePayVerifyResult.Invalid;

            var received = headers.Signature!.Trim();
            const string prefix = "sha256=";
            if (received.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                received = received[prefix.Length..];

            // Ký trên CHUỖI GỐC: "{timestamp}." + bytes body, không phải body đã parse/serialize lại.
            var signedPayload = BuildSignedPayload(headers.Timestamp!.Trim(), rawBody);
            var expected = WebhookSignature.HmacSha256Hex(_config.WebhookSecret, signedPayload);

            return WebhookSignature.FixedTimeEqualsHex(expected, received)
                ? SePayVerifyResult.Valid
                : SePayVerifyResult.Invalid;
        }

        if (hasApiKey)
        {
            var token = WebhookSignature.ExtractAuthToken(headers.Authorization, "Apikey");
            return token is not null && WebhookSignature.FixedTimeEquals(_config.ApiKey.Trim(), token)
                ? SePayVerifyResult.Valid
                : SePayVerifyResult.Invalid;
        }

        return SePayVerifyResult.Invalid;
    }

    /// <summary>`{timestamp}.` + bytes gốc của body (D04 R4c).</summary>
    public static byte[] BuildSignedPayload(string timestamp, byte[] rawBody)
    {
        var prefix = System.Text.Encoding.UTF8.GetBytes(timestamp + ".");
        var buffer = new byte[prefix.Length + rawBody.Length];
        Buffer.BlockCopy(prefix, 0, buffer, 0, prefix.Length);
        Buffer.BlockCopy(rawBody, 0, buffer, prefix.Length, rawBody.Length);
        return buffer;
    }
}
