namespace Payments.Infrastructure.VNPay;

// W0-10: tách khỏi VNPayService.cs để giữ mỗi file dưới 200 dòng. Không đổi hành vi.

public class VNPayConfig
{
    public string TmnCode { get; set; } = string.Empty;
    public string HashSecret { get; set; } = string.Empty;
    public string PaymentUrl { get; set; } = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    public string ReturnUrl { get; set; } = string.Empty;
    public string Version { get; set; } = "2.1.0";
}

public class VNPayPaymentRequest
{
    public string TxnRef { get; set; } = string.Empty; // Order ID or Payment Intent ID
    public decimal Amount { get; set; }
    public string OrderInfo { get; set; } = string.Empty;
    public string OrderType { get; set; } = "other";
    public string IpAddress { get; set; } = string.Empty;
    public DateTime CreateDate { get; set; } = DateTime.Now;
    public string? Locale { get; set; } = "vn";
    public string? BankCode { get; set; }
}

public class VNPayPaymentResponse
{
    public bool Success { get; set; }
    public string TxnRef { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string BankCode { get; set; } = string.Empty;
    public string BankTranNo { get; set; } = string.Empty;
    public string CardType { get; set; } = string.Empty;
    public string OrderInfo { get; set; } = string.Empty;
    public string PayDate { get; set; } = string.Empty;
    public string ResponseCode { get; set; } = string.Empty;
    public string TransactionNo { get; set; } = string.Empty;
    public string TransactionStatus { get; set; } = string.Empty;
    public bool IsValidSignature { get; set; }

    /// <summary>W0-10: callback có mang `vnp_SecureHash` hay không (thiếu ⇒ 401, không phải 400).</summary>
    public bool HasSignature { get; set; }
}
