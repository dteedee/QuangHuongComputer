using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Identity.Services;

/// <summary>Kết quả kiểm reCAPTCHA. <see cref="NotConfigured"/> ⇒ endpoint trả 503, còn lại 400.</summary>
public sealed record RecaptchaOutcome(bool Passed, bool NotConfigured = false)
{
    public static readonly RecaptchaOutcome Pass = new(true);
    public static readonly RecaptchaOutcome Reject = new(false);
    public static readonly RecaptchaOutcome Unconfigured = new(false, NotConfigured: true);
}

public interface IRecaptchaVerifier
{
    Task<RecaptchaOutcome> VerifyAsync(string? token, string expectedAction, string? remoteIp,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Xác minh token reCAPTCHA v3 với Google (siteverify). Trước đây frontend gửi token nhưng backend
/// KHÔNG kiểm (DTO còn không có trường này) — chống bot chỉ là trang trí.
///
/// Ma trận quyết định (fail-closed trên Production):
///   Enabled=false tường minh            ⇒ bỏ qua.
///   Chưa có secret dùng được + Production ⇒ TỪ CHỐI (log lỗi) — không bao giờ âm thầm cho qua.
///   Chưa có secret dùng được + môi trường khác ⇒ bỏ qua (dev/test không cần key Google).
///   Có secret ⇒ token phải có, success=true, đúng action, điểm ≥ MinScore; lỗi mạng ⇒ từ chối.
/// </summary>
public sealed class RecaptchaVerifier : IRecaptchaVerifier
{
    public const string SiteVerifyUrl = "https://www.google.com/recaptcha/api/siteverify";

    private readonly HttpClient _http;
    private readonly RecaptchaSettings _settings;
    private readonly IHostEnvironment _env;
    private readonly ILogger<RecaptchaVerifier> _logger;

    public RecaptchaVerifier(HttpClient http, IConfiguration configuration, IHostEnvironment env,
        ILogger<RecaptchaVerifier> logger)
    {
        _http = http;
        _settings = RecaptchaSettings.From(configuration);
        _env = env;
        _logger = logger;
    }

    public async Task<RecaptchaOutcome> VerifyAsync(string? token, string expectedAction, string? remoteIp,
        CancellationToken cancellationToken = default)
    {
        if (!_settings.Enabled) return RecaptchaOutcome.Pass;

        if (!_settings.HasUsableSecret)
        {
            if (!_env.IsProduction()) return RecaptchaOutcome.Pass;
            _logger.LogError("reCAPTCHA: thiếu Recaptcha:SecretKey trên Production — từ chối yêu cầu " +
                "(đặt RECAPTCHA_SECRET_KEY, hoặc tắt tường minh bằng Recaptcha:Enabled=false).");
            return RecaptchaOutcome.Unconfigured;
        }

        if (string.IsNullOrWhiteSpace(token)) return RecaptchaOutcome.Reject;

        try
        {
            var form = new Dictionary<string, string> { ["secret"] = _settings.SecretKey!, ["response"] = token };
            if (!string.IsNullOrWhiteSpace(remoteIp)) form["remoteip"] = remoteIp;

            using var response = await _http.PostAsync(SiteVerifyUrl, new FormUrlEncodedContent(form), cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("reCAPTCHA: siteverify trả HTTP {Status} — từ chối", (int)response.StatusCode);
                return RecaptchaOutcome.Reject;
            }

            var body = await response.Content.ReadFromJsonAsync<SiteVerifyResponse>(cancellationToken: cancellationToken);
            if (body is null || !body.Success) return RecaptchaOutcome.Reject;
            if (!string.Equals(body.Action, expectedAction, StringComparison.Ordinal)) return RecaptchaOutcome.Reject;
            return body.Score >= _settings.MinScore ? RecaptchaOutcome.Pass : RecaptchaOutcome.Reject;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            _logger.LogWarning(ex, "reCAPTCHA: không gọi được siteverify — từ chối (fail-closed)");
            return RecaptchaOutcome.Reject;
        }
    }

    private sealed record SiteVerifyResponse(
        [property: JsonPropertyName("success")] bool Success,
        [property: JsonPropertyName("score")] double Score,
        [property: JsonPropertyName("action")] string? Action);
}
