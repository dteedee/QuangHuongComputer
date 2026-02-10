using StackExchange.Redis;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BuildingBlocks.Caching.Redis;

/// <summary>
/// Redis Configuration Extension
/// Configures Redis connection pooling and serialization options
/// </summary>
public static class RedisConfiguration
{
    private static readonly Lazy<IConnectionMultiplexer> LazyConnection = new(() =>
    {
        var configurationOptions = new ConfigurationOptions
        {
            EndPoints = { "localhost:6379" },
            AbortOnConnectFail = false,
            AllowAdmin = false,
            SyncTimeout = 5000,
            ConnectTimeout = 5000,
            DefaultVersion = new Version(6, 0),
            SocketManager = SocketManager.ThreadPool,
        };

        return ConnectionMultiplexer.Connect(configurationOptions);
    });

    public static IConnectionMultiplexer Connection => LazyConnection.Value;

    /// <summary>
    /// Adds Redis caching services with proper configuration
    /// </summary>
    public static IServiceCollection AddRedisCache(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var redisConfig = configuration.GetSection("Redis");
        var connectionString = redisConfig["ConnectionString"] ?? "localhost:6379";
        var instanceName = redisConfig["InstanceName"] ?? "quanghc:";
        var defaultTtl = int.TryParse(redisConfig["DefaultTtl"], out var ttl) ? ttl : 3600;

        var options = ConfigurationOptions.Parse(connectionString);
        options.AbortOnConnectFail = false;
        options.AllowAdmin = false;
        options.SyncTimeout = 5000;
        options.ConnectTimeout = 5000;
        options.KeepAlive = 180;
        options.DefaultVersion = new Version(6, 0);
        options.SocketManager = SocketManager.ThreadPool;

        // Connection pooling with retry
        var connection = ConnectionMultiplexer.Connect(options);

        services.AddSingleton(connection);
        services.AddSingleton<IConnectionMultiplexer>(connection);

        // Register cache service
        services.AddSingleton<ICacheService>(sp =>
            new RedisDistributedCache(sp.GetRequiredService<IConnectionMultiplexer>(), instanceName, defaultTtl));

        return services;
    }

    /// <summary>
    /// Validates Redis connection
    /// </summary>
    public static async Task<bool> ValidateConnectionAsync(IConnectionMultiplexer connection)
    {
        try
        {
            var storedEndpoint = connection.GetEndPoints().FirstOrDefault();
            if (storedEndpoint == null) return false;

            var server = connection.GetServer(storedEndpoint);
            await server.PingAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Gets Redis connection statistics
    /// </summary>
    public static Dictionary<string, string> GetConnectionStats(IConnectionMultiplexer connection)
    {
        var stats = new Dictionary<string, string>();
        
        try
        {
            var server = connection.GetServer(connection.GetEndPoints().First());
            var info = server.Info("stats");
            
            foreach (var group in info)
            {
                foreach (var item in group)
                {
                    stats[$"{group.Key}:{item.Key}"] = item.Value.ToString();
                }
            }
        }
        catch (Exception ex)
        {
            stats["error"] = ex.Message;
        }

        return stats;
    }
}
