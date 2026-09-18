using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Payments.Application.Providers;
using Payments.Application.Providers.VnPay;
using Payments.Domain;

namespace Payments.Infrastructure.VNPay;

/// <summary>
/// W2-21 bước 5-6 — gọi `merchant_webapi` của VNPay: `querydr` (đối soát) và `refund` (02/03).
///
/// Luật tiền của D04 áp ở đây, không ở nơi gọi:
///  - **Không bao giờ** báo "đã hoàn" khi chưa xác thực được chữ ký phản hồi. Chữ ký sai/không đọc
///    được ⇒ <see cref="GatewayRefundResult.Failed"/> kèm câu nói rõ "kiểm tra trên cổng VNPay
///    TRƯỚC khi chuyển tiền tay" — phiếu rơi về hàng đợi thủ công của kế toán thay vì biến mất,
///    và không ai bị dụ hoàn tiền lần hai.
///  - `querydr` chỉ TRẢ LỜI, không tự xác nhận. Không đọc được ⇒ <see cref="GatewayQueryResult.Unknown"/>.
///  - Số tiền VNPay trả về luôn được so lại với intent trước khi coi là đã thu.
/// Không log thân request/response (chứa chữ ký) — chỉ log mã lệnh và mã kết quả.
/// </summary>
public sealed class VnPayMerchantApiClient
{
    public const string HttpClientName = "vnpay-merchant";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _http;
    private readonly VnPayOptions _options;
    private readonly ILogger _logger;

    public VnPayMerchantApiClient(HttpClient http, VnPayOptions options, ILogger logger)
    {
        _http = http;
        _options = options;
        _logger = logger;
    }

    /// <summary>Tra cứu trạng thái thật của một intent còn treo. Không bao giờ tự đổi trạng thái.</summary>
    public async Task<GatewayQueryResult> QueryAsync(PaymentIntent intent, CancellationToken ct)
    {
        if (!_options.IsConfigured) return GatewayQueryResult.Unknown();

        var txnRef = ResolveTxnRef(intent);
        if (txnRef is null) return GatewayQueryResult.Unknown();

        var request = new VnPayQueryRequest
        {
            RequestId = NewRequestId(),
            Version = _options.Version,
            TmnCode = _options.TmnCode,
            TxnRef = txnRef,
            OrderInfo = $"Tra cuu giao dich {intent.Id:N}",
            TransactionDate = ResolveTransactionDate(intent, txnRef),
            CreateDate = VnPayPaymentUrlBuilder.FormatVnDate(DateTimeOffset.UtcNow),
            IpAddr = "127.0.0.1"
        };
        request.SecureHash = VnPayMerchantApi.Sign(_options.HashSecret, request);

        var response = await PostAsync(request, VnPayMerchantApi.QueryCommand, ct);
        if (response is null) return GatewayQueryResult.Unknown();

        if (!VnPayMerchantApi.VerifyResponse(_options.HashSecret, response))
        {
            _logger.LogError(
                "VNPay querydr: chữ ký phản hồi KHÔNG hợp lệ cho intent {IntentId} — coi như chưa biết", intent.Id);
            return GatewayQueryResult.Unknown();
        }

        if (!VnPayResponseCodes.CommandAccepted(response.ResponseCode))
        {
            _logger.LogWarning(
                "VNPay querydr cho intent {IntentId} trả mã {Code}", intent.Id, response.ResponseCode);
            return GatewayQueryResult.Unknown();
        }

        if (!VnPayResponseCodes.IsPaid("00", response.TransactionStatus))
            return GatewayQueryResult.NotPaid($"vnp_TransactionStatus={response.TransactionStatus}");

        var amount = VnPayMerchantApi.FromUnits(response.Amount);
        if (amount is null || amount.Value != intent.Amount)
        {
            // Cổng nói đã thu nhưng số tiền không khớp: đây là ca đối soát tay, không phải ca tự xác nhận.
            _logger.LogError(
                "VNPay querydr: intent {IntentId} lệch số tiền (cổng {Gateway}, intent {Expected})",
                intent.Id, amount, intent.Amount);
            return GatewayQueryResult.NotPaid("Lệch số tiền giữa cổng và đơn hàng");
        }

        var reference = string.IsNullOrWhiteSpace(response.TransactionNo) ? txnRef : response.TransactionNo!;
        return GatewayQueryResult.Paid(amount.Value, reference);
    }

