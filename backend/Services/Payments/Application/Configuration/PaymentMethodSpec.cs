using Payments.Domain;

namespace Payments.Application.Configuration;

/// <summary>
/// W0-10 (D04 R1/R2) — mô tả tĩnh của một phương thức thanh toán:
/// mã công khai, tên hiển thị tiếng Việt, khoá cấu hình BẮT BUỘC, khoá secret dùng verify webhook.
/// Provider KHÔNG có trong bảng này (Stripe, ZaloPay — đã xoá code) vĩnh viễn không khả dụng.
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
    string? EndpointKey = null)
{
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
                ConfigSection: "SePay",
                RequiredKeys: new[] { "Payment:SePay:AccountNumber", "Payment:SePay:BankCode" },
                WebhookSecretKeys: new[] { "Payment:SePay:WebhookSecret", "Payment:SePay:ApiKey" },
                RequiresRedirect: false,
                SortOrder: 20,
                EnabledByDefault: false),

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
                EndpointKey: "Payment:MoMo:Endpoint")
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
    int SortOrder);
