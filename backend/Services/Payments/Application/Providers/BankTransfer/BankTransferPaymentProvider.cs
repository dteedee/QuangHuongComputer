using Microsoft.Extensions.Logging;
using Payments.Application.Configuration;
using Payments.Domain;

namespace Payments.Application.Providers.BankTransfer;

/// <summary>
/// D04 tầng 0b/1 — chuyển khoản ngân hàng bằng mã VietQR tự sinh.
///
/// Khách không bao giờ thấy chữ "SePay": SePay chỉ là kênh tự động xác nhận (webhook) chồng lên
/// đúng phương thức này. Không có webhook thì luồng vẫn chạy — kế toán xác nhận tay bằng
/// `Payments.Reconcile`, và job hết hạn huỷ intent sau `Payment:BankTransfer:HoldHours`.
///
/// Hoàn tiền: không ngân hàng nào cho phép đẩy lệnh chuyển tiền qua API ở đây, nên
/// <see cref="IPaymentProvider.SupportsGatewayRefund"/> = false và mọi phiếu hoàn là việc thủ công.
/// </summary>
public sealed class BankTransferPaymentProvider : IPaymentProvider
{
    private readonly PaymentSettings _settings;
    private readonly ILogger<BankTransferPaymentProvider> _logger;

    public BankTransferPaymentProvider(PaymentSettings settings, ILogger<BankTransferPaymentProvider> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public PaymentProvider Provider => PaymentProvider.SePay;

    public Task<PaymentInstruction> CreateAsync(PaymentCreationContext context, CancellationToken ct = default)
    {
        var bin = _settings.BankBin;
        var account = _settings.BankAccountNumber;
        var accountName = _settings.BankAccountName;

        if (!VietQrPayloadBuilder.IsValidBankBin(bin))
        {
            // Fail-closed: BIN sai (ví dụ còn giá trị "MB" của khoá cũ) thì mã QR sẽ KHÔNG quét được.
            // Thà từ chối tại đây còn hơn đưa cho khách một mã hỏng rồi chờ kế toán dọn.
            _logger.LogError(
                "Chuyển khoản: {Key} không phải BIN 6 chữ số — không dựng được VietQR", PaymentConfigKeys.BankBin);
            throw new InvalidOperationException(
                "Cấu hình ngân hàng chưa đúng (mã BIN phải là 6 chữ số). Vui lòng liên hệ cửa hàng.");
        }

        var intent = context.Intent;
        intent.SetPaymentCode(PaymentCodeGenerator.Next());
        // ClientSecret giữ đúng mã thanh toán để bộ khớp SePay cũ (khớp theo ClientSecret) vẫn đúng.
        intent.SetExternalId($"BANK-{intent.Id}", intent.PaymentCode);

        var expiresAt = intent.ExpiresAt
            ?? DateTime.UtcNow.AddHours(_settings.BankTransferHoldHours);
        intent.SetExpiry(expiresAt);

        var payload = VietQrPayloadBuilder.Build(bin, account, context.Amount, intent.PaymentCode!, accountName);

        return Task.FromResult(PaymentInstruction.BankTransfer(new BankTransferInstruction(
            BankBin: bin,
            BankName: _settings.BankName,
            AccountNumber: account,
            AccountName: accountName,
            Amount: context.Amount,
            PaymentCode: intent.PaymentCode!,
            QrPayload: payload,
            QrImageUrl: $"/api/payments/{intent.Id}/qr.png",
            ExpiresAt: expiresAt)));
    }
}
