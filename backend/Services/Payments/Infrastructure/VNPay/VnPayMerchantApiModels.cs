using System.Globalization;
using System.Text.Json.Serialization;
using Payments.Application.Providers.VnPay;

namespace Payments.Infrastructure.VNPay;

/// <summary>
/// W2-21 bước 5-6 — thân JSON và chuỗi ký của `merchant_webapi` (`querydr` + `refund`, [S9]).
///
/// Chữ ký ở đây KHÁC hoàn toàn chữ ký của URL thanh toán: các trường nối bằng ký tự <c>|</c>,
/// **theo đúng thứ tự tài liệu**, không sắp xếp, không URL-encode. Thứ tự được gom về đúng một chỗ
/// (<see cref="QueryChecksumFields"/>, <see cref="RefundChecksumFields"/>,
/// <see cref="ResponseChecksumFields"/>) để chỉ có MỘT chỗ phải sửa nếu VNPay đổi tài liệu.
/// </summary>
public static class VnPayMerchantApi
{
    public const string QueryCommand = "querydr";
    public const string RefundCommand = "refund";

    /// <summary>Hoàn TOÀN PHẦN.</summary>
    public const string RefundTypeFull = "02";

    /// <summary>Hoàn MỘT PHẦN.</summary>
    public const string RefundTypePartial = "03";

    public static string[] QueryChecksumFields(VnPayQueryRequest r) => new[]
    {
        r.RequestId, r.Version, r.Command, r.TmnCode, r.TxnRef,
        r.TransactionDate, r.CreateDate, r.IpAddr, r.OrderInfo
    };

    public static string[] RefundChecksumFields(VnPayRefundRequest r) => new[]
    {
        r.RequestId, r.Version, r.Command, r.TmnCode, r.TransactionType, r.TxnRef,
        r.Amount, r.TransactionNo, r.TransactionDate, r.CreateBy, r.CreateDate, r.IpAddr, r.OrderInfo
    };

    /// <summary>Thứ tự trường của chữ ký PHẢN HỒI (dùng chung cho `querydr` và `refund`).</summary>
    public static string?[] ResponseChecksumFields(VnPayMerchantResponse r) => new[]
    {
        r.ResponseId, r.Command, r.ResponseCode, r.Message, r.TmnCode, r.TxnRef, r.Amount,
        r.BankCode, r.PayDate, r.TransactionNo, r.TransactionType, r.TransactionStatus,
        r.OrderInfo, r.PromotionCode, r.PromotionAmount
    };

    public static string Sign(string secret, VnPayQueryRequest r)
        => VnPaySignature.SignPipe(secret, QueryChecksumFields(r));

    public static string Sign(string secret, VnPayRefundRequest r)
        => VnPaySignature.SignPipe(secret, RefundChecksumFields(r));

    public static bool VerifyResponse(string secret, VnPayMerchantResponse r)
        => VnPaySignature.VerifyPipe(secret, r.SecureHash, ResponseChecksumFields(r));

    /// <summary>`vnp_Amount` của merchant_webapi cũng theo đơn vị nhỏ nhất (x100).</summary>
    public static string ToUnits(decimal amount)
        => ((long)Math.Round(amount * 100m, MidpointRounding.AwayFromZero)).ToString(CultureInfo.InvariantCulture);

    public static decimal? FromUnits(string? raw)
        => long.TryParse(raw?.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var units) && units > 0
            ? units / 100m
            : null;
}

