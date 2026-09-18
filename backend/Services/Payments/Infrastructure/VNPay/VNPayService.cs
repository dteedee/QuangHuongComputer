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
        // W0-10: thiếu chữ ký = KHÔNG hợp lệ (không bao giờ "bỏ qua kiểm tra").
        var hasSignature = !string.IsNullOrWhiteSpace(vnp_SecureHash);
        var isValidSignature = hasSignature
            && !string.IsNullOrWhiteSpace(_config.HashSecret)
            && vnpay.ValidateSignature(vnp_SecureHash, _config.HashSecret);
        var responseCode = queryParams.TryGetValue("vnp_ResponseCode", out var rc) ? rc : "";

        return new VNPayPaymentResponse
        {
            Success = isValidSignature && responseCode == "00",
            HasSignature = hasSignature,
            TxnRef = queryParams.ContainsKey("vnp_TxnRef") ? queryParams["vnp_TxnRef"] : "",
            Amount = queryParams.TryGetValue("vnp_Amount", out var amt) && long.TryParse(amt, out var amtLong)
                ? amtLong / 100m
                : 0,
            BankCode = queryParams.ContainsKey("vnp_BankCode") ? queryParams["vnp_BankCode"] : "",
            BankTranNo = queryParams.ContainsKey("vnp_BankTranNo") ? queryParams["vnp_BankTranNo"] : "",
            CardType = queryParams.ContainsKey("vnp_CardType") ? queryParams["vnp_CardType"] : "",
            OrderInfo = queryParams.ContainsKey("vnp_OrderInfo") ? queryParams["vnp_OrderInfo"] : "",
            PayDate = queryParams.ContainsKey("vnp_PayDate") ? queryParams["vnp_PayDate"] : "",
            ResponseCode = responseCode,
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

        // W0-10: so sánh theo thời gian hằng số (trước đây dùng string.Equals).
        var checkSum = HmacSHA512(secretKey, queryString);
        return Payments.Application.Webhooks.WebhookSignature.FixedTimeEqualsHex(checkSum, inputHash);
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
