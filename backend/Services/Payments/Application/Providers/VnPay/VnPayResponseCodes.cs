namespace Payments.Application.Providers.VnPay;

/// <summary>
/// W2-21 bước 4 — bảng mã trả lời IPN ([S8]). Đây là bảng, không phải chuỗi `if` rải rác, vì
/// **trả sai mã = VNPay retry vô hạn hoặc kết thúc luồng khi chưa ghi được gì**.
///
/// VNPay retry tối đa **10 lần, cách nhau 5 phút** khi nhận `01`, `04`, `97`, `99` hoặc timeout.
/// Chỉ `00` và `02` kết thúc luồng. Vì vậy:
///  - ghi nhận thành công → `00`;
///  - IPN lặp lại (đã ghi trước đó) → `02` — VNPay dừng, và hệ thống KHÔNG cộng tiền lần hai;
///  - không tìm ra đơn → `01`: VNPay thử lại, phòng khi IPN chạy trước khi intent kịp commit;
///  - lệch số tiền → `04`: KHÔNG xác nhận, để kế toán đối soát; VNPay thử lại;
///  - sai chữ ký → `97`;
///  - lỗi không lường trước → `99` (mặc định an toàn: VNPay thử lại thay vì mất thông báo).
/// </summary>
public static class VnPayResponseCodes
{
    public static readonly VnPayIpnAck ConfirmSuccess = new("00", "Confirm Success");
    public static readonly VnPayIpnAck OrderNotFound = new("01", "Order not found");
    public static readonly VnPayIpnAck OrderAlreadyConfirmed = new("02", "Order already confirmed");
    public static readonly VnPayIpnAck InvalidAmount = new("04", "Invalid amount");
    public static readonly VnPayIpnAck InvalidSignature = new("97", "Invalid Checksum");
    public static readonly VnPayIpnAck UnknownError = new("99", "Unknown error");

    /// <summary>Mã làm VNPay KẾT THÚC luồng thông báo (không retry nữa).</summary>
    public static readonly IReadOnlySet<string> TerminalCodes =
        new HashSet<string>(StringComparer.Ordinal) { "00", "02" };

    /// <summary>Mã làm VNPay THỬ LẠI (tối đa 10 lần, cách nhau 5 phút).</summary>
    public static readonly IReadOnlySet<string> RetryCodes =
        new HashSet<string>(StringComparer.Ordinal) { "01", "04", "97", "99" };

    public static readonly IReadOnlyList<VnPayIpnAck> All = new[]
    {
        ConfirmSuccess, OrderNotFound, OrderAlreadyConfirmed, InvalidAmount, InvalidSignature, UnknownError
    };

    public static bool IsTerminal(string rspCode) => TerminalCodes.Contains(rspCode);

    public static bool CausesRetry(string rspCode) => !IsTerminal(rspCode);

    /// <summary>
    /// Giao dịch chỉ được coi là ĐÃ THU khi CẢ HAI trường đều `00`.
    /// `vnp_ResponseCode=00` một mình chưa đủ: `vnp_TransactionStatus` mới là kết quả cuối của
    /// giao dịch tại VNPay (ví dụ `02` = giao dịch bị lỗi sau khi đã nhận mã 00 tại bước thanh toán).
    /// </summary>
    public static bool IsPaid(string? responseCode, string? transactionStatus)
        => string.Equals(responseCode?.Trim(), "00", StringComparison.Ordinal)
           && string.Equals(transactionStatus?.Trim(), "00", StringComparison.Ordinal);

    /// <summary>
    /// Với `querydr`/`refund`, `vnp_ResponseCode` là kết quả của LỆNH TRA CỨU, còn kết quả giao dịch
    /// nằm ở `vnp_TransactionStatus`. Lệnh chạy được nhưng giao dịch chưa trả tiền vẫn là `00/01`.
    /// </summary>
    public static bool CommandAccepted(string? responseCode)
        => string.Equals(responseCode?.Trim(), "00", StringComparison.Ordinal);
}

/// <summary>Thân JSON trả cho VNPay — đúng hai trường, đúng tên hoa/thường này ([S8]).</summary>
public sealed record VnPayIpnAck(string RspCode, string Message);
