using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Payments.Application.Guest;

namespace Payments.Application.Configuration;

/// <summary>
/// D04 R3 — bước 10 của phase-22: kiểm cấu hình thanh toán NGAY KHI KHỞI ĐỘNG và nói ra kết quả.
///
/// <see cref="PaymentConfigGuard"/> vốn đánh giá lười (lần đầu ai đó hỏi), nên trước đây log
/// `ENABLED` / `DISABLED (thiếu: ...)` chỉ xuất hiện khi có khách vào trang thanh toán — nghĩa là
/// người vận hành không có cách nào biết cổng nào đang tắt cho tới lúc đã muộn.
/// Ở đây nó được ép chạy một lần lúc boot. KHÔNG BAO GIỜ log giá trị khoá, chỉ TÊN khoá thiếu.
/// </summary>
public sealed class PaymentConfigStartupValidator : IHostedService
{
    private readonly PaymentConfigGuard _guard;
    private readonly PaymentSettings _settings;
    private readonly GuestOrderTokenService _guestTokens;
    private readonly ILogger<PaymentConfigStartupValidator> _logger;

    public PaymentConfigStartupValidator(
        PaymentConfigGuard guard,
        PaymentSettings settings,
        GuestOrderTokenService guestTokens,
        ILogger<PaymentConfigStartupValidator> logger)
    {
        _guard = guard;
        _settings = settings;
        _guestTokens = guestTokens;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        // Gọi AllMethods() ép PaymentConfigGuard in bảng ENABLED / DISABLED một lần.
        var methods = _guard.AllMethods();
        var enabled = methods.Where(m => m.Available).Select(m => m.Code).ToArray();

        _logger.LogInformation(
            "Thanh toán: {Count}/{Total} phương thức đang bật [{Codes}]",
            enabled.Length, methods.Count, string.Join(", ", enabled));

        if (enabled.Length == 0)
            _logger.LogError("Thanh toán: KHÔNG có phương thức nào đang bật — khách sẽ không đặt hàng được.");

        // Cảnh báo cấu hình sai kiểu "gần đúng nhưng không dùng được".
        var bin = _settings.BankBin;
        if (bin.Length > 0 && !Providers.BankTransfer.VietQrPayloadBuilder.IsValidBankBin(bin))
            _logger.LogError(
                "Thanh toán: {Key} không phải BIN 6 chữ số — mã VietQR sẽ không quét được",
                PaymentConfigKeys.BankBin);

        _logger.LogInformation(
            "Thanh toán: giữ đơn chuyển khoản {Hours}h, trần COD {Cap}, thanh toán khách vãng lai {Guest}",
            _settings.BankTransferHoldHours,
            _settings.CodMaxOrderAmount <= 0 ? "TẮT" : _settings.CodMaxOrderAmount.ToString("N0"),
            _guestTokens.IsEnabled ? "BẬT" : $"TẮT (thiếu {GuestOrderTokenService.SecretKey})");

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
