using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Payments.Application.Webhooks;

/// <summary>
/// W0-10 (D04 R4/R4c) — helpers dùng chung cho MỌI webhook thanh toán/vận chuyển.
///
/// Luật fail-closed:
///  - Secret rỗng / placeholder (`${...}`, `DEMO*`, `changeme`, toàn số 0) = CHƯA cấu hình
///    → route webhook trả 503, KHÔNG BAO GIỜ coi là "bỏ qua kiểm tra".
///  - So sánh chữ ký luôn bằng <see cref="CryptographicOperations.FixedTimeEquals"/>.
///  - Không bao giờ log giá trị secret/chữ ký.
/// </summary>
public static class WebhookSignature
{
    /// <summary>Giá trị placeholder hay gặp trong appsettings/.env mẫu — coi như CHƯA cấu hình.</summary>
    private static readonly string[] PlaceholderPrefixes =
    {
        "DEMO", "CHANGEME", "CHANGE_ME", "YOUR_", "YOUR-", "XXX", "PLACEHOLDER", "TODO"
    };

    private static readonly string[] PlaceholderExact =
    {
        "SECRET", "KEY", "NULL", "NONE", "N/A", "TEST", "SANDBOX", "EXAMPLE"
    };

    /// <summary>
    /// true khi giá trị là một secret/khoá THẬT. Chuỗi rỗng, khoảng trắng, `${VAR}`,
    /// `DEMOSECRET`, `changeme`, `0000000000` đều trả false.
    /// </summary>
    public static bool IsConfiguredSecret(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;

        var v = value.Trim();

        // `${VNPAY_HASH_SECRET}` — biến môi trường chưa được thay thế.
        if (v.Contains("${", StringComparison.Ordinal)) return false;

        var upper = v.ToUpperInvariant();
        foreach (var p in PlaceholderPrefixes)
            if (upper.StartsWith(p, StringComparison.Ordinal)) return false;
        foreach (var e in PlaceholderExact)
            if (upper == e) return false;

        // Số tài khoản toàn số 0 / khoá toàn ký tự giống nhau.
        if (v.Length > 1 && v.All(c => c == v[0])) return false;

        return true;
    }

    /// <summary>So sánh 2 chuỗi theo thời gian hằng số. null/độ dài khác → false.</summary>
    public static bool FixedTimeEquals(string? a, string? b)
    {
        if (a is null || b is null) return false;
        var ba = Encoding.UTF8.GetBytes(a);
        var bb = Encoding.UTF8.GetBytes(b);
        if (ba.Length != bb.Length)
        {
            // Vẫn chạy một phép so sánh để giữ thời gian tương đối đều.
            CryptographicOperations.FixedTimeEquals(ba, ba);
            return false;
        }
        return CryptographicOperations.FixedTimeEquals(ba, bb);
    }

    /// <summary>So sánh 2 chuỗi hex (không phân biệt hoa/thường) theo thời gian hằng số.</summary>
    public static bool FixedTimeEqualsHex(string? a, string? b)
    {
        if (a is null || b is null) return false;
        return FixedTimeEquals(a.Trim().ToLowerInvariant(), b.Trim().ToLowerInvariant());
    }

    /// <summary>HMAC-SHA256 hex thường của chuỗi UTF-8.</summary>
    public static string HmacSha256Hex(string key, string data)
        => HmacSha256Hex(key, Encoding.UTF8.GetBytes(data));

    /// <summary>HMAC-SHA256 hex thường trên BYTES GỐC (bắt buộc cho SePay — D04 R4c).</summary>
    public static string HmacSha256Hex(string key, byte[] data)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        return Convert.ToHexString(hmac.ComputeHash(data)).ToLowerInvariant();
    }

    /// <summary>HMAC-SHA512 hex thường (VNPay).</summary>
    public static string HmacSha512Hex(string key, string data)
    {
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(key));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(data))).ToLowerInvariant();
    }

    /// <summary>
    /// Kiểm timestamp webhook nằm trong cửa sổ ±<paramref name="windowSeconds"/> (chống replay).
    /// Chấp nhận unix giây, unix mili-giây, hoặc ISO-8601.
    /// </summary>
    public static bool IsFreshTimestamp(string? raw, DateTimeOffset now, int windowSeconds = 300)
    {
        if (string.IsNullOrWhiteSpace(raw)) return false;
        var v = raw.Trim();

        DateTimeOffset ts;
        if (long.TryParse(v, NumberStyles.Integer, CultureInfo.InvariantCulture, out var num))
        {
            // >= 10^12 → mili-giây; ngược lại giây.
            ts = num >= 1_000_000_000_000L
                ? DateTimeOffset.FromUnixTimeMilliseconds(num)
                : DateTimeOffset.FromUnixTimeSeconds(num);
        }
        else if (!DateTimeOffset.TryParse(v, CultureInfo.InvariantCulture,
                     DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out ts))
        {
            return false;
        }

        return Math.Abs((now - ts).TotalSeconds) <= windowSeconds;
    }

    /// <summary>
    /// Tách token khỏi header `Authorization: &lt;scheme&gt; &lt;token&gt;`.
    /// Trả null nếu scheme không khớp (so sánh không phân biệt hoa/thường theo RFC 7235).
    /// </summary>
    public static string? ExtractAuthToken(string? header, string scheme)
    {
        if (string.IsNullOrWhiteSpace(header)) return null;
        var h = header.Trim();
        if (!h.StartsWith(scheme, StringComparison.OrdinalIgnoreCase)) return null;
        var rest = h[scheme.Length..];
        if (rest.Length == 0 || !char.IsWhiteSpace(rest[0])) return null;
        var token = rest.TrimStart();
        return token.Length == 0 ? null : token;
    }
}
