using System.Globalization;
using System.Net;
using System.Text;

namespace Payments.Application.Providers.VnPay;

/// <summary>
/// W2-21 bước 2 — dựng URL `vpcpay.html` cho một intent ĐÃ tạo. Hàm thuần: cùng đầu vào ⇒ cùng URL,
/// nên test không cần mạng.
///
/// `vnp_TxnRef` = 32 ký tự hex của intent id + 12 ký tự `yyMMddHHmmss` giờ VN lúc tạo:
///  - VNPay yêu cầu `vnp_TxnRef` KHÔNG trùng trong ngày, mà một đơn có thể thử lại nhiều lần
///    trên cùng một intent ⇒ phần thời gian là bắt buộc;
///  - 32 ký tự đầu luôn khôi phục được intent id (<see cref="TryParseIntentId"/>), nên IPN không
///    cần bảng tra nào;
///  - 12 ký tự cuối chính là `vnp_CreateDate` đã gửi ⇒ `querydr` lấy lại `vnp_TransactionDate`
///    chính xác mà không phải đoán (<see cref="TryParseCreateDate"/>).
/// </summary>
public static class VnPayPaymentUrlBuilder
{
    /// <summary>Số ký tự đầu của `vnp_TxnRef` mang intent id (Guid "N").</summary>
    public const int IntentIdLength = 32;

    private const string DateFormat = "yyyyMMddHHmmss";
    private const string TxnRefDateFormat = "yyMMddHHmmss";

    public static VnPayPaymentUrl Build(VnPayOptions options, PaymentCreationContext context, DateTimeOffset nowUtc)
    {
        if (!options.IsConfigured)
            throw new InvalidOperationException("VNPay chưa được cấu hình (thiếu TmnCode/HashSecret).");
        if (context.Amount <= 0)
            throw new InvalidOperationException("Số tiền thanh toán phải lớn hơn 0.");

        var nowVn = TimeZoneInfo.ConvertTime(nowUtc, VnPayOptions.VnTimeZone).DateTime;
        var expireVn = nowVn.AddMinutes(options.ExpireMinutes);
        var txnRef = BuildTxnRef(context.Intent.Id, nowVn);

        // vnp_Amount tính theo đơn vị nhỏ nhất (x100). VND là số nguyên (D01) nên không mất đồng nào.
        var amountUnits = (long)Math.Round(context.Amount * 100m, MidpointRounding.AwayFromZero);

        var fields = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["vnp_Version"] = options.Version,
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = options.TmnCode,
            ["vnp_Amount"] = amountUnits.ToString(CultureInfo.InvariantCulture),
            ["vnp_CreateDate"] = nowVn.ToString(DateFormat, CultureInfo.InvariantCulture),
            ["vnp_ExpireDate"] = expireVn.ToString(DateFormat, CultureInfo.InvariantCulture),
            ["vnp_CurrCode"] = "VND",
            ["vnp_IpAddr"] = NormalizeIp(context.ClientIpAddress),
            ["vnp_Locale"] = options.Locale,
            ["vnp_OrderInfo"] = BuildOrderInfo(context.OrderReference),
            ["vnp_OrderType"] = "other",
            ["vnp_ReturnUrl"] = options.ReturnUrl(context.BaseUrl),
            ["vnp_TxnRef"] = txnRef
        };

        // Khách đã chọn sẵn ngân hàng ở storefront thì bỏ qua màn chọn cổng của VNPay.
        if (!string.IsNullOrWhiteSpace(context.BankCode))
            fields["vnp_BankCode"] = context.BankCode.Trim().ToUpperInvariant();

        var query = VnPaySignature.Canonicalize(fields);
        var hash = VnPaySignature.Sign(options.HashSecret, fields);

