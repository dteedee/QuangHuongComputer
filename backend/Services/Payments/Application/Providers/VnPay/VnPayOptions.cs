using System.Globalization;
using BuildingBlocks.Time;
using Microsoft.Extensions.Configuration;
using Payments.Application.Configuration;

namespace Payments.Application.Providers.VnPay;

/// <summary>
/// W2-21 — cấu hình VNPay đọc từ MÔI TRƯỜNG (D04 R5: repo công khai, secret không nằm trong repo,
/// không lưu DB, không API nào trả ra).
///
/// `TmnCode`/`HashSecret` đi qua <see cref="PaymentConfigGuard.TryGetValue"/> nên một giá trị
/// placeholder (`${VNPAY_HASH_SECRET}`, `DEMOSECRET`, chuỗi rỗng) được coi là CHƯA cấu hình:
/// <see cref="IsConfigured"/> = false ⇒ provider vắng mặt trong `/methods`, `/initiate` trả 400,
/// route IPN trả 503. Không có đường thành công giả.
///
/// Endpoint mặc định là SANDBOX. <see cref="PaymentConfigGuard"/> chặn host sandbox trên Production
/// trừ khi `Payment:AllowSandbox=true` (D04 R3), nên mặc định này an toàn.
/// </summary>
public sealed class VnPayOptions
{
    public const string Section = "Payment:VNPay";
    public const string TmnCodeKey = Section + ":TmnCode";
    public const string HashSecretKey = Section + ":HashSecret";
    public const string PaymentUrlKey = Section + ":PaymentUrl";
    public const string ApiUrlKey = Section + ":ApiUrl";
    public const string VersionKey = Section + ":Version";
    public const string LocaleKey = Section + ":Locale";
    public const string ExpireMinutesKey = Section + ":ExpireMinutes";
    public const string QueryAfterMinutesKey = Section + ":QueryAfterMinutes";
    public const string PublicBaseUrlKey = Section + ":PublicBaseUrl";

    public const string DefaultPaymentUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    public const string DefaultApiUrl = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";
    public const string DefaultVersion = "2.1.0";

    /// <summary>IPN của VNPay là **GET** và URL bắt buộc HTTPS ([S8]) — khai báo đúng chuỗi này với VNPay.</summary>
    public const string IpnPath = "/api/payments/v2/vnpay/ipn";

    /// <summary>ReturnUrl trình duyệt. Chỉ verify rồi redirect, KHÔNG BAO GIỜ ghi trạng thái.</summary>
    public const string ReturnPath = "/api/payments/v2/vnpay/return";

    /// <summary>Múi giờ mọi mốc `vnp_*Date` của VNPay (giờ Việt Nam, không DST).</summary>
    public static readonly TimeZoneInfo VnTimeZone = new SystemBusinessClock().TimeZone;

    private VnPayOptions(
        string tmnCode, string hashSecret, string paymentUrl, string apiUrl,
        string version, string locale, int expireMinutes, int queryAfterMinutes, string? publicBaseUrl)
    {
        TmnCode = tmnCode;
        HashSecret = hashSecret;
        PaymentUrl = paymentUrl;
        ApiUrl = apiUrl;
        Version = version;
        Locale = locale;
        ExpireMinutes = expireMinutes;
        QueryAfterMinutes = queryAfterMinutes;
        PublicBaseUrl = publicBaseUrl;
    }

    public string TmnCode { get; }

    /// <summary>KHÔNG BAO GIỜ log, KHÔNG BAO GIỜ trả ra API.</summary>
    public string HashSecret { get; }

    public string PaymentUrl { get; }
    public string ApiUrl { get; }
    public string Version { get; }
    public string Locale { get; }

    /// <summary>`vnp_ExpireDate` — mặc định 15 phút theo VNPay.</summary>
    public int ExpireMinutes { get; }

    /// <summary>Intent còn Pending quá số phút này thì job đối soát hỏi `querydr` (D04: 20 phút).</summary>
    public int QueryAfterMinutes { get; }

    /// <summary>Base URL HTTPS công khai để dựng ReturnUrl khi request đến qua reverse proxy.</summary>
    public string? PublicBaseUrl { get; }

    public bool IsConfigured =>
        !string.IsNullOrEmpty(TmnCode) && !string.IsNullOrEmpty(HashSecret) && !string.IsNullOrEmpty(PaymentUrl);

    public static VnPayOptions From(IConfiguration config, PaymentConfigGuard guard) => new(
        tmnCode: guard.GetValueOrEmpty(TmnCodeKey),
        hashSecret: guard.GetValueOrEmpty(HashSecretKey),
        paymentUrl: ReadUrl(config, PaymentUrlKey, DefaultPaymentUrl),
        apiUrl: ReadUrl(config, ApiUrlKey, DefaultApiUrl),
        version: ReadText(config, VersionKey, DefaultVersion),
        locale: ReadText(config, LocaleKey, "vn"),
        expireMinutes: ReadInt(config, ExpireMinutesKey, 15, 5, 1440),
        queryAfterMinutes: ReadInt(config, QueryAfterMinutesKey, 20, 5, 1440),
        publicBaseUrl: ReadOptionalUrl(config, PublicBaseUrlKey));

    /// <summary>Dựng options tường minh — dùng cho unit test, không đọc cấu hình.</summary>
    public static VnPayOptions ForTesting(
        string tmnCode, string hashSecret,
        string? paymentUrl = null, string? apiUrl = null, int expireMinutes = 15) => new(
        tmnCode, hashSecret, paymentUrl ?? DefaultPaymentUrl, apiUrl ?? DefaultApiUrl,
        DefaultVersion, "vn", expireMinutes, 20, null);

    /// <summary>URL tuyệt đối để khai báo với VNPay. Trống khi chưa biết base URL công khai.</summary>
    public string IpnUrl(string? baseUrl) => Combine(PublicBaseUrl ?? baseUrl, IpnPath);

    public string ReturnUrl(string? baseUrl) => Combine(PublicBaseUrl ?? baseUrl, ReturnPath);

    private static string Combine(string? baseUrl, string path)
        => string.IsNullOrWhiteSpace(baseUrl) ? path : $"{baseUrl.TrimEnd('/')}{path}";

    private static string ReadText(IConfiguration config, string key, string fallback)
    {
        var raw = config[key];
        return string.IsNullOrWhiteSpace(raw) || raw.Contains("${", StringComparison.Ordinal)
            ? fallback
            : raw.Trim();
    }

    private static string ReadUrl(IConfiguration config, string key, string fallback)
    {
        var value = ReadText(config, key, fallback);
        return Uri.TryCreate(value, UriKind.Absolute, out _) ? value : fallback;
    }

    private static string? ReadOptionalUrl(IConfiguration config, string key)
    {
        var raw = config[key];
        if (string.IsNullOrWhiteSpace(raw) || raw.Contains("${", StringComparison.Ordinal)) return null;
        var value = raw.Trim();
        return Uri.TryCreate(value, UriKind.Absolute, out _) ? value : null;
    }

    private static int ReadInt(IConfiguration config, string key, int fallback, int min, int max)
    {
        var raw = config[key];
        if (string.IsNullOrWhiteSpace(raw)
            || !int.TryParse(raw.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
            return fallback;
        return Math.Clamp(parsed, min, max);
    }
}
