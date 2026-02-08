using System.Text.Json;
using StackExchange.Redis;

namespace BuildingBlocks.Caching.Redis;

/// <summary>
/// Redis-based distributed cache implementation with serialization
/// </summary>
public class RedisDistributedCache : ICacheService
{
    private readonly IConnectionMultiplexer _connection;
    private readonly string _instanceName;
    private readonly int _defaultTtl;
    private readonly IDatabase _database;

    public RedisDistributedCache(
        IConnectionMultiplexer connection,
        string instanceName = "quanghc:",
        int defaultTtl = 3600)
    {
        _connection = connection ?? throw new ArgumentNullException(nameof(connection));
        _instanceName = instanceName;
        _defaultTtl = defaultTtl;
        _database = connection.GetDatabase();
    }

    /// <summary>
    /// Gets a value from cache by key
    /// </summary>
    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) where T : class
    {
        try
        {
            var fullKey = GetFullKey(key);
            var value = await _database.StringGetAsync(fullKey);

            if (!value.HasValue)
                return null;

            return JsonSerializer.Deserialize<T>(value.ToString());
        }
        catch (Exception ex)
        {
            // Log error - fail gracefully
            return null;
        }
    }

    /// <summary>
    /// Sets a value in cache with optional TTL
    /// </summary>
    public async Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken cancellationToken = default) where T : class
    {
        try
        {
            if (value == null)
                return;

            var fullKey = GetFullKey(key);
            var serializedValue = JsonSerializer.Serialize(value);
            var expiry = ttl ?? TimeSpan.FromSeconds(_defaultTtl);

            await _database.StringSetAsync(fullKey, serializedValue, expiry);
        }
        catch (Exception ex)
        {
            // Log error - fail gracefully
        }
    }

    /// <summary>
    /// Removes a value from cache
    /// </summary>
    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            var fullKey = GetFullKey(key);
            await _database.KeyDeleteAsync(fullKey);
        }
        catch (Exception ex)
        {
            // Log error - fail gracefully
        }
    }

    /// <summary>
    /// Removes multiple values from cache
    /// </summary>
    public async Task RemoveByPatternAsync(string pattern, CancellationToken cancellationToken = default)
    {
        try
        {
            var server = _connection.GetServer(_connection.GetEndPoints().First());
            var fullPattern = GetFullKey(pattern);
            var keys = server.Keys(pattern: fullPattern).ToArray();

            if (keys.Length > 0)
            {
                await _database.KeyDeleteAsync(keys);
            }
        }
        catch (Exception ex)
        {
            // Log error - fail gracefully
        }
    }

    /// <summary>
    /// Clears all cache
    /// </summary>
    public async Task ClearAsync()
    {
        try
        {
            var server = _connection.GetServer(_connection.GetEndPoints().First());
            await server.FlushDatabaseAsync();
        }
        catch (Exception ex)
        {
            // Log error - fail gracefully
        }
    }

    /// <summary>
    /// Checks if key exists in cache
    /// </summary>
    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            var fullKey = GetFullKey(key);
            return await _database.KeyExistsAsync(fullKey);
        }
        catch (Exception ex)
        {
            return false;
        }
    }

    /// <summary>
    /// Gets cache size in bytes
    /// </summary>
    public async Task<long> GetSizeAsync()
    {
        try
        {
            var server = _connection.GetServer(_connection.GetEndPoints().First());
            var info = await server.InfoAsync("memory");
            
            if (info != null && info.Length > 0)
            {
                var memorySection = info[0];
                var usedMemoryItem = memorySection.FirstOrDefault(x => x.Key == "used_memory");
                if (usedMemoryItem.Value != null && long.TryParse(usedMemoryItem.Value, out var size))
                {
                    return size;
                }
            }

            return 0;
        }
        catch (Exception ex)
        {
            return 0;
        }
    }

    /// <summary>
    /// Gets cache statistics
    /// </summary>
    public async Task<Dictionary<string, object>> GetStatsAsync()
    {
        var stats = new Dictionary<string, object>();

        try
        {
            var server = _connection.GetServer(_connection.GetEndPoints().First());
            var info = await server.InfoAsync();

            if (info != null && info.Length > 0)
            {
                foreach (var section in info)
                {
                    foreach (var item in section)
                    {
                        stats[$"{section.Key}:{item.Key}"] = item.Value.ToString() ?? "";
                    }
                }
            }
        }
        catch (Exception ex)
        {
            stats["error"] = ex.Message;
        }

        return stats;
    }

    /// <summary>
    /// Gets the full key with instance name prefix
    /// </summary>
    private string GetFullKey(string key) => $"{_instanceName}{key}";
}