        return new VnPayPaymentUrl(
            Url: $"{options.PaymentUrl}?{query}&{VnPaySignature.HashField}={hash}",
            TxnRef: txnRef,
            CreateDateVn: nowVn,
            ExpiresAtUtc: TimeZoneInfo.ConvertTimeToUtc(
                DateTime.SpecifyKind(expireVn, DateTimeKind.Unspecified), VnPayOptions.VnTimeZone));
    }

    public static string BuildTxnRef(Guid intentId, DateTime createdAtVn)
        => intentId.ToString("N") + createdAtVn.ToString(TxnRefDateFormat, CultureInfo.InvariantCulture);

    /// <summary>32 ký tự đầu của `vnp_TxnRef` ⇒ intent id. Sai định dạng ⇒ false (IPN trả RspCode 01).</summary>
    public static bool TryParseIntentId(string? txnRef, out Guid intentId)
    {
        intentId = Guid.Empty;
        if (string.IsNullOrWhiteSpace(txnRef)) return false;
        var trimmed = txnRef.Trim();
        if (trimmed.Length < IntentIdLength) return false;
        return Guid.TryParseExact(trimmed[..IntentIdLength], "N", out intentId);
    }

    /// <summary>Khôi phục `vnp_CreateDate` (yyyyMMddHHmmss, giờ VN) từ đuôi của `vnp_TxnRef`.</summary>
    public static bool TryParseCreateDate(string? txnRef, out string createDate)
    {
        createDate = string.Empty;
        if (string.IsNullOrWhiteSpace(txnRef)) return false;
        var trimmed = txnRef.Trim();
        if (trimmed.Length < IntentIdLength + TxnRefDateFormat.Length) return false;

        var tail = trimmed.Substring(IntentIdLength, TxnRefDateFormat.Length);
        if (!DateTime.TryParseExact(tail, TxnRefDateFormat, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var parsed))
            return false;

        createDate = parsed.ToString(DateFormat, CultureInfo.InvariantCulture);
        return true;
    }

    public static string FormatVnDate(DateTimeOffset instant)
        => TimeZoneInfo.ConvertTime(instant, VnPayOptions.VnTimeZone)
            .DateTime.ToString(DateFormat, CultureInfo.InvariantCulture);

    /// <summary>
    /// `vnp_OrderInfo` chỉ nhận chữ/số/khoảng trắng không dấu — dấu tiếng Việt hoặc ký tự lạ làm
    /// VNPay từ chối giao dịch. Bỏ dấu thay vì để cổng trả lỗi cho khách.
    /// </summary>
    public static string BuildOrderInfo(string orderReference)
    {
        // D/d co gach ngang (U+0110/U+0111) la MOT code point, KHONG tach ra dau phu khi
        // Normalize(FormD) - nen vong lap ben duoi se nuot im lang chung. Phai thay tay TRUOC khi
        // chuan hoa, neu khong "Đơn QH-01" thanh "on QH-01" va khach thay ma don sai tren cong VNPay.
        var raw = $"Thanh toan don hang {orderReference}"
            .Replace('Đ', 'D')
            .Replace('đ', 'd');
        var sb = new StringBuilder(raw.Length);
        foreach (var c in raw.Normalize(NormalizationForm.FormD))
        {
            if (char.GetUnicodeCategory(c) == System.Globalization.UnicodeCategory.NonSpacingMark) continue;
            if (char.IsLetterOrDigit(c) && c < 128) sb.Append(c);
            else if (c is ' ' or '-' or '_') sb.Append(c);
        }
        var cleaned = sb.ToString().Trim();
        if (cleaned.Length == 0) cleaned = "Thanh toan don hang";
        return cleaned.Length > 255 ? cleaned[..255] : cleaned;
    }

    /// <summary>VNPay chờ một IPv4; loopback IPv6 của dev/proxy làm cổng từ chối.</summary>
    public static string NormalizeIp(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "127.0.0.1";
        var value = raw.Trim();
        if (value is "::1" or "0:0:0:0:0:0:0:1") return "127.0.0.1";
        if (!IPAddress.TryParse(value, out var ip)) return "127.0.0.1";
        if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6 && ip.IsIPv4MappedToIPv6)
            return ip.MapToIPv4().ToString();
        return value.Length > 45 ? value[..45] : value;
    }
}

/// <summary>Kết quả dựng URL: đủ để lưu lên intent mà không phải dựng lại chuỗi nào.</summary>
public sealed record VnPayPaymentUrl(string Url, string TxnRef, DateTime CreateDateVn, DateTime ExpiresAtUtc);
