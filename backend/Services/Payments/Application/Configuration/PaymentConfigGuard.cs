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
    /// Như <see cref="TryGetValue"/> nhưng chấp nhận bí danh cũ của khoá
    /// (<see cref="PaymentMethodSpec.RequiredKeyAliases"/>) — cấu hình đang chạy không gãy khi
    /// W2-4 đổi `Payment:SePay:*` sang `Payment:BankTransfer:*`.
    /// </summary>
    public bool TryResolveValue(string key, out string value)
    {
        if (TryGetValue(key, out value)) return true;
        if (PaymentMethodSpec.RequiredKeyAliases.TryGetValue(key, out var alias))
            return TryGetValue(alias, out value);
        value = string.Empty;
        return false;
    }

    public string ResolveValueOrEmpty(string key) => TryResolveValue(key, out var v) ? v : string.Empty;

    /// <summary>
    /// Khoá dạng DANH SÁCH (ví dụ danh sách đối tác trả góp của D10): "đã cấu hình" nghĩa là
    /// section có ít nhất một phần tử con mang giá trị thật.
    /// </summary>
    public bool HasListValues(string key)
        => _config.GetSection(key).GetChildren()
            .Any(child => child.GetChildren().Any(g => WebhookSignature.IsConfiguredSecret(g.Value))
                          || WebhookSignature.IsConfiguredSecret(child.Value));

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
        if (!ReadEnabledFlag(enabledKey, spec)) missing.Add(enabledKey);

        foreach (var key in spec.RequiredKeys)
        {
            if (PaymentMethodSpec.ListValuedKeys.Contains(key))
            {
                if (!HasListValues(key)) missing.Add(key);
                continue;
            }

            var present = TryResolveValue(key, out var resolved);
            if (present && IsWellFormedValue(key, resolved)) continue;

            // Có giá trị nhưng SAI dạng thì nói rõ sai ở đâu, đừng báo "thiếu" một khoá đã đặt.
            missing.Add(present ? $"{key} (phải là BIN 6 chữ số)" : key);
            // Khoá còn thiếu mà có bí danh cũ: liệt kê CẢ HAI tên để người cấu hình biết
            // đặt khoá nào cũng được (và để trang admin không nói dối "chỉ thiếu khoá mới").
            if (PaymentMethodSpec.RequiredKeyAliases.TryGetValue(key, out var alias)) missing.Add(alias);
        }

        // R3 — sandbox trên Production = thanh toán giả.
        if (spec.EndpointKey is not null && IsProductionSandboxViolation(spec.EndpointKey))
            missing.Add($"{spec.EndpointKey} (sandbox bị chặn trên Production)");

        return new PaymentMethodAvailability(
            provider, spec.Code, spec.DisplayName, spec.Description,
            Available: missing.Count == 0,
            MissingKeys: missing,
            RequiresRedirect: spec.RequiresRedirect,
            SortOrder: spec.SortOrder,
            IsDirect: spec.IsDirect);
    }

    /// <summary>
    /// Một khoá có thể "đã đặt" mà giá trị vẫn vô dụng. BIN ngân hàng là ca sống: bí danh cũ
    /// <c>Payment:SePay:BankCode</c> mang "MB" — đủ để coi là đã cấu hình, nhưng
    /// <see cref="Providers.BankTransfer.VietQrPayloadBuilder"/> từ chối nó, nên phương thức sẽ
    /// hiện trong `/methods` rồi `/initiate` trả 503 PAYMENT_PROVIDER_MISCONFIGURED cho mọi khách.
    /// Kiểm dạng NGAY Ở ĐÂY để cổng chưa cấu hình ĐÚNG thì đơn giản là không tồn tại (D04 R2).
    /// </summary>
    private static bool IsWellFormedValue(string key, string value)
        => key != PaymentConfigKeys.BankBin
           || Providers.BankTransfer.VietQrPayloadBuilder.IsValidBankBin(value);

    /// <summary>`Payment:&lt;Section&gt;:Enabled`, chấp nhận cả tên khoá cũ của cùng phương thức.</summary>
    private bool ReadEnabledFlag(string enabledKey, PaymentMethodSpec spec)
    {
        foreach (var key in new[] { enabledKey }.Concat(spec.EnabledKeyAliases ?? Array.Empty<string>()))
        {
            var raw = _config[key];
            if (string.IsNullOrWhiteSpace(raw) || raw.Contains("${", StringComparison.Ordinal)) continue;
            return bool.TryParse(raw.Trim(), out var parsed) && parsed;
        }
        return spec.EnabledByDefault;
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
