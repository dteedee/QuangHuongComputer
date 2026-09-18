using Identity.Domain;
using Identity.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Identity.Services;

/// <summary>A freshly minted refresh token: the row that was stored, plus the secret to hand to the client ONCE.</summary>
public sealed record IssuedRefreshToken(RefreshToken Entity, string Token);

public interface IRefreshTokenService
{
    Task<IssuedRefreshToken> GenerateRefreshTokenAsync(string userId, string ipAddress, string jwtId, Guid sessionId);

    /// <summary>Looks a token up by hash (new rows) or clear text (pre-W1-2 rows). Returns revoked rows too - reuse detection needs them.</summary>
    Task<RefreshToken?> GetRefreshTokenAsync(string token);

    Task RevokeRefreshTokenAsync(string token, string ipAddress, string? replacedByTokenHash = null);

    /// <summary>Revokes one device: the session row and every live token in its family. Returns tokens killed.</summary>
    Task<int> RevokeSessionAsync(Guid sessionId, string? ipAddress, string reason);

    /// <summary>Revokes every device of a user. Returns tokens killed.</summary>
    Task<int> RevokeAllUserTokensAsync(string userId, string? ipAddress = null, string reason = "User");

    /// <summary>Token reuse = suspected theft. Kills the whole family and reports it.</summary>
    Task<int> HandleReuseAsync(RefreshToken presented, string? ipAddress);

    Task CleanupExpiredTokensAsync();
}

/// <summary>
/// Refresh-token storage, rotation and family revocation.
///
/// Three things W1-2 changed:
///   1. <b>Hashed at rest.</b> The 64-byte secret used to sit in clear text in
///      <c>RefreshTokens.Token</c>; any read of that table was a working session
///      for every logged-in account. Only the SHA-256 is stored now.
///   2. <b>Families.</b> Every token carries the <c>SessionId</c> of the device
///      that started the chain, so "revoke this session" can kill the chain
///      instead of setting a flag nothing read.
///   3. <b>Reuse detection.</b> Presenting a token that was already rotated away
///      means either a stolen token or a stolen database row - in both cases the
///      correct answer is to kill the whole family, not to issue a new pair.
/// </summary>
public class RefreshTokenService : IRefreshTokenService
{
    /// <summary>Fallback lifetime. `Jwt:RefreshDays` (phase spec) wins, `Jwt:RefreshTokenLifetimeDays` is the legacy key.</summary>
    public const int DefaultRefreshDays = 14;

    private readonly IdentityDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RefreshTokenService> _logger;
    private readonly IUserStateCache _stateCache;

