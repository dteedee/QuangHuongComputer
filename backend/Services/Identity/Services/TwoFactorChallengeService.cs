using Identity.Domain;
using Identity.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Identity.Services;

public interface ITwoFactorChallengeService
{
    /// <summary>Opens a challenge for a login that passed the password check. Returns the clear-text token, once.</summary>
    Task<(string Token, int ExpiresInSeconds)> CreateAsync(string userId, HttpContext httpContext);

    /// <summary>The live, unused, unexpired challenge for this token - or null.</summary>
    Task<TwoFactorChallenge?> ResolveAsync(string? token);

    /// <summary>Marks the challenge spent. A challenge token is single use.</summary>
    Task ConsumeAsync(TwoFactorChallenge challenge);

    /// <summary>Records a wrong code; the challenge dies at <see cref="MaxAttempts"/>.</summary>
    Task<bool> RegisterFailedAttemptAsync(TwoFactorChallenge challenge);
}

/// <summary>
/// The short-lived ticket between "password accepted" and "TOTP accepted".
///
/// It is a database row, not a JWT, for one reason: it must be destroyable the
/// instant it is used. A signed token cannot be withdrawn, so a replayed one
/// would let a stolen challenge be redeemed twice.
///
/// It is also NOT an access token - it carries no roles and no permissions, so
/// the window between the two steps grants nothing at all.
/// </summary>
public sealed class TwoFactorChallengeService : ITwoFactorChallengeService
{
    public const int MaxAttempts = 5;
    public const int DefaultChallengeMinutes = 5;

    private readonly IdentityDbContext _db;
    private readonly IConfiguration _configuration;

    public TwoFactorChallengeService(IdentityDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public async Task<(string Token, int ExpiresInSeconds)> CreateAsync(string userId, HttpContext httpContext)
    {
        // One live challenge per account: a second login attempt must invalidate
        // the first, or two concurrent challenges double the guessing budget.
        await _db.TwoFactorChallenges
            .Where(c => c.UserId == userId && !c.IsUsed)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.IsUsed, true));

        var token = TokenHasher.NewSecret(32);
        var lifetime = TimeSpan.FromMinutes(ResolveChallengeMinutes());

        _db.TwoFactorChallenges.Add(new TwoFactorChallenge
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = TokenHasher.Hash(token),
            ExpiresAt = DateTime.UtcNow.Add(lifetime),
            IsUsed = false,
            Attempts = 0,
            CreatedAt = DateTime.UtcNow,
            IpAddress = TokenIssuer.ClientIp(httpContext),
            UserAgent = TokenIssuer.UserAgent(httpContext)
        });
        await _db.SaveChangesAsync();

        return (token, (int)lifetime.TotalSeconds);
    }

    public async Task<TwoFactorChallenge?> ResolveAsync(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        var hash = TokenHasher.Hash(token);
        return await _db.TwoFactorChallenges
            .FirstOrDefaultAsync(c => c.TokenHash == hash && !c.IsUsed && c.ExpiresAt > DateTime.UtcNow);
    }

    public async Task ConsumeAsync(TwoFactorChallenge challenge)
    {
        challenge.IsUsed = true;
        challenge.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    /// <summary>Returns true when the challenge is now dead.</summary>
    public async Task<bool> RegisterFailedAttemptAsync(TwoFactorChallenge challenge)
    {
        challenge.Attempts++;
        if (challenge.Attempts >= MaxAttempts) challenge.IsUsed = true;
        await _db.SaveChangesAsync();
        return challenge.IsUsed;
    }

    private int ResolveChallengeMinutes()
    {
        var raw = _configuration.GetSection("Jwt")["TwoFactorChallengeMinutes"];
        return int.TryParse(raw, out var minutes) && minutes > 0 ? minutes : DefaultChallengeMinutes;
    }
}
