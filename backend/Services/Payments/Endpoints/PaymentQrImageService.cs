using Microsoft.AspNetCore.Http;
using Payments.Application.Configuration;
using Payments.Application.Providers.BankTransfer;
using Payments.Domain;
using QRCoder;

namespace Payments.Endpoints;

/// <summary>
/// D04 mục 2 tầng 0b — vẽ ảnh QR VietQR NGAY TRONG BACKEND bằng QRCoder.
///
/// Trước đây mã QR là một thẻ &lt;img&gt; trỏ sang `qr.sepay.vn`: số tài khoản, số tiền và nội dung
/// chuyển khoản của từng khách đi ra ngoài trong query string, và màn thanh toán chết nếu dịch vụ
/// đó chết. Ở đây payload tự dựng, ảnh tự vẽ, không có lời gọi mạng nào.
/// </summary>
public sealed class PaymentQrImageService
{
    private readonly PaymentSettings _settings;

    public PaymentQrImageService(PaymentSettings settings)
    {
        _settings = settings;
    }

    public IResult Render(PaymentIntent payment)
    {
        if (payment.Provider != PaymentProvider.SePay || string.IsNullOrWhiteSpace(payment.PaymentCode))
            return Results.NotFound();

        var bin = _settings.BankBin;
        if (!VietQrPayloadBuilder.IsValidBankBin(bin)) return Results.NotFound();

        var payload = VietQrPayloadBuilder.Build(
            bin, _settings.BankAccountNumber, payment.Amount, payment.PaymentCode!, _settings.BankAccountName);

        using var generator = new QRCodeGenerator();
        // ECC Q: mã còn đọc được khi màn hình bẩn/chụp lại, mà chưa phình kích thước như H.
        using var data = generator.CreateQrCode(payload, QRCodeGenerator.ECCLevel.Q);
        var png = new PngByteQRCode(data).GetGraphic(8);

        return Results.File(png, "image/png");
    }
}
