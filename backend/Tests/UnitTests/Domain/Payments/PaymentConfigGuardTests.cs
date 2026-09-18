using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Payments.Application.Configuration;
using Payments.Domain;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// W0-10 / D04 R2-R3 — "chỉ bật khi đã cấu hình".
/// Trên dữ liệu dev hiện tại (appsettings toàn `${VAR}`) kết quả ĐÚNG là chỉ còn `cod`.
/// </summary>
public class PaymentConfigGuardTests
{
    private sealed class FakeEnv : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = "/";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static PaymentConfigGuard Guard(Dictionary<string, string?> values, string env = "Development")
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(values).Build();
        return new PaymentConfigGuard(config, new FakeEnv { EnvironmentName = env },
            NullLogger<PaymentConfigGuard>.Instance);
    }

    /// <summary>Đúng những gì `appsettings.Development.json` đang chứa hôm nay.</summary>
    private static Dictionary<string, string?> DevConfig() => new()
    {
        ["Payment:VNPay:TmnCode"] = "${VNPAY_TMN_CODE}",
        ["Payment:VNPay:HashSecret"] = "${VNPAY_HASH_SECRET}",
        ["Payment:VNPay:PaymentUrl"] = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
        ["Payment:MoMo:PartnerCode"] = "${MOMO_PARTNER_CODE}",
        ["Payment:MoMo:AccessKey"] = "${MOMO_ACCESS_KEY}",
        ["Payment:MoMo:SecretKey"] = "${MOMO_SECRET_KEY}",
        ["Payment:SePay:ApiKey"] = "${SEPAY_API_KEY}",
        ["Payment:SePay:AccountNumber"] = "${SEPAY_ACCOUNT_NUMBER}",
        ["Payment:SePay:BankCode"] = "${SEPAY_BANK_CODE}"
    };

    [Fact]
    public void CauHinhDev_ChiConCOD()
    {
        var codes = Guard(DevConfig()).AvailableMethods().Select(m => m.Code).ToArray();
        codes.Should().Equal("cod");
    }

    [Fact]
    public void CauHinhRong_VanCoCOD()
        => Guard(new Dictionary<string, string?>()).IsAvailable(PaymentProvider.COD).Should().BeTrue();

    [Fact]
    public void COD_TatTuongMinh_ThiBienMat()
    {
        var guard = Guard(new Dictionary<string, string?> { ["Payment:Cod:Enabled"] = "false" });
        guard.IsAvailable(PaymentProvider.COD).Should().BeFalse();
        guard.AvailableMethods().Should().BeEmpty();
    }

    [Fact]
    public void VnPay_DuKhoaThat_VaEnabled_ThiBat()
    {
        var guard = Guard(new Dictionary<string, string?>
        {
            ["Payment:VNPay:Enabled"] = "true",
            ["Payment:VNPay:TmnCode"] = "QHC01234",
            ["Payment:VNPay:HashSecret"] = "R1K2L3M4N5O6P7Q8",
            ["Payment:VNPay:PaymentUrl"] = "https://pay.vnpay.vn/vpcpay.html"
        });
        guard.IsAvailable(PaymentProvider.VnPay).Should().BeTrue();
        guard.AvailableMethods().Select(m => m.Code).Should().Contain("vnpay");
    }

    [Fact]
    public void VnPay_DuKhoaNhungKhongEnabled_ThiTat()
    {
        var guard = Guard(new Dictionary<string, string?>
        {
            ["Payment:VNPay:TmnCode"] = "QHC01234",
            ["Payment:VNPay:HashSecret"] = "R1K2L3M4N5O6P7Q8"
        });
        guard.IsAvailable(PaymentProvider.VnPay).Should().BeFalse();
        guard.Evaluate(PaymentProvider.VnPay).MissingKeys.Should().Contain("Payment:VNPay:Enabled");
    }

    [Fact]
    public void VnPay_HashSecretLaDEMOSECRET_ThiTat()
    {
        // `?? "DEMOSECRET"` cũ không bắt được chuỗi rỗng; ở đây placeholder bị bắt tường minh.
        var guard = Guard(new Dictionary<string, string?>
        {
            ["Payment:VNPay:Enabled"] = "true",
            ["Payment:VNPay:TmnCode"] = "DEMO",
            ["Payment:VNPay:HashSecret"] = "DEMOSECRET"
        });
        guard.IsAvailable(PaymentProvider.VnPay).Should().BeFalse();
        guard.Evaluate(PaymentProvider.VnPay).MissingKeys
            .Should().Contain("Payment:VNPay:TmnCode").And.Contain("Payment:VNPay:HashSecret");
    }

    [Fact]
    public void Production_EndpointSandbox_BiChan()
    {
        var values = new Dictionary<string, string?>
        {
            ["Payment:VNPay:Enabled"] = "true",
            ["Payment:VNPay:TmnCode"] = "QHC01234",
            ["Payment:VNPay:HashSecret"] = "R1K2L3M4N5O6P7Q8",
            ["Payment:VNPay:PaymentUrl"] = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
        };
        Guard(values, "Production").IsAvailable(PaymentProvider.VnPay).Should().BeFalse();

        values["Payment:AllowSandbox"] = "true";
        Guard(values, "Production").IsAvailable(PaymentProvider.VnPay).Should().BeTrue("UAT được phép");
    }

    [Fact]
    public void SePay_ThieuSTK_ThiTat()
    {
        var guard = Guard(new Dictionary<string, string?>
        {
            ["Payment:SePay:Enabled"] = "true",
            ["Payment:SePay:AccountNumber"] = "0000000000",   // STK toàn số 0 = placeholder
            ["Payment:SePay:BankCode"] = "MB"
        });
        guard.IsAvailable(PaymentProvider.SePay).Should().BeFalse();
        guard.Evaluate(PaymentProvider.SePay).MissingKeys.Should().Contain("Payment:SePay:AccountNumber");
    }

    // Giá trị enum viết bằng số để không chạm vào thành viên [Obsolete]: 0 = Stripe, 5 = ZaloPay.
    [Theory]
    [InlineData(0)]
    [InlineData(5)]
    public void StripeVaZaloPay_LuonKhongKhaDung(int providerValue)
    {
        var provider = (PaymentProvider)providerValue;
        var guard = Guard(DevConfig());
        guard.IsAvailable(provider).Should().BeFalse();
        guard.Evaluate(provider).MissingKeys.Should().Contain("REMOVED");
    }

    [Fact]
    public void WebhookSecrets_ChuaCauHinh_ThiRong()
        => Guard(DevConfig()).HasWebhookSecret(PaymentProvider.SePay).Should().BeFalse();

    [Fact]
    public void WebhookSecrets_UuTienHmacTruocApiKey()
    {
        var guard = Guard(new Dictionary<string, string?>
        {
            ["Payment:SePay:WebhookSecret"] = "hmac_secret_1",
            ["Payment:SePay:ApiKey"] = "apikey_2"
        });
        guard.WebhookSecrets(PaymentProvider.SePay).Should().Equal("hmac_secret_1", "apikey_2");
    }
}
