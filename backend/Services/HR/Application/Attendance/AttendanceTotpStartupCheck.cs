using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HR.Application.Attendance;

/// <summary>
/// Nói ra NGAY LÚC KHỞI ĐỘNG khi secret TOTP chấm công chưa cấu hình — cùng cách
/// <c>PaymentConfigStartupValidator</c> làm với cổng thanh toán: không chặn cả API (chấm công QR
/// chỉ là một trong bốn phương thức, GPS/WiFi/chấm tay vẫn chạy), nhưng người vận hành thấy lỗi
/// trong log ngày đầu thay vì khi nhân viên đứng trước máy quét.
/// Production ⇒ Critical, môi trường khác ⇒ Warning. Không bao giờ log giá trị secret.
/// </summary>
public sealed class AttendanceTotpStartupCheck : IHostedService
{
    private readonly IConfiguration _config;
    private readonly IHostEnvironment _env;
    private readonly ILogger<AttendanceTotpStartupCheck> _logger;

    public AttendanceTotpStartupCheck(
        IConfiguration config, IHostEnvironment env, ILogger<AttendanceTotpStartupCheck> logger)
    {
        _config = config;
        _env = env;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var problem = AttendanceTotpSecret.Describe(_config[AttendanceTotpSecret.ConfigKey]);
        if (problem is null)
        {
            _logger.LogInformation("Chấm công QR: secret TOTP đã cấu hình.");
            return Task.CompletedTask;
        }

        _logger.Log(
            _env.IsProduction() ? LogLevel.Critical : LogLevel.Warning,
            "Chấm công QR sẽ bị TỪ CHỐI: {Problem}. Đặt ATTENDANCE_TOTP_SECRET (scripts/gen-secrets.sh) " +
            "rồi khởi động lại API.", problem);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
