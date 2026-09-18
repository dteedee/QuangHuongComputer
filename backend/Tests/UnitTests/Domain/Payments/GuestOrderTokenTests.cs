using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Payments.Application.Guest;
using Payments.Domain;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// W2-4 bước 11 — token thanh toán cho khách vãng lai: mở đúng MỘT đơn, có hạn, và fail-closed
/// khi chưa cấu hình secret. Một token "mở được mọi đơn" hoặc "không bao giờ hết hạn" là một
/// liên kết chuyển tiếp trong email biến thành cửa sau vĩnh viễn vào đơn người khác.
/// </summary>
public class GuestOrderTokenTests
{
    private static GuestOrderTokenService Service(string? secret)
    {
        var values = new Dictionary<string, string?>();
        if (secret is not null) values[GuestOrderTokenService.SecretKey] = secret;
        return new GuestOrderTokenService(new ConfigurationBuilder().AddInMemoryCollection(values).Build());
    }

    [Fact]
    public void ChuaCauHinhSecret_ThiTat()
    {
        Service(null).IsEnabled.Should().BeFalse();
        Service("${PAYMENT_GUEST_SECRET}").IsEnabled.Should().BeFalse("placeholder chưa thay = chưa cấu hình");
        Service("").IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void TokenHopLe_TraVeDungOrderId()
    {
        var svc = Service("s3cr3t-guest-key-2026");
        var orderId = Guid.NewGuid();
        svc.Validate(svc.Issue(orderId)).Should().Be(orderId);
    }

    [Fact]
    public void TokenCuaDonKhac_KhongMoDuocDonNay()
    {
        var svc = Service("s3cr3t-guest-key-2026");
        var a = Guid.NewGuid();
        var b = Guid.NewGuid();
        svc.Validate(svc.Issue(a)).Should().NotBe(b);
    }

    [Fact]
    public void ChuKySai_ThiTuChoi()
    {
        var svc = Service("s3cr3t-guest-key-2026");
        var token = svc.Issue(Guid.NewGuid());
        var tampered = token[..token.LastIndexOf('.')] + ".AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
        svc.Validate(tampered).Should().BeNull();
    }

    [Fact]
    public void KhacSecret_ThiKhongDocDuocTokenCuaNhau()
    {
        var orderId = Guid.NewGuid();
        var token = Service("secret-one-2026").Issue(orderId);
        Service("secret-two-2026").Validate(token).Should().BeNull();
    }

    [Fact]
    public void HetHan_ThiTuChoi()
    {
        var svc = Service("s3cr3t-guest-key-2026");
        svc.Validate(svc.Issue(Guid.NewGuid(), TimeSpan.FromSeconds(-1))).Should().BeNull();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("khong-phai-token")]
    [InlineData("a.b.c")]
    public void TokenRacRuoi_ThiTuChoi(string? token)
        => Service("s3cr3t-guest-key-2026").Validate(token).Should().BeNull();

    [Fact]
    public void MaThanhToan_DungDinhDangQhCong8KyTu()
    {
        for (var i = 0; i < 50; i++)
        {
            var code = PaymentCodeGenerator.Next();
            code.Should().MatchRegex("^QH[34679ACDEFGHJKLMNPQRTUVWXY]{8}$");
            PaymentCodeGenerator.IsWellFormed(code).Should().BeTrue();
        }
    }

    [Theory]
    [InlineData("QH1234567")]        // thiếu ký tự
    [InlineData("XX34679ACD")]       // sai tiền tố
    [InlineData("QH34679AC0")]       // '0' bị loại vì dễ nhầm với 'O'
    [InlineData(null)]
    public void MaThanhToanSai_ThiKhongHopLe(string? code)
        => PaymentCodeGenerator.IsWellFormed(code).Should().BeFalse();
}
