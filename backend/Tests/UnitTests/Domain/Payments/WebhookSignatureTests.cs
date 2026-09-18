using FluentAssertions;
using Payments.Application.Webhooks;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// W0-10 — helper fail-closed dùng chung cho mọi webhook.
/// Trọng tâm: secret RỖNG hoặc PLACEHOLDER phải bị coi là "chưa cấu hình", không bao giờ
/// là "bỏ qua kiểm tra" (chính là lỗ hổng `if (string.IsNullOrEmpty(ApiKey)) return true;`).
/// </summary>
public class WebhookSignatureTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("${VNPAY_HASH_SECRET}")]
    [InlineData("${SEPAY_API_KEY}")]
    [InlineData("DEMOSECRET")]
    [InlineData("DEMO")]
    [InlineData("demosecret")]
    [InlineData("changeme")]
    [InlineData("CHANGEME")]
    [InlineData("0000000000")]
    [InlineData("your_secret_here")]
    [InlineData("placeholder")]
    public void IsConfiguredSecret_GiaTriGia_TraFalse(string? value)
    {
        WebhookSignature.IsConfiguredSecret(value).Should().BeFalse(
            "secret rỗng/placeholder phải làm webhook trả 503, không được bỏ qua kiểm tra");
    }

    [Theory]
    [InlineData("a1b2c3d4e5f6")]
    [InlineData("QH_live_7f3ac91b")]
    [InlineData("0123456789")]
    public void IsConfiguredSecret_GiaTriThat_TraTrue(string value)
        => WebhookSignature.IsConfiguredSecret(value).Should().BeTrue();

    [Fact]
    public void FixedTimeEquals_KhopChinhXac()
        => WebhookSignature.FixedTimeEquals("abc123", "abc123").Should().BeTrue();

    [Theory]
    [InlineData("abc123", "abc124")]
    [InlineData("abc123", "abc")]      // chuỗi con KHÔNG được coi là khớp (lỗ `Contains` cũ)
    [InlineData("abc", "abc123")]
    [InlineData("abc123", "")]
    [InlineData("abc123", null)]
    public void FixedTimeEquals_KhacNhau_TraFalse(string a, string? b)
        => WebhookSignature.FixedTimeEquals(a, b).Should().BeFalse();

    [Fact]
    public void FixedTimeEqualsHex_KhongPhanBietHoaThuong()
        => WebhookSignature.FixedTimeEqualsHex("AB12CD", "ab12cd").Should().BeTrue();

    [Fact]
    public void HmacSha256Hex_KhopVectorBiet()
    {
        // HMAC-SHA256("key", "The quick brown fox jumps over the lazy dog")
        WebhookSignature.HmacSha256Hex("key", "The quick brown fox jumps over the lazy dog")
            .Should().Be("f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8");
    }

    [Fact]
    public void IsFreshTimestamp_TrongCuaSo_TraTrue()
    {
        var now = DateTimeOffset.UtcNow;
        WebhookSignature.IsFreshTimestamp(now.ToUnixTimeSeconds().ToString(), now).Should().BeTrue();
        WebhookSignature.IsFreshTimestamp(now.AddSeconds(-290).ToUnixTimeSeconds().ToString(), now).Should().BeTrue();
    }

    [Theory]
    [InlineData(-301)]
    [InlineData(400)]
    public void IsFreshTimestamp_NgoaiCuaSo_TraFalse(int offsetSeconds)
    {
        var now = DateTimeOffset.UtcNow;
        WebhookSignature.IsFreshTimestamp(now.AddSeconds(offsetSeconds).ToUnixTimeSeconds().ToString(), now)
            .Should().BeFalse("chống replay: ±300s theo tài liệu SePay");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("khong-phai-so")]
    public void IsFreshTimestamp_ThieuHoacHong_TraFalse(string? raw)
        => WebhookSignature.IsFreshTimestamp(raw, DateTimeOffset.UtcNow).Should().BeFalse();

    [Fact]
    public void ExtractAuthToken_Apikey_LayDungToken()
        => WebhookSignature.ExtractAuthToken("Apikey SECRET123", "Apikey").Should().Be("SECRET123");

    [Fact]
    public void ExtractAuthToken_KhongPhanBietHoaThuongScheme()
        => WebhookSignature.ExtractAuthToken("APIKEY SECRET123", "Apikey").Should().Be("SECRET123");

    [Theory]
    [InlineData("Bearer SECRET123")]   // SePay KHÔNG gửi Bearer — không được chấp nhận nhầm scheme
    [InlineData("ApikeySECRET123")]
    [InlineData("Apikey")]
    [InlineData("")]
    [InlineData(null)]
    public void ExtractAuthToken_SaiScheme_TraNull(string? header)
        => WebhookSignature.ExtractAuthToken(header, "Apikey").Should().BeNull();
}
