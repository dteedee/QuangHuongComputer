using System.Net;
using Payments.Application.Webhooks;

namespace Payments.Application.Providers.VnPay;

/// <summary>
/// W2-21 (D04 mục 2 tier 2, [S8]/[S9]) — chữ ký HMAC-SHA512 của VNPay, một cài đặt DUY NHẤT.
///
/// VNPay có HAI dạng dữ liệu ký, không được nhầm:
///  1. **Dạng query** (tạo URL thanh toán, ReturnUrl, IPN): sắp xếp tham số `vnp_*` theo thứ tự
///     ordinal của TÊN khoá, bỏ giá trị rỗng, bỏ <c>vnp_SecureHash</c>/<c>vnp_SecureHashType</c>,
///     nối <c>key=value&amp;...</c> với key/value đã URL-encode, rồi HMAC-SHA512 bằng HashSecret.
///  2. **Dạng ống** (merchant_webapi `querydr`/`refund`): các trường nối bằng ký tự <c>|</c> theo
///     ĐÚNG thứ tự tài liệu, KHÔNG encode, KHÔNG sắp xếp.
///
/// Encode dùng <see cref="WebUtility.UrlEncode"/> (hex CHỮ HOA, khoảng trắng thành <c>+</c>) để khớp
/// mẫu chính thức của VNPay và <c>urlencode()</c> của PHP. <see cref="System.Web.HttpUtility"/> sinh
/// hex chữ THƯỜNG — cùng một tham số sẽ ra hash khác và mọi IPN thật sẽ bị từ chối 97.
///
/// Fail-closed: secret chưa cấu hình (rỗng/`${VAR}`/DEMO...) hoặc thiếu chữ ký ⇒ luôn false.
/// So sánh bằng <c>CryptographicOperations.FixedTimeEquals</c> (qua <see cref="WebhookSignature"/>).
/// </summary>
public static class VnPaySignature
{
    public const string HashField = "vnp_SecureHash";
    public const string HashTypeField = "vnp_SecureHashType";
    public const string FieldPrefix = "vnp_";

    /// <summary>Chuỗi ký dạng query — xem luật 1 ở phần mô tả lớp.</summary>
    public static string Canonicalize(IEnumerable<KeyValuePair<string, string?>> data)
    {
        var ordered = data
            .Where(kv => kv.Key.StartsWith(FieldPrefix, StringComparison.Ordinal))
            .Where(kv => !string.Equals(kv.Key, HashField, StringComparison.Ordinal))
            .Where(kv => !string.Equals(kv.Key, HashTypeField, StringComparison.Ordinal))
            .Where(kv => !string.IsNullOrEmpty(kv.Value))
            .OrderBy(kv => kv.Key, StringComparer.Ordinal);

        return string.Join('&', ordered.Select(kv =>
            $"{WebUtility.UrlEncode(kv.Key)}={WebUtility.UrlEncode(kv.Value)}"));
    }

    /// <summary>HMAC-SHA512 hex thường trên chuỗi ký dạng query.</summary>
    public static string Sign(string secret, IEnumerable<KeyValuePair<string, string?>> data)
        => WebhookSignature.HmacSha512Hex(secret, Canonicalize(data));

    /// <summary>
    /// Xác thực một callback/IPN. Trả false khi secret chưa cấu hình hoặc thiếu
    /// <c>vnp_SecureHash</c> — KHÔNG BAO GIỜ có nhánh "bỏ qua kiểm tra".
    /// </summary>
    public static bool Verify(
        string? secret, IEnumerable<KeyValuePair<string, string?>> data, string? providedHash)
    {
        if (!WebhookSignature.IsConfiguredSecret(secret)) return false;
        if (string.IsNullOrWhiteSpace(providedHash)) return false;
        return WebhookSignature.FixedTimeEqualsHex(Sign(secret!, data), providedHash);
    }

    /// <summary>Chuỗi ký dạng ống của merchant_webapi — thứ tự do người gọi quyết định.</summary>
    public static string SignPipe(string secret, params string?[] fields)
        => WebhookSignature.HmacSha512Hex(secret, string.Join('|', fields.Select(f => f ?? string.Empty)));

    /// <summary>Xác thực chữ ký phản hồi của merchant_webapi. Fail-closed như <see cref="Verify"/>.</summary>
    public static bool VerifyPipe(string? secret, string? providedHash, params string?[] fields)
    {
        if (!WebhookSignature.IsConfiguredSecret(secret)) return false;
        if (string.IsNullOrWhiteSpace(providedHash)) return false;
        return WebhookSignature.FixedTimeEqualsHex(SignPipe(secret!, fields), providedHash);
    }

    /// <summary>
    /// Lấy chữ ký từ tập tham số (VNPay gửi <c>vnp_SecureHash</c>; một số bản cũ dùng
    /// <c>vnp_SecureHashType=SHA512</c> kèm theo — trường đó không tham gia ký).
    /// </summary>
    public static string? ExtractHash(IReadOnlyDictionary<string, string?> data)
        => data.TryGetValue(HashField, out var h) ? h : null;
}
