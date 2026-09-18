using Payments.Domain;

namespace Payments.Application.Configuration;

/// <summary>
/// W0-10 (D04 R1/R2) — mô tả tĩnh của một phương thức thanh toán:
/// mã công khai, tên hiển thị tiếng Việt, khoá cấu hình BẮT BUỘC, khoá secret dùng verify webhook.
/// Provider KHÔNG có trong bảng này (Stripe, ZaloPay — đã xoá code) vĩnh viễn không khả dụng.
///
/// W2-4 (D04 mục 2): phương thức "chuyển khoản ngân hàng" đổi sang khoá `Payment:BankTransfer:*`
/// (tầng 0b chạy được mà KHÔNG cần tài khoản SePay). Khoá `Payment:SePay:*` cũ vẫn được chấp nhận
/// làm bí danh để cấu hình đang chạy không gãy — xem <see cref="RequiredKeyAliases"/>.
/// </summary>
public sealed record PaymentMethodSpec(
    PaymentProvider Provider,
    string Code,
    string DisplayName,
    string Description,
    string ConfigSection,
    string[] RequiredKeys,
    string[] WebhookSecretKeys,
    bool RequiresRedirect,
    int SortOrder,
    bool EnabledByDefault,
    string? EndpointKey = null,
    string[]? EnabledKeyAliases = null,
    bool Direct = true)
{
    /// <summary>
    /// true = có <see cref="Providers.IPaymentProvider"/> tạo được lệnh thu tiền.
    /// false = phương thức "dẫn hướng" (trả góp lead-mode của D10): xuất hiện trong `/methods`
    /// nhưng `/initiate` từ chối, khách đi qua luồng hồ sơ trả góp của Sales.
    /// </summary>
    public bool IsDirect { get; } = Direct;

    /// <summary>Bảng duy nhất — checkout/footer/PDP/POS đều đọc qua đây (R1).</summary>
    public static readonly IReadOnlyDictionary<PaymentProvider, PaymentMethodSpec> All =
        new Dictionary<PaymentProvider, PaymentMethodSpec>
        {
            [PaymentProvider.COD] = new(
                PaymentProvider.COD,
                Code: "cod",
                DisplayName: "Thanh toán khi nhận hàng",
                Description: "Trả tiền mặt cho nhân viên giao hàng khi nhận máy.",
                ConfigSection: "Cod",
                RequiredKeys: Array.Empty<string>(),
                WebhookSecretKeys: Array.Empty<string>(),
                RequiresRedirect: false,
                SortOrder: 10,
                EnabledByDefault: true),

            [PaymentProvider.SePay] = new(
                PaymentProvider.SePay,
                Code: "bank_transfer",
                DisplayName: "Chuyển khoản ngân hàng (quét mã VietQR)",
                Description: "Quét mã VietQR hoặc chuyển khoản theo số tài khoản công ty.",
                ConfigSection: "BankTransfer",
                RequiredKeys: new[]
                {
                    PaymentConfigKeys.BankBin,
                    PaymentConfigKeys.BankAccountNumber,
                    PaymentConfigKeys.BankAccountName
                },
                // SePay chỉ là kênh TỰ ĐỘNG XÁC NHẬN (D04 tầng 1) — không bắt buộc để bật phương thức.
                WebhookSecretKeys: new[] { "Payment:SePay:WebhookSecret", "Payment:SePay:ApiKey" },
                RequiresRedirect: false,
                SortOrder: 20,
                EnabledByDefault: false,
                EnabledKeyAliases: new[] { "Payment:SePay:Enabled" }),

            [PaymentProvider.VnPay] = new(
                PaymentProvider.VnPay,
                Code: "vnpay",
                DisplayName: "Thẻ ATM / Thẻ quốc tế (VNPAY)",
                Description: "Thanh toán qua cổng VNPAY.",
                ConfigSection: "VNPay",
                RequiredKeys: new[] { "Payment:VNPay:TmnCode", "Payment:VNPay:HashSecret" },
                WebhookSecretKeys: new[] { "Payment:VNPay:HashSecret" },
                RequiresRedirect: true,
                SortOrder: 30,
                EnabledByDefault: false,
                EndpointKey: "Payment:VNPay:PaymentUrl"),

            [PaymentProvider.Momo] = new(
                PaymentProvider.Momo,
                Code: "momo",
                DisplayName: "Ví MoMo",
                Description: "Thanh toán qua ví điện tử MoMo.",
                ConfigSection: "MoMo",
                RequiredKeys: new[]
                {
                    "Payment:MoMo:PartnerCode", "Payment:MoMo:AccessKey", "Payment:MoMo:SecretKey"
                },
                WebhookSecretKeys: new[] { "Payment:MoMo:SecretKey" },
                RequiresRedirect: true,
                SortOrder: 40,
                EnabledByDefault: false,
                EndpointKey: "Payment:MoMo:Endpoint"),

            // D10 / D04 mục 5 — lead-mode: không API tín dụng, không PaymentIntent.
            // Bật bằng DỮ LIỆU (danh sách đối tác khác rỗng), không phải bằng quyết định phạm vi.
            [PaymentProvider.Installment] = new(
                PaymentProvider.Installment,
                Code: "installment",
                DisplayName: "Trả góp qua công ty tài chính",
                Description: "Nhân viên liên hệ và hoàn tất hồ sơ trả góp với công ty tài chính.",
                ConfigSection: "Installment",
                RequiredKeys: new[] { PaymentConfigKeys.InstallmentPartners },
                WebhookSecretKeys: Array.Empty<string>(),
                RequiresRedirect: false,
                SortOrder: 50,
                EnabledByDefault: true,
                Direct: false)
        };

    /// <summary>
    /// Bí danh CŨ cho một khoá bắt buộc. Khi khoá chính chưa đặt, giá trị bí danh được chấp nhận;
    /// khi cả hai đều thiếu, CẢ HAI tên cùng xuất hiện trong danh sách "còn thiếu" của trang admin
    /// để người cấu hình biết đặt khoá nào cũng được.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, string> RequiredKeyAliases =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [PaymentConfigKeys.BankBin] = PaymentConfigKeys.LegacyBankBin,
            [PaymentConfigKeys.BankAccountNumber] = PaymentConfigKeys.LegacyBankAccountNumber
        };

    /// <summary>Khoá có giá trị là một DANH SÁCH (section con), không phải một chuỗi.</summary>
    public static readonly HashSet<string> ListValuedKeys = new(StringComparer.Ordinal)
    {
        PaymentConfigKeys.InstallmentPartners
    };

    /// <summary>Endpoint sandbox bị chặn trên Production trừ khi `Payment:AllowSandbox=true` (R3).</summary>
    public static readonly string[] SandboxHosts =
    {
        "sandbox.vnpayment.vn", "test-payment.momo.vn", "sb-openapi.zalopay.vn", "sandbox."
    };
}

/// <summary>Kết quả đánh giá một provider — dùng cho `/methods`, `/initiate` và trang admin.</summary>
public sealed record PaymentMethodAvailability(
    PaymentProvider Provider,
    string Code,
    string DisplayName,
    string Description,
    bool Available,
    IReadOnlyList<string> MissingKeys,
    bool RequiresRedirect,
    int SortOrder,
    bool IsDirect = true);
