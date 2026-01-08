using System.Security.Cryptography;
using System.Text;
using System.Web;

namespace Payments.Infrastructure.VNPay;

public class VNPayService
{
    private readonly VNPayConfig _config;

    public VNPayService(VNPayConfig config)
    {
        _config = config;
    }

    public string CreatePaymentUrl(VNPayPaymentRequest request)
    {
        var vnpay = new VNPayLibrary();
        
        vnpay.AddRequestData("vnp_Version", _config.Version);
        vnpay.AddRequestData("vnp_Command", "pay");
        vnpay.AddRequestData("vnp_TmnCode", _config.TmnCode);
        vnpay.AddRequestData("vnp_Amount", (request.Amount * 100).ToString()); // VNPay uses smallest unit
        vnpay.AddRequestData("vnp_CreateDate", request.CreateDate.ToString("yyyyMMddHHmmss"));
        vnpay.AddRequestData("vnp_CurrCode", "VND");
        vnpay.AddRequestData("vnp_IpAddr", request.IpAddress);
        vnpay.AddRequestData("vnp_Locale", request.Locale ?? "vn");
        vnpay.AddRequestData("vnp_OrderInfo", request.OrderInfo);
        vnpay.AddRequestData("vnp_OrderType", request.OrderType ?? "other");
        vnpay.AddRequestData("vnp_ReturnUrl", _config.ReturnUrl);
        vnpay.AddRequestData("vnp_TxnRef", request.TxnRef);
        
        if (!string.IsNullOrEmpty(request.BankCode))
        {
            vnpay.AddRequestData("vnp_BankCode", request.BankCode);
        }

        var paymentUrl = vnpay.CreateRequestUrl(_config.PaymentUrl, _config.HashSecret);
        return paymentUrl;
    }

    public VNPayPaymentResponse ProcessCallback(Dictionary<string, string> queryParams)
    {
        var vnpay = new VNPayLibrary();
        
        foreach (var param in queryParams)
        {
            if (!string.IsNullOrEmpty(param.Key) && param.Key.StartsWith("vnp_"))
            {
                vnpay.AddResponseData(param.Key, param.Value);
            }
        }

        var vnp_SecureHash = queryParams.ContainsKey("vnp_SecureHash") ? queryParams["vnp_SecureHash"] : "";
        var isValidSignature = vnpay.ValidateSignature(vnp_SecureHash, _config.HashSecret);

        return new VNPayPaymentResponse
        {
            Success = isValidSignature && queryParams["vnp_ResponseCode"] == "00",
            TxnRef = queryParams.ContainsKey("vnp_TxnRef") ? queryParams["vnp_TxnRef"] : "",
            Amount = queryParams.ContainsKey("vnp_Amount") ? long.Parse(queryParams["vnp_Amount"]) / 100 : 0,
            BankCode = queryParams.ContainsKey("vnp_BankCode") ? queryParams["vnp_BankCode"] : "",
            BankTranNo = queryParams.ContainsKey("vnp_BankTranNo") ? queryParams["vnp_BankTranNo"] : "",
            CardType = queryParams.ContainsKey("vnp_CardType") ? queryParams["vnp_CardType"] : "",
            OrderInfo = queryParams.ContainsKey("vnp_OrderInfo") ? queryParams["vnp_OrderInfo"] : "",
            PayDate = queryParams.ContainsKey("vnp_PayDate") ? queryParams["vnp_PayDate"] : "",
            ResponseCode = queryParams.ContainsKey("vnp_ResponseCode") ? queryParams["vnp_ResponseCode"] : "",
            TransactionNo = queryParams.ContainsKey("vnp_TransactionNo") ? queryParams["vnp_TransactionNo"] : "",
            TransactionStatus = queryParams.ContainsKey("vnp_TransactionStatus") ? queryParams["vnp_TransactionStatus"] : "",
            IsValidSignature = isValidSignature
        };
    }
}

public class VNPayLibrary
{
    private readonly SortedList<string, string> _requestData = new();
    private readonly SortedList<string, string> _responseData = new();

    public void AddRequestData(string key, string value)
    {
        if (!string.IsNullOrEmpty(value))
        {
            _requestData.Add(key, value);
        }
    }

    public void AddResponseData(string key, string value)
    {
        if (!string.IsNullOrEmpty(value))
        {
            _responseData.Add(key, value);
        }
    }

    public string CreateRequestUrl(string baseUrl, string hashSecret)
    {
        var data = new StringBuilder();
        foreach (var kv in _requestData)
        {
            if (!string.IsNullOrEmpty(kv.Value))
            {
                data.Append(HttpUtility.UrlEncode(kv.Key) + "=" + HttpUtility.UrlEncode(kv.Value) + "&");
            }
        }

        var queryString = data.ToString();
        if (queryString.EndsWith("&"))
        {
            queryString = queryString.Substring(0, queryString.Length - 1);
        }

        var signData = queryString;
        var vnpSecureHash = HmacSHA512(hashSecret, signData);
        
        return $"{baseUrl}?{queryString}&vnp_SecureHash={vnpSecureHash}";
    }

    public bool ValidateSignature(string inputHash, string secretKey)
    {
        var data = new StringBuilder();
        foreach (var kv in _responseData)
        {
            if (!string.IsNullOrEmpty(kv.Value) && kv.Key != "vnp_SecureHash" && kv.Key != "vnp_SecureHashType")
            {
                data.Append(HttpUtility.UrlEncode(kv.Key) + "=" + HttpUtility.UrlEncode(kv.Value) + "&");
            }
        }

        var queryString = data.ToString();
        if (queryString.EndsWith("&"))
        {
            queryString = queryString.Substring(0, queryString.Length - 1);
        }

        var checkSum = HmacSHA512(secretKey, queryString);
        return checkSum.Equals(inputHash, StringComparison.InvariantCultureIgnoreCase);
    }

    private string HmacSHA512(string key, string inputData)
    {
        var hash = new StringBuilder();
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var inputBytes = Encoding.UTF8.GetBytes(inputData);
        
        using (var hmac = new HMACSHA512(keyBytes))
        {
            var hashValue = hmac.ComputeHash(inputBytes);
            foreach (var b in hashValue)
            {
                hash.Append(b.ToString("x2"));
            }
        }

        return hash.ToString();
    }
}

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
}
