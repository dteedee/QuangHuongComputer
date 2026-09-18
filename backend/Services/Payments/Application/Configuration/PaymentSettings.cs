using System.Globalization;
using Microsoft.Extensions.Configuration;

namespace Payments.Application.Configuration;

/// <summary>
/// D04 R5 — thiết lập KHÔNG MẬT của thanh toán (số tài khoản, BIN, trần COD, giờ giữ đơn).
/// Secret không bao giờ đi qua đây: chúng chỉ được đọc qua <see cref="PaymentConfigGuard"/> ở đúng
/// chỗ cần verify và không bao giờ trả ra API.
///
/// Mặc định theo D04 mục 8: `Cod:Enabled=true`, `BankTransfer:HoldHours=24`, `Cod:MaxOrderAmount=0`
/// (trần COD TẮT cho tới khi có ít nhất một phương thức khác chạy được).
/// </summary>
public sealed class PaymentSettings
{
    /// <summary>BIN NAPAS được D04 mục 2 dẫn tên — chỉ dùng để hiển thị khi cấu hình không ghi tên.</summary>
    private static readonly IReadOnlyDictionary<string, string> KnownBankNames = new Dictionary<string, string>
    {
        ["970436"] = "Vietcombank",
        ["970418"] = "BIDV",
        ["970422"] = "MB Bank"
    };

    private readonly IConfiguration _config;
    private readonly PaymentConfigGuard _guard;

    public PaymentSettings(IConfiguration config, PaymentConfigGuard guard)
    {
        _config = config;
        _guard = guard;
    }

    /// <summary>Số giờ giữ đơn chờ chuyển khoản trước khi intent hết hạn (D04 mục 4).</summary>
    public int BankTransferHoldHours => ReadInt("Payment:BankTransfer:HoldHours", 24, 1, 720);

    /// <summary>Trần giá trị đơn được phép chọn COD. 0 = TẮT (mặc định D04 mục 3).</summary>
    public decimal CodMaxOrderAmount => ReadDecimal("Payment:Cod:MaxOrderAmount", 0m);

    /// <summary>Intent chuyển khoản treo quá số phút này thì job đối soát mới đi hỏi (D04 mục 4).</summary>
    public int ReconcileAfterMinutes => ReadInt("Payment:Reconciliation:StaleAfterMinutes", 15, 1, 1440);

    public int ReconcileIntervalMinutes => ReadInt("Payment:Reconciliation:IntervalMinutes", 60, 5, 1440);

    public string BankBin => _guard.ResolveValueOrEmpty(PaymentConfigKeys.BankBin);

    public string BankAccountNumber => _guard.ResolveValueOrEmpty(PaymentConfigKeys.BankAccountNumber);

    public string BankAccountName => _guard.ResolveValueOrEmpty(PaymentConfigKeys.BankAccountName);

    public string BankName
    {
        get
        {
            var configured = _config["Payment:BankTransfer:BankName"];
            if (!string.IsNullOrWhiteSpace(configured) && !configured.Contains("${", StringComparison.Ordinal))
                return configured.Trim();
            return KnownBankNames.TryGetValue(BankBin, out var name) ? name : string.Empty;
        }
    }

    /// <summary>Số giây khách được giữ mã QR trước khi màn thanh toán phải làm mới.</summary>
    public int QrRefreshSeconds => ReadInt("Payment:BankTransfer:QrRefreshSeconds", 300, 30, 3600);

    private int ReadInt(string key, int fallback, int min, int max)
    {
        var raw = _config[key];
        if (string.IsNullOrWhiteSpace(raw) || !int.TryParse(raw.Trim(), NumberStyles.Integer,
                CultureInfo.InvariantCulture, out var parsed))
            return fallback;
        return Math.Clamp(parsed, min, max);
    }

    private decimal ReadDecimal(string key, decimal fallback)
    {
        var raw = _config[key];
        if (string.IsNullOrWhiteSpace(raw) || !decimal.TryParse(raw.Trim(), NumberStyles.Number,
                CultureInfo.InvariantCulture, out var parsed))
            return fallback;
        return parsed < 0 ? fallback : parsed;
    }
}

/// <summary>Tên khoá cấu hình dùng ở nhiều nơi — viết một lần để không gõ lệch.</summary>
public static class PaymentConfigKeys
{
    public const string BankBin = "Payment:BankTransfer:BankBin";
    public const string BankAccountNumber = "Payment:BankTransfer:AccountNumber";
    public const string BankAccountName = "Payment:BankTransfer:AccountName";

    /// <summary>Khoá cũ của W0-10 — vẫn đọc được để không làm hỏng cấu hình đang chạy.</summary>
    public const string LegacyBankBin = "Payment:SePay:BankCode";
    public const string LegacyBankAccountNumber = "Payment:SePay:AccountNumber";

    /// <summary>Danh sách đối tác trả góp của D10 (SystemConfig). Rỗng ⇒ `/methods` không trả `installment`.</summary>
    public const string InstallmentPartners = "Sales:Installment:Partners";

    /// <summary>Token đọc danh sách giao dịch SePay để đối soát (tuỳ chọn).</summary>
    public const string SePayApiToken = "Payment:SePay:ApiToken";

    public const string SePayApiBaseUrl = "Payment:SePay:ApiBaseUrl";
}
