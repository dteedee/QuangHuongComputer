using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Identity.Services;

/// <summary>
/// Báo NGAY LÚC KHỞI ĐỘNG trạng thái reCAPTCHA — nhất là ca nguy hiểm: Production, đang bật,
/// nhưng chưa có secret ⇒ mọi đăng nhập/đăng ký bằng mật khẩu sẽ bị từ chối (503).
/// Không bao giờ log giá trị secret.
/// </summary>
public sealed class RecaptchaStartupCheck : IHostedService
{
    private readonly IConfiguration _config;
    private readonly IHostEnvironment _env;
    private readonly ILogger<RecaptchaStartupCheck> _logger;

    public RecaptchaStartupCheck(IConfiguration config, IHostEnvironment env, ILogger<RecaptchaStartupCheck> logger)
    {
        _config = config;
        _env = env;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var settings = RecaptchaSettings.From(_config);
        if (!settings.Enabled)
            _logger.LogWarning("reCAPTCHA: TẮT tường minh (Recaptcha:Enabled=false) — đăng nhập/đăng ký không kiểm bot.");
        else if (settings.HasUsableSecret)
            _logger.LogInformation("reCAPTCHA: BẬT, ngưỡng điểm {MinScore}.", settings.MinScore);
        else if (_env.IsProduction())
            _logger.LogCritical("reCAPTCHA: BẬT nhưng thiếu Recaptcha:SecretKey trên Production — đăng nhập và " +
                "đăng ký bằng mật khẩu sẽ bị TỪ CHỐI. Đặt RECAPTCHA_SECRET_KEY (+ VITE_RECAPTCHA_SITE_KEY cho web) " +
                "hoặc tắt tường minh bằng RECAPTCHA_ENABLED=false.");
        else
            _logger.LogWarning("reCAPTCHA: chưa có secret — bỏ qua kiểm tra ở môi trường {Env}.", _env.EnvironmentName);

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
