using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace BuildingBlocks.Caching;

/// <summary>
/// Generic cache service for distributed caching
/// </summary>
public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) where T : class;
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default) where T : class;
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
    Task RemoveByPatternAsync(string pattern, CancellationToken cancellationToken = default);
    Task ClearAsync();
    Task<bool> ExistsAsync(string key);
    Task<long> GetSizeAsync();
    Task<Dictionary<string, object>> GetStatsAsync();
}

public class CacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private const int DefaultExpirationMinutes = 30;

    public CacheService(IDistributedCache cache)
    {
        _cache = cache;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) where T : class
    {
        try
        {
            var cachedValue = await _cache.GetStringAsync(key, cancellationToken);
            
            if (string.IsNullOrEmpty(cachedValue))
                return default;

            return JsonSerializer.Deserialize<T>(cachedValue);
        }
        catch
        {
            // Log cache read error
            return default;
        }
    }

    public async Task SetAsync<T>(
        string key,
        T value,
        TimeSpan? expiration = null,
        CancellationToken cancellationToken = default) where T : class
    {
        try
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromMinutes(DefaultExpirationMinutes)
            };

            var serialized = JsonSerializer.Serialize(value);
            await _cache.SetStringAsync(key, serialized, options, cancellationToken);
        }
        catch
        {
            // Log cache write error
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            await _cache.RemoveAsync(key, cancellationToken);
        }
        catch
        {
            // Log cache remove error
        }
    }

    public async Task RemoveByPatternAsync(string pattern, CancellationToken cancellationToken = default)
    {
        // Note: IDistributedCache doesn't support pattern removal natively
        // This would require implementing a custom approach or using a cache that supports it
        // For now, this is a placeholder for when using Redis directly
        await Task.CompletedTask;
    }

    public async Task ClearAsync()
    {
        // IDistributedCache doesn't support full clear
        await Task.CompletedTask;
    }

    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            var value = await _cache.GetAsync(key);
            return value != null;
        }
        catch
        {
            return false;
        }
    }

    public async Task<long> GetSizeAsync()
    {
        // Not supported by IDistributedCache
        return 0;
    }

    public async Task<Dictionary<string, object>> GetStatsAsync()
    {
        // Not supported by IDistributedCache
        return new Dictionary<string, object>();
    }
}

/// <summary>
/// Cache key constants and builders
/// </summary>
public static class CacheKeys
{
    private const string Prefix = "cache:";

    // Products
    public static string ProductKey(Guid id) => $"{Prefix}product:{id}";
    public static string ProductsListKey(int page, int pageSize, Guid? categoryId, Guid? brandId, string? search)
        => $"{Prefix}products:list:{page}:{pageSize}:{categoryId}:{brandId}:{search}";
    public static string RelatedProductsKey(Guid productId) => $"{Prefix}products:related:{productId}";
    public static string ProductsPattern => $"{Prefix}product*";
    public static string ProductsListPattern => $"{Prefix}products:list*";

    // Categories
    public static string CategoriesKey => $"{Prefix}categories:all";
    public static string CategoryKey(Guid id) => $"{Prefix}category:{id}";
    public static string CategoriesPattern => $"{Prefix}categor*";

    // Brands
    public static string BrandsKey => $"{Prefix}brands:all";
    public static string BrandKey(Guid id) => $"{Prefix}brand:{id}";
    public static string BrandsPattern => $"{Prefix}brand*";

    // Content/Banners
    public static string BannersKey(string? position) => $"{Prefix}banners:{position ?? "all"}";
    public static string BannersPattern => $"{Prefix}banners*";

    // System Config
    public static string SystemConfigsKey => $"{Prefix}systemconfigs:all";
    public static string SystemConfigKey(string key) => $"{Prefix}systemconfig:{key}";
    public static string SystemConfigPattern => $"{Prefix}systemconfig*";

    // Orders
    public static string OrderKey(Guid id) => $"{Prefix}order:{id}";
    public static string CustomerOrdersKey(Guid customerId) => $"{Prefix}orders:customer:{customerId}";

    // Cart
    public static string CartKey(Guid customerId) => $"{Prefix}cart:{customerId}";

    // Search
    public static string SearchResultsKey(string query, int page, int pageSize)
        => $"{Prefix}search:{query}:{page}:{pageSize}";
}
