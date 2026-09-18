using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Payments.Application.Configuration;

namespace Payments.Infrastructure.SePay;

/// <summary>
/// D04 mục 4 — đọc sổ giao dịch SePay (`userapi/transactions/list`) để đối soát các intent còn treo.
///
/// Đây là đường ĐỌC, không bao giờ là đường xác nhận: nó chỉ mang các khoản tiền vào về để
/// <see cref="Application.SePayPaymentMatcher"/> khớp theo mã thanh toán + số tiền, hoặc để chúng
/// rơi vào hàng "Chưa gán". Không có token ⇒ <see cref="IsConfigured"/> = false ⇒ job bỏ qua,
/// KHÔNG có nhánh giả lập.
/// </summary>
public sealed class SePayTransactionListClient
{
    public const string HttpClientName = "sepay-userapi";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly PaymentConfigGuard _guard;
    private readonly IConfiguration _config;
    private readonly ILogger<SePayTransactionListClient> _logger;

    public SePayTransactionListClient(
        IHttpClientFactory httpClientFactory,
        PaymentConfigGuard guard,
        IConfiguration config,
        ILogger<SePayTransactionListClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _guard = guard;
        _config = config;
        _logger = logger;
    }

    public bool IsConfigured => _guard.TryGetValue(PaymentConfigKeys.SePayApiToken, out _);

    private string BaseUrl
    {
        get
        {
            var configured = _config[PaymentConfigKeys.SePayApiBaseUrl];
            return string.IsNullOrWhiteSpace(configured) || configured.Contains("${", StringComparison.Ordinal)
                ? "https://my.sepay.vn"
                : configured.TrimEnd('/');
        }
    }

    /// <summary>
    /// Các giao dịch kể từ <paramref name="since"/>. Trả về danh sách rỗng khi chưa cấu hình hoặc
    /// khi gọi lỗi — đối soát thất bại KHÔNG BAO GIỜ được biến thành "không có giao dịch nào" âm thầm,
    /// nên mọi lỗi đều được log ở mức Warning kèm mã HTTP.
    /// </summary>
    public async Task<IReadOnlyList<SePayApiTransaction>> ListAsync(DateTime since, int limit, CancellationToken ct)
    {
        if (!_guard.TryGetValue(PaymentConfigKeys.SePayApiToken, out var token))
        {
            _logger.LogDebug("Đối soát SePay bỏ qua: {Key} chưa cấu hình", PaymentConfigKeys.SePayApiToken);
            return Array.Empty<SePayApiTransaction>();
        }

        var url = $"{BaseUrl}/userapi/transactions/list" +
                  $"?transaction_date_min={Uri.EscapeDataString(since.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture))}" +
                  $"&limit={Math.Clamp(limit, 1, 500)}";

        try
        {
            using var client = _httpClientFactory.CreateClient(HttpClientName);
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            using var response = await client.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("SePay userapi trả {Status} — bỏ qua vòng đối soát này", (int)response.StatusCode);
                return Array.Empty<SePayApiTransaction>();
            }

            var body = await response.Content.ReadAsStringAsync(ct);
            var parsed = JsonSerializer.Deserialize<SePayTransactionListResponse>(body, JsonOptions);
            return parsed?.Transactions ?? (IReadOnlyList<SePayApiTransaction>)Array.Empty<SePayApiTransaction>();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogWarning(ex, "Không gọi được SePay userapi — bỏ qua vòng đối soát này");
            return Array.Empty<SePayApiTransaction>();
        }
    }
}

public sealed class SePayTransactionListResponse
{
    public List<SePayApiTransaction> Transactions { get; set; } = new();
}

/// <summary>Một dòng sổ phụ theo tên trường của SePay userapi.</summary>
public sealed class SePayApiTransaction
{
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("transaction_date")]
    public string TransactionDate { get; set; } = string.Empty;

    [JsonPropertyName("account_number")]
    public string AccountNumber { get; set; } = string.Empty;

    [JsonPropertyName("amount_in")]
    public decimal AmountIn { get; set; }

    [JsonPropertyName("amount_out")]
    public decimal AmountOut { get; set; }

    [JsonPropertyName("transaction_content")]
    public string? TransactionContent { get; set; }

    [JsonPropertyName("reference_number")]
    public string? ReferenceNumber { get; set; }

    public string? Code { get; set; }

    [JsonPropertyName("bank_brand_name")]
    public string? BankBrandName { get; set; }

    public DateTime ParsedDate =>
        DateTime.TryParse(TransactionDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)
            ? d
            : DateTime.UtcNow;
}
