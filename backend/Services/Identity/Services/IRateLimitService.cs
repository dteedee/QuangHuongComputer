namespace Identity.Services;

public interface IRateLimitService
{
    Task<bool> IsRateLimitedAsync(string key, int maxAttempts, TimeSpan window);
    Task IncrementAsync(string key, TimeSpan window);
    Task ResetAsync(string key);
}
