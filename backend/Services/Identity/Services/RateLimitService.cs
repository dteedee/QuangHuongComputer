using Microsoft.Extensions.Caching.Memory;

namespace Identity.Services;

public class RateLimitService : IRateLimitService
{
    private readonly IMemoryCache _cache;

    public RateLimitService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public Task<bool> IsRateLimitedAsync(string key, int maxAttempts, TimeSpan window)
    {
        if (_cache.TryGetValue(key, out int attempts))
        {
            return Task.FromResult(attempts >= maxAttempts);
        }

        return Task.FromResult(false);
    }

    public Task IncrementAsync(string key, TimeSpan window)
    {
        if (_cache.TryGetValue(key, out int attempts))
        {
            _cache.Set(key, attempts + 1, window);
        }
        else
        {
            _cache.Set(key, 1, window);
        }

        return Task.CompletedTask;
    }

    public Task ResetAsync(string key)
    {
        _cache.Remove(key);
        return Task.CompletedTask;
    }
}