    public RefreshTokenService(
        IdentityDbContext context,
        IConfiguration configuration,
        ILogger<RefreshTokenService> logger,
        IUserStateCache stateCache)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
        _stateCache = stateCache;
    }

    public async Task<IssuedRefreshToken> GenerateRefreshTokenAsync(string userId, string ipAddress, string jwtId, Guid sessionId)
    {
        var token = TokenHasher.NewSecret();

        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = null,                       // clear text is never persisted again
            TokenHash = TokenHasher.Hash(token),
            SessionId = sessionId,
            JwtId = jwtId,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(ResolveRefreshDays()),
            CreatedByIp = ipAddress,
            IsRevoked = false
        };

        _context.RefreshTokens.Add(entity);
        await _context.SaveChangesAsync();

        return new IssuedRefreshToken(entity, token);
    }

    public async Task<RefreshToken?> GetRefreshTokenAsync(string token)
    {
        if (string.IsNullOrEmpty(token)) return null;
        var hash = TokenHasher.Hash(token);

        var byHash = await _context.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.TokenHash == hash);
        if (byHash != null) return byHash;

        // Pre-W1-2 row: the owner's open sessions must not be force-logged-out by
        // the migration. These rows die naturally on their next rotation.
        return await _context.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == token);
    }

    public async Task RevokeRefreshTokenAsync(string token, string ipAddress, string? replacedByTokenHash = null)
    {
        var refreshToken = await GetRefreshTokenAsync(token);
        if (refreshToken == null || refreshToken.IsRevoked) return;

        refreshToken.IsRevoked = true;
        refreshToken.RevokedAt = DateTime.UtcNow;
        refreshToken.RevokedByIp = ipAddress;
        refreshToken.ReplacedByToken = replacedByTokenHash;

        await _context.SaveChangesAsync();
    }

    public async Task<int> RevokeSessionAsync(Guid sessionId, string? ipAddress, string reason)
    {
        var killed = await RevokeTokensAsync(rt => rt.SessionId == sessionId, ipAddress);

        var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session != null && !session.IsRevoked)
        {
            session.IsRevoked = true;
            session.RevokedAt = DateTime.UtcNow;
            session.RevokedByIp = ipAddress;
            session.RevokedReason = reason;
        }

        await _context.SaveChangesAsync();
        // Without this the revoked device keeps working until the 60s cache
        // entry expires; with it, the very next request is rejected.
        await _stateCache.InvalidateSessionAsync(sessionId);
        return killed;
    }

    public async Task<int> RevokeAllUserTokensAsync(string userId, string? ipAddress = null, string reason = "User")
    {
        var killed = await RevokeTokensAsync(rt => rt.UserId == userId, ipAddress);

        var sessions = await _context.UserSessions.Where(s => s.UserId == userId && !s.IsRevoked).ToListAsync();
        foreach (var session in sessions)
        {
            session.IsRevoked = true;
            session.RevokedAt = DateTime.UtcNow;
            session.RevokedByIp = ipAddress;
            session.RevokedReason = reason;
        }

        await _context.SaveChangesAsync();
        foreach (var session in sessions) await _stateCache.InvalidateSessionAsync(session.Id);
        await _stateCache.InvalidateAsync(userId);
        return killed;
    }

    public async Task<int> HandleReuseAsync(RefreshToken presented, string? ipAddress)
    {
        _logger.LogWarning(
            "Refresh-token reuse detected for user {UserId} (session {SessionId}) from {Ip} - revoking the whole family",
            presented.UserId, presented.SessionId, ipAddress ?? "unknown");

        if (presented.SessionId.HasValue)
            return await RevokeSessionAsync(presented.SessionId.Value, ipAddress, "TokenReuse");

        // Pre-W1-2 rows have no family. The conservative answer is every session.
        return await RevokeAllUserTokensAsync(presented.UserId, ipAddress, "TokenReuse");
    }

    public async Task CleanupExpiredTokensAsync()
    {
        var cutoff = DateTime.UtcNow;
        await _context.RefreshTokens.Where(rt => rt.ExpiresAt < cutoff).ExecuteDeleteAsync();

        // A session with no live token left is dead weight in the "thiết bị đang
        // đăng nhập" list; mark it revoked so the UI stops showing it.
        var stale = await _context.UserSessions
            .Where(s => !s.IsRevoked && !_context.RefreshTokens.Any(rt => rt.SessionId == s.Id && !rt.IsRevoked && rt.ExpiresAt > cutoff))
            .ToListAsync();
        foreach (var session in stale)
        {
            session.IsRevoked = true;
            session.RevokedAt = cutoff;
            session.RevokedReason = "Expired";
        }
        if (stale.Count > 0) await _context.SaveChangesAsync();
    }

    private async Task<int> RevokeTokensAsync(
        System.Linq.Expressions.Expression<Func<RefreshToken, bool>> predicate, string? ipAddress)
    {
        var tokens = await _context.RefreshTokens.Where(predicate).Where(rt => !rt.IsRevoked).ToListAsync();
        foreach (var token in tokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
            token.RevokedByIp = ipAddress;
        }
        return tokens.Count;
    }

    private int ResolveRefreshDays()
    {
        var jwt = _configuration.GetSection("Jwt");
        var raw = jwt["RefreshDays"] ?? jwt["RefreshTokenLifetimeDays"];
        return int.TryParse(raw, out var days) && days > 0 ? days : DefaultRefreshDays;
    }
}