    /// <summary>
    /// Hoàn tiền qua cổng: type 02 khi hoàn hết, 03 khi hoàn một phần.
    /// <paramref name="transactionNo"/> là `vnp_TransactionNo` của lần thu, do người gọi tra từ
    /// `ProcessedWebhooks` (ở đây không đụng DB).
    /// </summary>
    public async Task<GatewayRefundResult> RefundAsync(
        PaymentIntent intent, decimal amount, string? transactionNo, CancellationToken ct)
    {
        if (!_options.IsConfigured)
            return GatewayRefundResult.Failed("VNPay chưa được cấu hình");

        var txnRef = ResolveTxnRef(intent);
        if (txnRef is null)
            return GatewayRefundResult.Failed("Giao dịch VNPay thiếu mã tham chiếu (vnp_TxnRef)");

        var isFull = intent.AmountRefunded + amount >= intent.Amount;
        var request = new VnPayRefundRequest
        {
            RequestId = NewRequestId(),
            Version = _options.Version,
            TmnCode = _options.TmnCode,
            TransactionType = isFull ? VnPayMerchantApi.RefundTypeFull : VnPayMerchantApi.RefundTypePartial,
            TxnRef = txnRef,
            Amount = VnPayMerchantApi.ToUnits(amount),
            OrderInfo = VnPayPaymentUrlBuilder.BuildOrderInfo($"hoan tien {intent.Id:N}"),
            TransactionNo = transactionNo?.Trim() ?? string.Empty,
            TransactionDate = ResolveTransactionDate(intent, txnRef),
            CreateBy = "system",
            CreateDate = VnPayPaymentUrlBuilder.FormatVnDate(DateTimeOffset.UtcNow),
            IpAddr = "127.0.0.1"
        };
        request.SecureHash = VnPayMerchantApi.Sign(_options.HashSecret, request);

        var response = await PostAsync(request, VnPayMerchantApi.RefundCommand, ct);
        if (response is null)
            return GatewayRefundResult.Failed("Không gọi được API hoàn tiền VNPay — xử lý thủ công");

        if (!VnPayMerchantApi.VerifyResponse(_options.HashSecret, response))
        {
            _logger.LogError("VNPay refund: chữ ký phản hồi KHÔNG hợp lệ cho intent {IntentId}", intent.Id);
            return GatewayRefundResult.Failed(
                "VNPay đã nhận lệnh hoàn nhưng KHÔNG xác thực được chữ ký phản hồi — "
                + "kiểm tra trên cổng VNPay TRƯỚC khi chuyển tiền tay");
        }

        if (!VnPayResponseCodes.CommandAccepted(response.ResponseCode))
            return GatewayRefundResult.Failed(
                $"VNPay từ chối hoàn tiền (mã {response.ResponseCode}: {response.Message})");

        if (!VnPayResponseCodes.IsPaid("00", response.TransactionStatus))
            return GatewayRefundResult.Failed(
                $"VNPay chưa hoàn xong (vnp_TransactionStatus={response.TransactionStatus}) — theo dõi thủ công");

        var reference = string.IsNullOrWhiteSpace(response.TransactionNo)
            ? $"{txnRef}:{request.RequestId}"
            : response.TransactionNo!;
        _logger.LogInformation("VNPay refund {Type} thành công cho intent {IntentId}",
            request.TransactionType, intent.Id);
        return GatewayRefundResult.Ok(reference);
    }

    private async Task<VnPayMerchantResponse?> PostAsync(object body, string command, CancellationToken ct)
    {
        try
        {
            using var httpResponse = await _http.PostAsJsonAsync(_options.ApiUrl, body, Json, ct);
            if (!httpResponse.IsSuccessStatusCode)
            {
                _logger.LogError("VNPay {Command}: HTTP {Status}", command, (int)httpResponse.StatusCode);
                return null;
            }
            return await httpResponse.Content.ReadFromJsonAsync<VnPayMerchantResponse>(Json, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogError(ex, "VNPay {Command}: gọi cổng thất bại", command);
            return null;
        }
    }

    /// <summary>`vnp_TxnRef` được lưu lên intent lúc tạo lệnh (<see cref="PaymentIntent.ExternalId"/>).</summary>
    private static string? ResolveTxnRef(PaymentIntent intent)
        => string.IsNullOrWhiteSpace(intent.ExternalId) ? null : intent.ExternalId.Trim();

    /// <summary>
    /// `vnp_TransactionDate` phải bằng `vnp_CreateDate` đã gửi khi tạo lệnh. Đuôi của `vnp_TxnRef`
    /// mang đúng mốc đó; chỉ khi mã không đúng định dạng mới phải suy ra từ `CreatedAt`.
    /// </summary>
    private static string ResolveTransactionDate(PaymentIntent intent, string txnRef)
        => VnPayPaymentUrlBuilder.TryParseCreateDate(txnRef, out var fromRef)
            ? fromRef
            : VnPayPaymentUrlBuilder.FormatVnDate(new DateTimeOffset(
                DateTime.SpecifyKind(intent.CreatedAt, DateTimeKind.Utc)));

    /// <summary>`vnp_RequestId` phải duy nhất mỗi lần gọi (tối đa 32 ký tự).</summary>
    private static string NewRequestId() => Guid.NewGuid().ToString("N");
}
