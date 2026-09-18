using System.Collections.Concurrent;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Payments.Application.Webhooks;
using Payments.Domain;

namespace Payments.Application.Configuration;

/// <summary>
/// W0-10 (D04 R2/R3) — "chỉ bật khi đã cấu hình", KHÔNG BAO GIỜ giả lập.
///
/// Một provider chỉ khả dụng khi:
///   1. `Payment:&lt;Section&gt;:Enabled=true` (COD mặc định true, các cổng khác mặc định false),
///   2. có ĐỦ khoá bắt buộc, và
///   3. không khoá nào là placeholder (`${...}`, `DEMO*`, `changeme`, toàn số 0),
///   4. trên Production: endpoint không phải sandbox, trừ khi `Payment:AllowSandbox=true`.
///
/// Không khả dụng ⇒ vắng trong `GET /api/payments/methods`, `/initiate` trả 400
/// PAYMENT_METHOD_UNAVAILABLE, route webhook trả 503. KHÔNG có đường thành công giả nào.
/// Không bao giờ log GIÁ TRỊ khoá — chỉ log TÊN khoá thiếu.
/// </summary>
public sealed class PaymentConfigGuard
{
    private readonly IConfiguration _config;
    private readonly IHostEnvironment _env;
    private readonly ILogger<PaymentConfigGuard> _logger;
    private readonly ConcurrentDictionary<PaymentProvider, PaymentMethodAvailability> _cache = new();
    private int _startupLogged;

    public PaymentConfigGuard(IConfiguration config, IHostEnvironment env, ILogger<PaymentConfigGuard> logger)
    {
        _config = config;
        _env = env;
        _logger = logger;
    }

    /// <summary>Đánh giá (có cache) một provider.</summary>
    public PaymentMethodAvailability Evaluate(PaymentProvider provider)
    {
        var result = _cache.GetOrAdd(provider, EvaluateCore);
        LogOnce();
        return result;
    }

    public bool IsAvailable(PaymentProvider provider) => Evaluate(provider).Available;

    /// <summary>Danh sách công khai cho `GET /api/payments/methods` — chỉ phương thức ĐANG bật.</summary>
    public IReadOnlyList<PaymentMethodAvailability> AvailableMethods()
        => PaymentMethodSpec.All.Keys
            .Select(Evaluate)
            .Where(m => m.Available)
            .OrderBy(m => m.SortOrder)
            .ToList();

    /// <summary>Toàn bộ trạng thái (kể cả DISABLED + khoá thiếu) — cho trang admin.</summary>
    public IReadOnlyList<PaymentMethodAvailability> AllMethods()
        => PaymentMethodSpec.All.Keys.Select(Evaluate).OrderBy(m => m.SortOrder).ToList();

    /// <summary>
    /// Lấy một giá trị cấu hình ĐÃ được xác thực là thật. false ⇒ chưa cấu hình (fail-closed).
    /// </summary>
    public bool TryGetValue(string key, out string value)
    {
        var raw = _config[key];
        if (!WebhookSignature.IsConfiguredSecret(raw))
        {
            value = string.Empty;
            return false;
        }
        value = raw!.Trim();
        return true;
    }

    public string GetValueOrEmpty(string key) => TryGetValue(key, out var v) ? v : string.Empty;

    /// <summary>
    /// Secret dùng để verify webhook của provider, theo thứ tự ưu tiên trong spec.
    /// Rỗng ⇒ route webhook PHẢI trả 503 (không bao giờ "bỏ qua kiểm tra").
    /// </summary>
    public IReadOnlyList<string> WebhookSecrets(PaymentProvider provider)
    {
        if (!PaymentMethodSpec.All.TryGetValue(provider, out var spec))
            return Array.Empty<string>();

        var found = new List<string>();
        foreach (var key in spec.WebhookSecretKeys)
            if (TryGetValue(key, out var v)) found.Add(v);
        return found;
    }

    public bool HasWebhookSecret(PaymentProvider provider) => WebhookSecrets(provider).Count > 0;

    // ---------------------------------------------------------------- nội bộ

    private PaymentMethodAvailability EvaluateCore(PaymentProvider provider)
    {
        if (!PaymentMethodSpec.All.TryGetValue(provider, out var spec))
        {
            // Stripe / ZaloPay: code đã xoá (D04) — vĩnh viễn không khả dụng.
            return new PaymentMethodAvailability(
                provider, provider.ToString().ToLowerInvariant(), provider.ToString(),
                "Phương thức này đã ngừng hỗ trợ.", false, new[] { "REMOVED" }, false, 999);
        }

        var missing = new List<string>();

        var enabledKey = $"Payment:{spec.ConfigSection}:Enabled";
        var enabledRaw = _config[enabledKey];
        var enabled = string.IsNullOrWhiteSpace(enabledRaw) || enabledRaw.Contains("${", StringComparison.Ordinal)
            ? spec.EnabledByDefault
            : bool.TryParse(enabledRaw.Trim(), out var parsed) && parsed;
        if (!enabled) missing.Add(enabledKey);

        foreach (var key in spec.RequiredKeys)
            if (!TryGetValue(key, out _)) missing.Add(key);

        // R3 — sandbox trên Production = thanh toán giả.
        if (spec.EndpointKey is not null && IsProductionSandboxViolation(spec.EndpointKey))
            missing.Add($"{spec.EndpointKey} (sandbox bị chặn trên Production)");

        return new PaymentMethodAvailability(
            provider, spec.Code, spec.DisplayName, spec.Description,
            Available: missing.Count == 0,
            MissingKeys: missing,
            RequiresRedirect: spec.RequiresRedirect,
            SortOrder: spec.SortOrder);
    }

    private bool IsProductionSandboxViolation(string endpointKey)
    {
        if (!_env.IsProduction()) return false;

        var allowSandbox = bool.TryParse(_config["Payment:AllowSandbox"], out var a) && a;
        if (allowSandbox) return false;

        var endpoint = _config[endpointKey];
        if (string.IsNullOrWhiteSpace(endpoint)) return false;

        return PaymentMethodSpec.SandboxHosts
            .Any(h => endpoint.Contains(h, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>Log ENABLED / DISABLED (thiếu: ...) đúng MỘT lần — không bao giờ log giá trị.</summary>
    private void LogOnce()
    {
        if (Interlocked.Exchange(ref _startupLogged, 1) != 0) return;
        foreach (var provider in PaymentMethodSpec.All.Keys)
        {
            var m = _cache.GetOrAdd(provider, EvaluateCore);
            if (m.Available)
                _logger.LogInformation("Payment provider {Provider} ({Code}): ENABLED", provider, m.Code);
            else
                _logger.LogWarning("Payment provider {Provider} ({Code}): DISABLED (thiếu: {Missing})",
                    provider, m.Code, string.Join(", ", m.MissingKeys));
        }
    }
}
