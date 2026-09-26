using System.Net;
using System.Text;
using FluentAssertions;
using Identity.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace UnitTests.Security;

/// <summary>
/// reCAPTCHA phía server: trước đây frontend gửi token nhưng backend không hề kiểm. Nay
/// Production thiếu secret ⇒ TỪ CHỐI (trừ khi tắt tường minh), dev thiếu secret ⇒ bỏ qua,
/// có secret ⇒ phải qua siteverify (success + đúng action + đủ điểm), lỗi mạng ⇒ từ chối.
/// </summary>
public class RecaptchaVerifierTests
{
    private const string RealSecret = "real-recaptcha-secret-for-unit-tests";

    private sealed class FakeEnv(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;
        public string ApplicationName { get; set; } = "UnitTests";
        public string ContentRootPath { get; set; } = "/";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class StubHandler(Func<HttpResponseMessage> respond) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Calls++;
            return Task.FromResult(respond());
        }
    }

    private static HttpResponseMessage Json(string body) =>
        new(HttpStatusCode.OK) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    private static (RecaptchaVerifier verifier, StubHandler handler) Make(
        string env, string? secret, string? enabled = null, Func<HttpResponseMessage>? respond = null)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Recaptcha:SecretKey"] = secret,
            ["Recaptcha:Enabled"] = enabled,
        }).Build();
        var handler = new StubHandler(respond ?? (() => Json("""{"success":true,"score":0.9,"action":"login"}""")));
        return (new RecaptchaVerifier(new HttpClient(handler), config, new FakeEnv(env),
            NullLogger<RecaptchaVerifier>.Instance), handler);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("${RECAPTCHA_SECRET_KEY}")]
    [InlineData("CHANGE_ME_RECAPTCHA_SECRET_KEY")]
    [InlineData(RecaptchaSettings.GoogleTestSecretKey)]
    public async Task Production_ThieuSecret_ThiTuChoi(string? secret)
    {
        var (v, handler) = Make("Production", secret);
        var outcome = await v.VerifyAsync("any-token", "login", null);
        outcome.Passed.Should().BeFalse();
        outcome.NotConfigured.Should().BeTrue();
        handler.Calls.Should().Be(0);
    }

    [Fact]
    public async Task Production_TatTuongMinh_ThiBoQua()
    {
        var (v, _) = Make("Production", null, enabled: "false");
        (await v.VerifyAsync(null, "login", null)).Passed.Should().BeTrue();
    }

    [Theory]
    [InlineData("Development")]
    [InlineData("Testing")]
    public async Task NgoaiProduction_ThieuSecret_ThiBoQua(string env)
    {
        var (v, handler) = Make(env, null);
        (await v.VerifyAsync(null, "login", null)).Passed.Should().BeTrue();
        handler.Calls.Should().Be(0);
    }

    [Fact]
    public async Task CoSecret_TokenHopLe_ThiQua()
    {
        var (v, handler) = Make("Production", RealSecret);
        (await v.VerifyAsync("token", "login", "1.2.3.4")).Passed.Should().BeTrue();
        handler.Calls.Should().Be(1);
    }

    [Fact]
    public async Task CoSecret_ThieuToken_ThiTuChoiKhongGoiGoogle()
    {
        var (v, handler) = Make("Development", RealSecret);
        var outcome = await v.VerifyAsync(null, "login", null);
        outcome.Passed.Should().BeFalse();
        outcome.NotConfigured.Should().BeFalse();
        handler.Calls.Should().Be(0);
    }

    [Theory]
    [InlineData("""{"success":false,"score":0.9,"action":"login"}""")]
    [InlineData("""{"success":true,"score":0.1,"action":"login"}""")]
    [InlineData("""{"success":true,"score":0.9,"action":"register"}""")]
    [InlineData("not json")]
    public async Task CoSecret_GoogleKhongXacNhan_ThiTuChoi(string body)
    {
        var (v, _) = Make("Production", RealSecret, respond: () => Json(body));
        (await v.VerifyAsync("token", "login", null)).Passed.Should().BeFalse();
    }

    [Fact]
    public async Task CoSecret_LoiMang_ThiTuChoi()
    {
        var (v, _) = Make("Production", RealSecret, respond: () => throw new HttpRequestException("down"));
        (await v.VerifyAsync("token", "login", null)).Passed.Should().BeFalse();
    }

    [Fact]
    public async Task CoSecret_Http500_ThiTuChoi()
    {
        var (v, _) = Make("Production", RealSecret,
            respond: () => new HttpResponseMessage(HttpStatusCode.InternalServerError));
        (await v.VerifyAsync("token", "login", null)).Passed.Should().BeFalse();
    }
}
