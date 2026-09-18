using System.Globalization;
using Microsoft.Extensions.Logging;
using Payments.Domain;

namespace Payments.Application.Providers.VnPay;

/// <summary>
/// W2-21 bước 4 — **nguồn DUY NHẤT được phép ghi kết quả thanh toán VNPay** (D04 mục 4).
///
/// ReturnUrl của trình duyệt chỉ verify rồi redirect: khách đóng tab không được đổi kết quả, và
/// một người tự mở lại URL return không được tạo ra khoản thu nào.
///
/// Thứ tự kiểm, không có đường tắt nào:
///   1. chữ ký HMAC-SHA512 (so sánh hằng thời gian) → sai: `97`;
///   2. `vnp_TxnRef` phải khôi phục được intent id → sai: `01`;
///   3. `vnp_Amount / 100` phải KHỚP số tiền intent — số tiền client gửi không bao giờ được tin;
///      lệch: `04` và KHÔNG xác nhận (kế toán đối soát tay);
///   4. chống lặp theo `(VNPay, txnRef:transactionNo)` — IPN phát lại: `02`, không cộng tiền lần hai;
///   5. còn lại: `00`.
/// Ngoại lệ ngoài dự kiến → `99` để VNPay còn thử lại, thay vì nuốt mất một thông báo tiền về.
/// </summary>
public sealed class VnPayIpnProcessor
{
    /// <summary>Tên provider ghi vào `ProcessedWebhooks.Provider` — giữ nguyên chuỗi của W0-10.</summary>
    public const string ProviderTag = "VNPay";

    private readonly PaymentWebhookHandler _handler;
    private readonly ILogger<VnPayIpnProcessor> _logger;

    public VnPayIpnProcessor(PaymentWebhookHandler handler, ILogger<VnPayIpnProcessor> logger)
    {
        _handler = handler;
        _logger = logger;
    }

    public async Task<VnPayIpnAck> ProcessAsync(
        IReadOnlyDictionary<string, string?> query, string hashSecret, CancellationToken ct = default)
    {
        var txnRef = Read(query, "vnp_TxnRef");

        if (!VnPaySignature.Verify(hashSecret, query, VnPaySignature.ExtractHash(query)))
        {
            // Không log chữ ký, không log secret — chỉ nói rằng đã từ chối.
            _logger.LogWarning("VNPay IPN: chữ ký không hợp lệ hoặc thiếu — trả {Code}",
                VnPayResponseCodes.InvalidSignature.RspCode);
            return VnPayResponseCodes.InvalidSignature;
        }

        if (!VnPayPaymentUrlBuilder.TryParseIntentId(txnRef, out var intentId))
        {
            _logger.LogWarning("VNPay IPN: vnp_TxnRef không khôi phục được intent id");
            return VnPayResponseCodes.OrderNotFound;
        }

        if (!TryReadAmount(query, out var amount))
        {
            _logger.LogError("VNPay IPN: vnp_Amount không đọc được cho intent {IntentId}", intentId);
            return VnPayResponseCodes.InvalidAmount;
        }

        var responseCode = Read(query, "vnp_ResponseCode");
        var transactionStatus = Read(query, "vnp_TransactionStatus");
        var paid = VnPayResponseCodes.IsPaid(responseCode, transactionStatus);

        try
        {
            var result = await _handler.ProcessAsync(
                provider: ProviderTag,
                transactionId: BuildDedupeKey(txnRef!, Read(query, "vnp_TransactionNo")),
                paymentIntentId: intentId,
                success: paid,
                failureReason: paid ? null : Infrastructure.VNPay.VNPayErrorMessages.Describe(responseCode),
                gatewayAmount: amount,
                ct: ct);

            if (result.AmountMismatch)
            {
                _logger.LogError(
                    "VNPay IPN: LỆCH SỐ TIỀN cho intent {IntentId} — không xác nhận, chờ đối soát", intentId);
                return VnPayResponseCodes.InvalidAmount;
            }

            if (!result.Processed && !result.WasIdempotent)
            {
                _logger.LogWarning("VNPay IPN: không tìm thấy intent {IntentId}", intentId);
                return VnPayResponseCodes.OrderNotFound;
            }

            // Lần trước KHÔNG tìm ra intent: `PaymentWebhookHandler` vẫn ghi một bản "Ignored" với
            // PaymentIntentId = null. Nếu trả 02 ở đây, VNPay dừng retry và một khoản tiền đã thu
            // thật sẽ không bao giờ được ghi nhận (IPN chạy trước khi intent kịp commit). Trả 01 để
            // VNPay còn thử lại trong 10 lần / 5 phút của nó.
            if (result.WasIdempotent && result.PaymentIntentId is null)
            {
                _logger.LogWarning(
                    "VNPay IPN phát lại nhưng lần trước không tìm ra intent {IntentId} — xin VNPay thử lại", intentId);
                return VnPayResponseCodes.OrderNotFound;
            }

            if (result.WasIdempotent)
            {
                _logger.LogInformation("VNPay IPN phát lại cho intent {IntentId} — không đổi gì", intentId);
                return VnPayResponseCodes.OrderAlreadyConfirmed;
            }

            _logger.LogInformation(
                "VNPay IPN: intent {IntentId} ghi nhận {Outcome} {Amount} VND",
                intentId, paid ? "THÀNH CÔNG" : "THẤT BẠI", amount);
            return VnPayResponseCodes.ConfirmSuccess;
        }
        catch (Exception ex)
        {
            // 99 ⇒ VNPay thử lại (tối đa 10 lần / 5 phút). Nuốt lỗi bằng 00 sẽ mất hẳn thông báo này.
            _logger.LogError(ex, "VNPay IPN: lỗi không lường trước khi xử lý intent {IntentId}", intentId);
            return VnPayResponseCodes.UnknownError;
        }
    }

    /// <summary>
    /// Khoá chống lặp. Chỉ dùng `vnp_TransactionNo` là KHÔNG an toàn: giao dịch thất bại được VNPay
    /// trả về `vnp_TransactionNo=0`, nên mọi đơn hỏng trên toàn hệ thống sẽ đụng cùng một khoá và
    /// đơn thứ hai bị bỏ qua nhầm. Ghép thêm `vnp_TxnRef` (duy nhất mỗi lần thử) là đủ và vẫn giữ
    /// đúng tính chất "IPN phát lại ⇒ cùng khoá".
    /// </summary>
    public static string BuildDedupeKey(string txnRef, string? transactionNo)
    {
        var no = string.IsNullOrWhiteSpace(transactionNo) ? "0" : transactionNo.Trim();
        var key = $"{txnRef.Trim()}:{no}";
        return key.Length > 200 ? key[..200] : key;
    }

    /// <summary>`vnp_Amount` là đơn vị nhỏ nhất (x100). Chia 100 rồi MỚI so với intent.</summary>
    public static bool TryReadAmount(IReadOnlyDictionary<string, string?> query, out decimal amount)
    {
        amount = 0m;
        var raw = Read(query, "vnp_Amount");
        if (string.IsNullOrWhiteSpace(raw)) return false;
        if (!long.TryParse(raw.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var units))
            return false;
        if (units <= 0) return false;
        amount = units / 100m;
        return true;
    }

    private static string? Read(IReadOnlyDictionary<string, string?> query, string key)
        => query.TryGetValue(key, out var v) ? v : null;
}
