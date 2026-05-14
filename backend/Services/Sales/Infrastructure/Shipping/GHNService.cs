using System.Text;
using System.Text.Json;

namespace Sales.Infrastructure.Shipping;

public class GHNConfig
{
    public string Token { get; set; } = "";
    public string ShopId { get; set; } = "";
    public string Endpoint { get; set; } = "https://dev-online-gateway.ghn.vn/shiip/public-api";
}

public class GHNService
{
    private readonly GHNConfig _config;
    private readonly HttpClient _httpClient;

    public GHNService(GHNConfig config, HttpClient httpClient)
    {
        _config = config;
        _httpClient = httpClient;
        _httpClient.DefaultRequestHeaders.Remove("Token");
        _httpClient.DefaultRequestHeaders.Remove("ShopId");
        _httpClient.DefaultRequestHeaders.Add("Token", _config.Token);
        _httpClient.DefaultRequestHeaders.Add("ShopId", _config.ShopId);
    }

    public async Task<GHNFeeResponse> CalculateShippingFee(int toDistrictId, string toWardCode, int weight = 500)
    {
        var body = new
        {
            service_type_id = 2,
            to_district_id = toDistrictId,
            to_ward_code = toWardCode,
            weight,
            insurance_value = 0
        };

        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync($"{_config.Endpoint}/v2/shipping-order/fee", content);
        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<GHNApiResponse<GHNFeeData>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        return new GHNFeeResponse
        {
            Fee = result?.Data?.Total ?? 0,
            ExpectedDeliveryDays = result?.Data?.Expected_delivery_time ?? ""
        };
    }

    public async Task<GHNCreateOrderResponse> CreateShipment(GHNCreateOrderRequest request)
    {
        var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync($"{_config.Endpoint}/v2/shipping-order/create", content);
        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<GHNApiResponse<GHNCreateOrderData>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        return new GHNCreateOrderResponse
        {
            OrderCode = result?.Data?.order_code ?? "",
            ExpectedDeliveryTime = result?.Data?.expected_delivery_time ?? ""
        };
    }
}

// DTOs
public class GHNApiResponse<T> { public int Code { get; set; } public string Message { get; set; } = ""; public T? Data { get; set; } }
public class GHNFeeData { public int Total { get; set; } public string Expected_delivery_time { get; set; } = ""; }
public class GHNFeeResponse { public int Fee { get; set; } public string ExpectedDeliveryDays { get; set; } = ""; }

public class GHNCreateOrderRequest
{
    public string to_name { get; set; } = "";
    public string to_phone { get; set; } = "";
    public string to_address { get; set; } = "";
    public string to_ward_code { get; set; } = "";
    public int to_district_id { get; set; }
    public int weight { get; set; } = 500;
    public int service_type_id { get; set; } = 2;
    public int payment_type_id { get; set; } = 2;
    public string required_note { get; set; } = "KHONGCHOXEMHANG";
    public List<GHNItem> items { get; set; } = new();
}

public class GHNItem { public string name { get; set; } = ""; public int quantity { get; set; } public int weight { get; set; } }
public class GHNCreateOrderData { public string order_code { get; set; } = ""; public string expected_delivery_time { get; set; } = ""; }
public class GHNCreateOrderResponse { public string OrderCode { get; set; } = ""; public string ExpectedDeliveryTime { get; set; } = ""; }
