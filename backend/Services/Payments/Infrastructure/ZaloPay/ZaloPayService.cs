using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Payments.Infrastructure.ZaloPay;

public class ZaloPayConfig
{
    public string AppId { get; set; } = "";
    public string Key1 { get; set; } = "";
    public string Key2 { get; set; } = "";
    public string Endpoint { get; set; } = "https://sb-openapi.zalopay.vn/v2/create";
    public string CallbackUrl { get; set; } = "";
    public string RedirectUrl { get; set; } = "";
}

public class ZaloPayService
{
    private readonly ZaloPayConfig _config;
    private readonly HttpClient _httpClient;

    public ZaloPayService(ZaloPayConfig config, HttpClient httpClient)
    {
        _config = config;
        _httpClient = httpClient;
    }

    public async Task<ZaloPayCreateResponse> CreatePayment(decimal amount, string appTransId, string description)
    {
        var embedData = JsonSerializer.Serialize(new { redirecturl = _config.RedirectUrl });
        var items = "[]";
        var rawMac = $"{_config.AppId}|{appTransId}|{_config.AppId}|{(long)amount}|{DateTime.UtcNow:yyyyMMdd}|{embedData}|{items}";
        var mac = ComputeHmacSha256(rawMac, _config.Key1);

        var formData = new Dictionary<string, string>
        {
            ["app_id"] = _config.AppId,
            ["app_trans_id"] = appTransId,
            ["app_user"] = "user",
            ["app_time"] = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(),
            ["amount"] = ((long)amount).ToString(),
            ["description"] = description,
            ["bank_code"] = "",
            ["embed_data"] = embedData,
            ["item"] = items,
            ["callback_url"] = _config.CallbackUrl,
            ["mac"] = mac
        };

        var response = await _httpClient.PostAsync(_config.Endpoint, new FormUrlEncodedContent(formData));
        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<ZaloPayCreateResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
    }

    public bool VerifyCallback(string data, string mac)
    {
        var computedMac = ComputeHmacSha256(data, _config.Key2);
        return computedMac == mac;
    }

    private static string ComputeHmacSha256(string data, string key)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return BitConverter.ToString(hash).Replace("-", "").ToLower();
    }
}

public class ZaloPayCreateResponse
{
    public int ReturnCode { get; set; }
    public string ReturnMessage { get; set; } = "";
    public string OrderUrl { get; set; } = "";
    public string ZpTransToken { get; set; } = "";
    public string QrCode { get; set; } = "";
}
