using System.Globalization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Configuration;

/// <summary>
/// Typed, cached reader over the dynamic settings an admin edits in the back office
/// (<c>SystemConfig.Configurations</c>).
///
/// It exists because that table holds real operational policy - free-shipping threshold, on-site
/// repair fee, lockout window, SLA hours - that the backend never read: every one of those numbers
/// was ALSO hardcoded in C#, so editing the admin screen changed nothing and the two values drifted
/// silently. Any module can now ask for the live value with a compile-time default next to it.
/// </summary>
public interface IAppSettings
{
    /// <summary><paramref name="fallback"/> is returned when the key is absent or blank.</summary>
    string GetString(string key, string fallback);

    int GetInt(string key, int fallback);

    /// <summary>Money and rates. Parsed invariant - see <see cref="AppSettings"/> for why.</summary>
    decimal GetDecimal(string key, decimal fallback);

    /// <summary>Accepts <c>true/false</c>, <c>1/0</c>, <c>yes/no</c>, <c>on/off</c> (case-insensitive).</summary>
    bool GetBool(string key, bool fallback);

    /// <summary>Drops the cached snapshot. Call it from whatever writes a configuration row.</summary>
    void Invalidate();
}

/// <summary>
/// Where the raw key/value rows come from. Implemented in the SystemConfig module (which owns the
/// <c>ConfigurationEntry</c> entity); BuildingBlocks must not reference a module, so it asks through
/// this interface instead.
/// </summary>
public interface IAppSettingsStore
{
    /// <summary>Every configuration row as <c>key -> value</c>. Keys compare case-insensitively.</summary>
    Task<IReadOnlyDictionary<string, string?>> LoadAllAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Store that returns nothing, registered only when no module supplied a real one. Every
/// <c>Get*</c> then answers with the caller's compile-time fallback, which is the behaviour the code
/// had before this class existed - so a module can adopt <see cref="IAppSettings"/> without waiting
/// for the SystemConfig side to land, and a misconfigured host degrades instead of failing to boot.
/// </summary>
public sealed class EmptyAppSettingsStore : IAppSettingsStore
{
    public Task<IReadOnlyDictionary<string, string?>> LoadAllAsync(CancellationToken cancellationToken = default)
        => Task.FromResult<IReadOnlyDictionary<string, string?>>(
            new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase));
}

/// <summary>
/// Caches the WHOLE settings table for <see cref="CacheDuration"/> in process memory.
///
/// One snapshot rather than one cache entry per key: the table is ~100 short rows, a request often
/// reads several of them, and a single entry makes <see cref="Invalidate"/> exact - there is no set
/// of per-key entries that can go half-stale. In-process memory rather than Redis for the hot path:
/// a settings read happens inside pricing and checkout loops where a network round trip per lookup
/// would dominate; the 60-second TTL bounds how long a second API instance can serve a stale value
/// after an admin edit, and <see cref="Invalidate"/> makes it immediate on the instance that wrote.
///
/// Parsing is <see cref="CultureInfo.InvariantCulture"/> everywhere. The server runs with a
/// Vietnamese culture in places, where <c>NumberDecimalSeparator</c> is <c>","</c> and <c>","</c> is
/// the THOUSANDS separator - so a culture-sensitive <c>decimal.Parse("1,5")</c> reads 15 on one host
/// and 1.5 on another. For a VAT rate or a shipping threshold that is a money bug, not a formatting
/// bug. Storage and parsing are invariant; only DISPLAY is localised.
/// </summary>
public sealed class AppSettings : IAppSettings
{
    public static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(60);

    private const string CacheKey = "buildingblocks:appsettings:snapshot";

    private readonly IServiceScopeFactory _scopes;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AppSettings> _logger;

    /// <summary>
    /// The store is resolved per load from a fresh scope, not injected once.
    ///
    /// <see cref="IAppSettings"/> is a singleton (it is read from pricing and checkout code that has
    /// no scope of its own), while the module that owns the configuration table will implement
    /// <see cref="IAppSettingsStore"/> over a DbContext - i.e. as a SCOPED service. Injecting it
    /// directly would be a captive dependency: the host fails to start under scope validation in
    /// Development, and in Production a single DbContext instance would be shared by every request
    /// that reads a setting. Taking <see cref="IServiceScopeFactory"/> instead lets the store be
    /// registered with any lifetime.
    /// </summary>
    public AppSettings(IServiceScopeFactory scopes, IMemoryCache cache, ILogger<AppSettings> logger)
    {
        _scopes = scopes;
        _cache = cache;
        _logger = logger;
    }

