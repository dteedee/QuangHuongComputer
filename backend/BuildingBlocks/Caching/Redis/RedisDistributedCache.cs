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

    /// <summary>
    /// Exactly what the API responds with - see <see cref="CacheSerializerOptions"/>. This is the
    /// registered <see cref="ICacheService"/> (RedisConfiguration.cs), so this is the instance that
    /// decides whether a cache HIT looks like a cache MISS in production.
    /// </summary>
    private static readonly JsonSerializerOptions SerializerOptions = CacheSerializerOptions.Create();

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

            return JsonSerializer.Deserialize<T>(value.ToString(), SerializerOptions);
        }
        catch (Exception)
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
            var serializedValue = JsonSerializer.Serialize(value, SerializerOptions);
            var expiry = ttl ?? TimeSpan.FromSeconds(_defaultTtl);

            await _database.StringSetAsync(fullKey, serializedValue, expiry);
        }
        catch (Exception)
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
        catch (Exception)
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
            // `database:` is MANDATORY. IServer.Keys() defaults to database 0, so without it the TEST
            // stack (defaultDatabase=1) would SCAN and DELETE keys in the owner's database 0 every
            // time it invalidated its own cache — a hole straight through the D12 Redis isolation.
            var keys = server.Keys(database: _database.Database, pattern: fullPattern).ToArray();

            if (keys.Length > 0)
            {
                await _database.KeyDeleteAsync(keys);
            }
        }
        catch (Exception)
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
            // Same reason as RemoveByPatternAsync: the default is database 0, which is the owner's.
            await server.FlushDatabaseAsync(_database.Database);
        }
        catch (Exception)
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
        catch (Exception)
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
        catch (Exception)
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
