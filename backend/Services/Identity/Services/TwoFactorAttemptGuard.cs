using Identity.Domain;
using Identity.Infrastructure;
using Microsoft.AspNetCore.Http;

namespace Identity;

/// <summary>
/// Brute-force cap for TOTP. Split out of TwoFactorEndpoints.cs so the setup,
/// disable and login paths share one counter rather than three.
/// </summary>
internal static class TwoFactorAttemptGuard
{
    public const int MaxFailedAttempts = 5;
    public static readonly TimeSpan LockoutWindow = TimeSpan.FromMinutes(15);

    /// <summary>
    /// 1.000.000 possible codes and an unlimited guess rate is not a second
    /// factor. Five wrong codes park the config for 15 minutes.
    /// </summary>
    public static async Task<IResult?> GuardAsync(IdentityDbContext db, TwoFactorConfig config)
    {
        if (config.LockedUntil is { } until && until > DateTime.UtcNow)
        {
            return Results.StatusCode(StatusCodes.Status429TooManyRequests);
        }
        if (config.LockedUntil != null)
        {
            config.LockedUntil = null;
            config.FailedAttempts = 0;
            await db.SaveChangesAsync();
        }
        return null;
    }

    public static async Task RegisterFailureAsync(IdentityDbContext db, TwoFactorConfig config)
    {
        config.FailedAttempts++;
        if (config.FailedAttempts >= MaxFailedAttempts)
        {
            config.LockedUntil = DateTime.UtcNow.Add(LockoutWindow);
        }
        await db.SaveChangesAsync();
    }
}