/// <summary>Thân `querydr`. Tên JSON là tên trường VNPay, không phải tên C#.</summary>
public sealed class VnPayQueryRequest
{
    [JsonPropertyName("vnp_RequestId")] public string RequestId { get; set; } = string.Empty;
    [JsonPropertyName("vnp_Version")] public string Version { get; set; } = VnPayOptions.DefaultVersion;
    [JsonPropertyName("vnp_Command")] public string Command { get; set; } = VnPayMerchantApi.QueryCommand;
    [JsonPropertyName("vnp_TmnCode")] public string TmnCode { get; set; } = string.Empty;
    [JsonPropertyName("vnp_TxnRef")] public string TxnRef { get; set; } = string.Empty;
    [JsonPropertyName("vnp_OrderInfo")] public string OrderInfo { get; set; } = string.Empty;
    [JsonPropertyName("vnp_TransactionDate")] public string TransactionDate { get; set; } = string.Empty;
    [JsonPropertyName("vnp_CreateDate")] public string CreateDate { get; set; } = string.Empty;
    [JsonPropertyName("vnp_IpAddr")] public string IpAddr { get; set; } = "127.0.0.1";
    [JsonPropertyName("vnp_SecureHash")] public string SecureHash { get; set; } = string.Empty;
}

/// <summary>Thân `refund` (type 02 toàn phần / 03 một phần).</summary>
public sealed class VnPayRefundRequest
{
    [JsonPropertyName("vnp_RequestId")] public string RequestId { get; set; } = string.Empty;
    [JsonPropertyName("vnp_Version")] public string Version { get; set; } = VnPayOptions.DefaultVersion;
    [JsonPropertyName("vnp_Command")] public string Command { get; set; } = VnPayMerchantApi.RefundCommand;
    [JsonPropertyName("vnp_TmnCode")] public string TmnCode { get; set; } = string.Empty;
    [JsonPropertyName("vnp_TransactionType")] public string TransactionType { get; set; } = VnPayMerchantApi.RefundTypeFull;
    [JsonPropertyName("vnp_TxnRef")] public string TxnRef { get; set; } = string.Empty;
    [JsonPropertyName("vnp_Amount")] public string Amount { get; set; } = "0";
    [JsonPropertyName("vnp_OrderInfo")] public string OrderInfo { get; set; } = string.Empty;
    [JsonPropertyName("vnp_TransactionNo")] public string TransactionNo { get; set; } = string.Empty;
    [JsonPropertyName("vnp_TransactionDate")] public string TransactionDate { get; set; } = string.Empty;
    [JsonPropertyName("vnp_CreateBy")] public string CreateBy { get; set; } = "system";
    [JsonPropertyName("vnp_CreateDate")] public string CreateDate { get; set; } = string.Empty;
    [JsonPropertyName("vnp_IpAddr")] public string IpAddr { get; set; } = "127.0.0.1";
    [JsonPropertyName("vnp_SecureHash")] public string SecureHash { get; set; } = string.Empty;
}

/// <summary>Phản hồi chung của `querydr`/`refund`.</summary>
public sealed class VnPayMerchantResponse
{
    [JsonPropertyName("vnp_ResponseId")] public string? ResponseId { get; set; }
    [JsonPropertyName("vnp_Command")] public string? Command { get; set; }
    [JsonPropertyName("vnp_ResponseCode")] public string? ResponseCode { get; set; }
    [JsonPropertyName("vnp_Message")] public string? Message { get; set; }
    [JsonPropertyName("vnp_TmnCode")] public string? TmnCode { get; set; }
    [JsonPropertyName("vnp_TxnRef")] public string? TxnRef { get; set; }
    [JsonPropertyName("vnp_Amount")] public string? Amount { get; set; }
    [JsonPropertyName("vnp_BankCode")] public string? BankCode { get; set; }
    [JsonPropertyName("vnp_PayDate")] public string? PayDate { get; set; }
    [JsonPropertyName("vnp_TransactionNo")] public string? TransactionNo { get; set; }
    [JsonPropertyName("vnp_TransactionType")] public string? TransactionType { get; set; }
    [JsonPropertyName("vnp_TransactionStatus")] public string? TransactionStatus { get; set; }
    [JsonPropertyName("vnp_OrderInfo")] public string? OrderInfo { get; set; }
    [JsonPropertyName("vnp_PromotionCode")] public string? PromotionCode { get; set; }
    [JsonPropertyName("vnp_PromotionAmount")] public string? PromotionAmount { get; set; }
    [JsonPropertyName("vnp_SecureHash")] public string? SecureHash { get; set; }
}
