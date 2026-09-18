using System.Text;
using FluentAssertions;
using Payments.Application.Webhooks;
using Payments.Infrastructure.SePay;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// W0-10 / D04 R4c — xác thực webhook SePay.
///
/// Hai lỗ hổng đang được đóng ở đây:
///   `SePayService.cs:50` `if (string.IsNullOrEmpty(ApiKey)) return true;` — khoá rỗng = nhận MỌI webhook;
///   `:53` `authHeader.Contains(key)` — khớp chuỗi con.
/// Và một lỗi của chính bản kế hoạch cũ: SePay KHÔNG gửi `Bearer`, mà gửi `Apikey` hoặc HMAC.
/// </summary>
public class SePayWebhookVerificationTests
{
    private const string Secret = "sepay_live_9f2c7ab1";
    private const string ApiKey = "APIKEY_9f2c7ab1";
    private static readonly string Body =
        """{"id":92704,"gateway":"MBBank","transferType":"in","transferAmount":290000,"content":"Thanh toan 510C68A4"}""";

    private static byte[] Raw => Encoding.UTF8.GetBytes(Body);

    private static SePayService Svc(string? hmac = null, string? apiKey = null)
        => new(new SePayConfig { WebhookSecret = hmac ?? "", ApiKey = apiKey ?? "" });

    private static (string sig, string ts) SignHmac(string secret, DateTimeOffset now, byte[]? body = null)
    {
        var ts = now.ToUnixTimeSeconds().ToString();
        var payload = SePayService.BuildSignedPayload(ts, body ?? Raw);
        return ("sha256=" + WebhookSignature.HmacSha256Hex(secret, payload), ts);
    }

    // ---------------------------------------------------------------- fail-closed

    [Fact]
    public void KhongCoSecretNao_TraNotConfigured_KhongPhaiValid()
    {
        var now = DateTimeOffset.UtcNow;
        var r = Svc().VerifyWebhook(new SePayWebhookHeaders(null, null, null), Raw, now);
        r.Should().Be(SePayVerifyResult.NotConfigured,
            "khoá rỗng PHẢI dẫn tới 503, tuyệt đối không phải 'bỏ qua kiểm tra' (lỗ hổng cũ trả true)");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("${SEPAY_API_KEY}")]
    [InlineData("DEMOSECRET")]
    public void SecretLaPlaceholder_TraNotConfigured(string placeholder)
    {
        var r = Svc(placeholder, placeholder)
            .VerifyWebhook(new SePayWebhookHeaders($"Apikey {placeholder}", null, null), Raw, DateTimeOffset.UtcNow);
        r.Should().Be(SePayVerifyResult.NotConfigured);
    }

    // ---------------------------------------------------------------- HMAC trên RAW BODY

    [Fact]
    public void HmacDungTrenRawBody_TraValid()
    {
        var now = DateTimeOffset.UtcNow;
        var (sig, ts) = SignHmac(Secret, now);
        Svc(Secret).VerifyWebhook(new SePayWebhookHeaders(null, sig, ts), Raw, now)
            .Should().Be(SePayVerifyResult.Valid);
    }

    [Fact]
    public void HmacTinhTrenBodyDaSerializeLai_TraInvalid()
    {
        // Đây chính là bẫy R4c: body đã qua parse/serialize lại (khác dấu cách) → chữ ký lệch.
        var now = DateTimeOffset.UtcNow;
        var (sig, ts) = SignHmac(Secret, now, Encoding.UTF8.GetBytes(Body.Replace(",", ", ")));
        Svc(Secret).VerifyWebhook(new SePayWebhookHeaders(null, sig, ts), Raw, now)
            .Should().Be(SePayVerifyResult.Invalid);
    }

    [Fact]
    public void HmacSai_TraInvalid()
    {
        var now = DateTimeOffset.UtcNow;
        var (_, ts) = SignHmac(Secret, now);
        Svc(Secret).VerifyWebhook(new SePayWebhookHeaders(null, "sha256=" + new string('a', 64), ts), Raw, now)
            .Should().Be(SePayVerifyResult.Invalid);
    }

    [Fact]
    public void ThieuHeaderChuKy_CoSecretHmac_TraInvalid()
    {
        Svc(Secret).VerifyWebhook(new SePayWebhookHeaders(null, null, null), Raw, DateTimeOffset.UtcNow)
            .Should().Be(SePayVerifyResult.Invalid);
    }

    [Fact]
    public void TimestampQuaHan_TraInvalid()
    {
        var signedAt = DateTimeOffset.UtcNow.AddSeconds(-600);
        var (sig, ts) = SignHmac(Secret, signedAt);
        Svc(Secret).VerifyWebhook(new SePayWebhookHeaders(null, sig, ts), Raw, DateTimeOffset.UtcNow)
            .Should().Be(SePayVerifyResult.Invalid, "replay ngoài ±300s phải bị từ chối");
    }

    [Fact]
    public void ThieuTimestamp_TraInvalid()
    {
        var now = DateTimeOffset.UtcNow;
        var (sig, _) = SignHmac(Secret, now);
        Svc(Secret).VerifyWebhook(new SePayWebhookHeaders(null, sig, null), Raw, now)
            .Should().Be(SePayVerifyResult.Invalid);
    }

    // ---------------------------------------------------------------- Authorization: Apikey

    [Fact]
    public void ApikeyKhopChinhXac_TraValid()
    {
        Svc(apiKey: ApiKey)
            .VerifyWebhook(new SePayWebhookHeaders($"Apikey {ApiKey}", null, null), Raw, DateTimeOffset.UtcNow)
            .Should().Be(SePayVerifyResult.Valid);
    }

    [Fact]
    public void Apikey_ChuoiCon_TraInvalid()
    {
        // Lỗ `authHeader.Contains(key)` cũ: "Apikey APIKEY_9f2c7ab1_THEM_DUOI" từng được chấp nhận.
        Svc(apiKey: ApiKey)
            .VerifyWebhook(new SePayWebhookHeaders($"Apikey {ApiKey}_THEM_DUOI", null, null), Raw, DateTimeOffset.UtcNow)
            .Should().Be(SePayVerifyResult.Invalid);
    }

    [Fact]
    public void Bearer_KhongDuocChapNhan()
    {
        Svc(apiKey: ApiKey)
            .VerifyWebhook(new SePayWebhookHeaders($"Bearer {ApiKey}", null, null), Raw, DateTimeOffset.UtcNow)
            .Should().Be(SePayVerifyResult.Invalid);
    }

    [Fact]
    public void ThieuAuthorization_CoApiKey_TraInvalid()
    {
        Svc(apiKey: ApiKey)
            .VerifyWebhook(new SePayWebhookHeaders(null, null, null), Raw, DateTimeOffset.UtcNow)
            .Should().Be(SePayVerifyResult.Invalid);
    }
}
