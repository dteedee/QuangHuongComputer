using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Payments.Infrastructure.MoMo;

public class MoMoConfig
{
    public string PartnerCode { get; set; } = "";
    public string AccessKey { get; set; } = "";
    public string SecretKey { get; set; } = "";
    public string Endpoint { get; set; } = "https://test-payment.momo.vn/v2/gateway/api/create";
    public string ReturnUrl { get; set; } = "";
    public string IpnUrl { get; set; } = "";
}

public class MoMoService
{
    private readonly MoMoConfig _config;
    private readonly HttpClient _httpClient;

    public MoMoService(MoMoConfig config, HttpClient httpClient)
    {
        _config = config;
        _httpClient = httpClient;
    }

    public async Task<MoMoCreateResponse> CreatePayment(decimal amount, string orderId, string orderInfo)
    {
        var requestId = Guid.NewGuid().ToString();
        var rawSignature = $"accessKey={_config.AccessKey}&amount={amount}&extraData=&ipnUrl={_config.IpnUrl}&orderId={orderId}&orderInfo={orderInfo}&partnerCode={_config.PartnerCode}&redirectUrl={_config.ReturnUrl}&requestId={requestId}&requestType=payWithMethod";

        var signature = ComputeHmacSha256(rawSignature, _config.SecretKey);

        var body = new
        {
            partnerCode = _config.PartnerCode,
            requestId,
            amount = (long)amount,
            orderId,
            orderInfo,
            redirectUrl = _config.ReturnUrl,
            ipnUrl = _config.IpnUrl,
            extraData = "",
            requestType = "payWithMethod",
            signature,
            lang = "vi"
        };

        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync(_config.Endpoint, content);
        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<MoMoCreateResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
    }

    /// <summary>
    /// W0-10: fail-closed. SecretKey rỗng/placeholder hoặc chữ ký rỗng ⇒ false (trước đây gọi hàm này
    /// bị bỏ qua khi secret rỗng). Trường thiếu ⇒ chuỗi rỗng, không ném KeyNotFoundException (500).
    /// So sánh theo thời gian hằng số.
    /// </summary>
    public bool VerifySignature(Dictionary<string, string> data, string receivedSignature)
    {
        if (!Payments.Application.Webhooks.WebhookSignature.IsConfiguredSecret(_config.SecretKey)) return false;
        if (string.IsNullOrWhiteSpace(receivedSignature)) return false;

        string F(string key) => data.GetValueOrDefault(key, "");
        var rawSignature =
            $"accessKey={_config.AccessKey}&amount={F("amount")}&extraData={F("extraData")}" +
            $"&message={F("message")}&orderId={F("orderId")}&orderInfo={F("orderInfo")}" +
            $"&orderType={F("orderType")}&partnerCode={_config.PartnerCode}&payType={F("payType")}" +
            $"&requestId={F("requestId")}&responseTime={F("responseTime")}&resultCode={F("resultCode")}" +
            $"&transId={F("transId")}";

        return Payments.Application.Webhooks.WebhookSignature.FixedTimeEqualsHex(
            ComputeHmacSha256(rawSignature, _config.SecretKey), receivedSignature);
    }

    private static string ComputeHmacSha256(string data, string key)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return BitConverter.ToString(hash).Replace("-", "").ToLower();
    }
}

public class MoMoCreateResponse
{
    public int ResultCode { get; set; }
    public string Message { get; set; } = "";
    public string PayUrl { get; set; } = "";
    public string QrCodeUrl { get; set; } = "";
    public string Deeplink { get; set; } = "";
}