    public string GetString(string key, string fallback)
    {
        var raw = Raw(key);
        return string.IsNullOrWhiteSpace(raw) ? fallback : raw;
    }

    public int GetInt(string key, int fallback)
    {
        var raw = Raw(key);
        if (string.IsNullOrWhiteSpace(raw)) return fallback;

        if (int.TryParse(raw.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var value))
        {
            return value;
        }

        WarnUnparsable(key, raw, "int", fallback);
        return fallback;
    }

    public decimal GetDecimal(string key, decimal fallback)
    {
        var raw = Raw(key);
        if (string.IsNullOrWhiteSpace(raw)) return fallback;

        // NumberStyles.Float and NOT .Number: .Number allows THOUSANDS separators, and under
        // InvariantCulture the thousands separator is "," - so an admin who types the Vietnamese
        // decimal form "0,1" for a VAT rate got 1 (i.e. 100%) back, silently and without a warning.
        // That is the exact 10x money bug this class exists to prevent, arriving through the other
        // door. Rejecting the ambiguous form makes it fall back to the caller's compile-time default
        // AND log, which is loud and safe; it also matches GetInt, whose NumberStyles.Integer has
        // never allowed a separator either.
        if (decimal.TryParse(raw.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
        {
            return value;
        }

        WarnUnparsable(key, raw, "decimal", fallback);
        return fallback;
    }

    public bool GetBool(string key, bool fallback)
    {
        var raw = Raw(key);
        if (string.IsNullOrWhiteSpace(raw)) return fallback;

        return raw.Trim().ToLowerInvariant() switch
        {
            "true" or "1" or "yes" or "y" or "on" => true,
            "false" or "0" or "no" or "n" or "off" => false,
            _ => ReportAndFallback(key, raw, fallback)
        };
    }

    public void Invalidate() => _cache.Remove(CacheKey);

    private string? Raw(string key)
    {
        if (string.IsNullOrWhiteSpace(key)) return null;
        return Snapshot().TryGetValue(key, out var value) ? value : null;
    }

    /// <summary>
    /// The cached table. Synchronous on purpose: settings are read from deep inside synchronous
    /// pricing/validation code, and an async signature would force that whole call chain to change.
    /// The load itself runs once per TTL, off a table of ~100 rows.
    /// </summary>
    private IReadOnlyDictionary<string, string?> Snapshot()
    {
        if (_cache.TryGetValue(CacheKey, out IReadOnlyDictionary<string, string?>? cached) && cached is not null)
        {
            return cached;
        }

        IReadOnlyDictionary<string, string?> loaded;
        try
        {
            using var scope = _scopes.CreateScope();
            var store = scope.ServiceProvider.GetService<IAppSettingsStore>() ?? new EmptyAppSettingsStore();
            loaded = store.LoadAllAsync().GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            // A settings read must never take down the request that made it. Every caller passes a
            // fallback, so an empty snapshot is the documented degraded behaviour.
            _logger.LogError(ex, "Could not load dynamic settings; falling back to compile-time defaults.");
            loaded = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        }

        _cache.Set(CacheKey, loaded, CacheDuration);
        return loaded;
    }

    private bool ReportAndFallback(string key, string raw, bool fallback)
    {
        WarnUnparsable(key, raw, "bool", fallback);
        return fallback;
    }

    private void WarnUnparsable(string key, string raw, string targetType, object fallback)
        => _logger.LogWarning(
            "Setting '{Key}' = '{Raw}' is not a valid {TargetType}; using the default {Fallback}.",
            key, raw, targetType, fallback);
}

public static class AppSettingsServiceCollectionExtensions
{
    /// <summary>
    /// Registers <see cref="IAppSettings"/>. A module that owns the configuration table registers its
    /// own <see cref="IAppSettingsStore"/> BEFORE or AFTER this call - <c>TryAddSingleton</c> only
    /// fills in the empty store when nobody else did, and the store may be registered Scoped
    /// (a DbContext-backed one must be): <see cref="AppSettings"/> resolves it inside its own scope.
    /// </summary>
    public static IServiceCollection AddAppSettings(this IServiceCollection services)
    {
        services.AddMemoryCache();
        services.TryAddSingleton<IAppSettingsStore, EmptyAppSettingsStore>();
        services.TryAddSingleton<IAppSettings, AppSettings>();
        return services;
    }
}
