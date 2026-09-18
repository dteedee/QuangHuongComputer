using System.Text.Json;
using Identity.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Identity.Services;

/// <summary>The two facts an access token cannot carry because it is not revocable.</summary>
/// <param name="IsActive">False as soon as an admin deactivates the account.</param>
/// <param name="SecurityStamp">
/// Bumped by ASP.NET Identity on a password change and, explicitly by this track,
/// on a role change, a permission change and "revoke all sessions". A token whose
/// stamp no longer matches is stale and is rejected.
/// </param>
public sealed record UserSecurityState(bool IsActive, string SecurityStamp);

public interface IUserStateCache
{
    /// <summary>Current state, or null when the account no longer exists.</summary>
    Task<UserSecurityState?> GetAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>Drops the cached entry so the very next request re-reads the database.</summary>
    Task InvalidateAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// True when this device's session was revoked. Checked per request so
    /// "thu hồi phiên" also stops the access token that device is holding, not
    /// only its refresh token.
    /// </summary>
    Task<bool> IsSessionRevokedAsync(Guid sessionId, CancellationToken cancellationToken = default);

    Task InvalidateSessionAsync(Guid sessionId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Redis-backed, 60-second TTL, database-authoritative.
///
/// The hole this closes: an access token is a signed bearer token - nothing can
/// take it back. Deactivating a user, stripping their roles or revoking their
/// sessions therefore had no effect at all until the token expired. With a 60
/// minute access token that is a full hour of access for an account that was
/// just disabled.
///
/// D05 item 8 is binding here: <b>when Redis is unavailable this falls back to
/// the DATABASE, never to "allow"</b>. Failing open would mean a Redis outage
/// silently restores the exact hole above, and D05 only accepted "Redis is a
/// cache, not a store" on the condition that this path reads through.
/// The TTL bounds staleness across instances; <see cref="InvalidateAsync"/> makes
/// the common single-instance case immediate.
/// </summary>
public sealed class UserStateCache : IUserStateCache
{
    /// <summary>Phase-file requirement: a deactivation must bite within 60 seconds.</summary>
    public static readonly TimeSpan Ttl = TimeSpan.FromSeconds(60);

    private readonly IdentityDbContext _db;
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<UserStateCache> _logger;
    private readonly string _prefix;

    public UserStateCache(
        IdentityDbContext db,
        ILogger<UserStateCache> logger,
        IConfiguration configuration,
        IConnectionMultiplexer? redis = null)
    {
        _db = db;
        _logger = logger;
        _redis = redis;
        // The TEST stack runs on the same Redis server as DEV (db 1 vs db 0) and
        // passes Redis:InstanceName=qh-test:. Honouring it keeps the two apart
        // even if they ever share a database number.
        _prefix = (configuration["Redis:InstanceName"] ?? "quanghc:") + "identity:userstate:";
    }

    public async Task<UserSecurityState?> GetAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) return null;

        var db = TryGetDatabase();
        if (db != null)
        {
            try
            {
                var cached = await db.StringGetAsync(_prefix + userId);
                if (cached.HasValue)
                {
                    // Explicit string overload: RedisValue converts implicitly to
                    // both string and ReadOnlySpan<byte>, which is ambiguous.
                    var state = JsonSerializer.Deserialize<UserSecurityState>((string)cached!);
                    if (state != null) return state;
                }
            }
            catch (Exception ex)
            {
                // Loudly, once per failure: a silent degrade here is a silent
                // extra database round-trip on every authenticated request.
                _logger.LogWarning(ex, "Redis read failed for user state {UserId}; reading the database instead", userId);
            }
        }

        var fresh = await ReadFromDatabaseAsync(userId, cancellationToken);
        if (fresh != null && db != null)
        {
            try
            {
                await db.StringSetAsync(_prefix + userId, JsonSerializer.Serialize(fresh), Ttl);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis write failed for user state {UserId}", userId);
            }
        }
        return fresh;
    }

    public async Task InvalidateAsync(string userId, CancellationToken cancellationToken = default)
    {
        var db = TryGetDatabase();
        if (db == null || string.IsNullOrEmpty(userId)) return;
        try
        {
            await db.KeyDeleteAsync(_prefix + userId);
        }
        catch (Exception ex)
        {
            // Not fatal: the 60s TTL still bounds how long the stale entry lives.
            _logger.LogWarning(ex, "Redis invalidate failed for user state {UserId}", userId);
        }
    }

    public async Task<bool> IsSessionRevokedAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        if (sessionId == Guid.Empty) return false;
        var key = _prefix + "session:" + sessionId.ToString("N");
        var db = TryGetDatabase();

        if (db != null)
        {
            try
            {
                var cached = await db.StringGetAsync(key);
                if (cached.HasValue) return (string)cached! == "1";
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis read failed for session {SessionId}; reading the database instead", sessionId);
            }
        }

        // Same rule as the user state: a cache problem falls back to the
        // database, never to "assume it is still valid" (D05 item 8).
        var row = await _db.UserSessions.AsNoTracking()
            .Where(s => s.Id == sessionId)
            .Select(s => (bool?)s.IsRevoked)
            .FirstOrDefaultAsync(cancellationToken);

        // An unknown session id is not a revocation: pre-W1-2 tokens carry no
        // `sid`, and a row removed by the cleanup job must not lock the user out.
        var revoked = row ?? false;

        if (db != null)
        {
            try { await db.StringSetAsync(key, revoked ? "1" : "0", Ttl); }
            catch (Exception ex) { _logger.LogWarning(ex, "Redis write failed for session {SessionId}", sessionId); }
        }
        return revoked;
    }

    public async Task InvalidateSessionAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        var db = TryGetDatabase();
        if (db == null || sessionId == Guid.Empty) return;
        try { await db.KeyDeleteAsync(_prefix + "session:" + sessionId.ToString("N")); }
        catch (Exception ex) { _logger.LogWarning(ex, "Redis invalidate failed for session {SessionId}", sessionId); }
    }

    private IDatabase? TryGetDatabase()
    {
        if (_redis == null) return null;
        try { return _redis.IsConnected ? _redis.GetDatabase() : null; }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis connection unavailable; user-state checks read the database");
            return null;
        }
    }

    /// <summary>
    /// IgnoreQueryFilters is required: <c>ApplicationUser</c> carries a global
    /// <c>IsActive</c> filter, so a normal query cannot see the very accounts we
    /// need to report as deactivated - it would return null and look like
    /// "user deleted" instead of "user disabled".
    /// </summary>
    private async Task<UserSecurityState?> ReadFromDatabaseAsync(string userId, CancellationToken cancellationToken)
    {
        var row = await _db.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.IsActive, u.SecurityStamp })
            .FirstOrDefaultAsync(cancellationToken);

        return row == null ? null : new UserSecurityState(row.IsActive, row.SecurityStamp ?? string.Empty);
    }
}
