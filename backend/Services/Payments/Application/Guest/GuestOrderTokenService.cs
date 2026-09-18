using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Payments.Application.Webhooks;

namespace Payments.Application.Guest;

/// <summary>
/// Bước 11 của phase-22 — khách VÃNG LAI trả tiền đơn của mình mà không cần tài khoản.
///
/// Token là `base64url(orderId|expUnix).base64url(HMAC-SHA256)` — không phải JWT, không mang quyền,
/// không mở được bất cứ thứ gì ngoài ĐÚNG một đơn hàng, và hết hạn. Cố ý KHÔNG dùng khoá JWT của
/// hệ thống: lộ khoá thanh toán khách vãng lai không được phép đồng nghĩa với lộ phiên đăng nhập.
///
/// Khoá: `Payment:GuestToken:Secret`. Chưa cấu hình ⇒ <see cref="IsEnabled"/> = false ⇒ mọi route
/// khách vãng lai trả 503 (fail-closed), KHÔNG BAO GIỜ "bỏ qua kiểm tra".
/// </summary>
public sealed class GuestOrderTokenService
{
    public const string SecretKey = "Payment:GuestToken:Secret";

    private readonly string _secret;

    public GuestOrderTokenService(IConfiguration config)
    {
        _secret = WebhookSignature.IsConfiguredSecret(config[SecretKey]) ? config[SecretKey]!.Trim() : string.Empty;
    }

    public bool IsEnabled => _secret.Length > 0;

    /// <summary>Phát token cho một đơn. `ttl` mặc định 48h — đủ cho cửa sổ giữ đơn 24h của D04.</summary>
    public string Issue(Guid orderId, TimeSpan? ttl = null)
    {
        if (!IsEnabled) throw new InvalidOperationException($"{SecretKey} chưa được cấu hình");

        var exp = DateTimeOffset.UtcNow.Add(ttl ?? TimeSpan.FromHours(48)).ToUnixTimeSeconds();
        var payload = $"{orderId:N}|{exp.ToString(CultureInfo.InvariantCulture)}";
        return $"{Base64UrlEncode(Encoding.UTF8.GetBytes(payload))}.{Sign(payload)}";
    }

    /// <summary>Trả về orderId khi token hợp lệ VÀ chưa hết hạn; null trong mọi trường hợp khác.</summary>
    public Guid? Validate(string? token)
    {
        if (!IsEnabled || string.IsNullOrWhiteSpace(token)) return null;

        var parts = token.Trim().Split('.');
        if (parts.Length != 2) return null;

        string payload;
        try { payload = Encoding.UTF8.GetString(Base64UrlDecode(parts[0])); }
        catch (FormatException) { return null; }

        if (!WebhookSignature.FixedTimeEquals(Sign(payload), parts[1])) return null;

        var fields = payload.Split('|');
        if (fields.Length != 2) return null;
        if (!Guid.TryParseExact(fields[0], "N", out var orderId)) return null;
        if (!long.TryParse(fields[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var exp)) return null;
        if (DateTimeOffset.FromUnixTimeSeconds(exp) < DateTimeOffset.UtcNow) return null;

        return orderId;
    }

    private string Sign(string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_secret));
        return Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
    }

    // base64url thủ công: .NET 8 chưa có System.Buffers.Text.Base64Url (đó là API của .NET 9).
    private static string Base64UrlEncode(byte[] bytes)
        => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string value)
    {
        var s = value.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(s.PadRight(s.Length + (4 - s.Length % 4) % 4, '='));
    }
}
