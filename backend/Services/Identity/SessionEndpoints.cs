using System.Security.Claims;
using BuildingBlocks.Security;
using Identity.Infrastructure;
using Identity.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Identity;

/// <summary>
/// `/api/identity/sessions` - the signed-in user's own devices.
///
/// What this replaces: the list was populated by nothing (no code ever inserted
/// a `UserSessions` row, so it was always empty), and "revoke" set
/// `IsRevoked = true` on a row that no authentication path ever read - the
/// revoked device kept refreshing and kept working. "Revoke all others" compared
/// IP addresses, so every device behind the shop's single NAT counted as the
/// current one and survived.
///
/// Now a session IS a refresh-token family: revoking it kills every token in the
/// family, and revoking ALL bumps the security stamp so even the access tokens
/// already in flight stop being accepted (within the 60s user-state TTL).
/// </summary>
public static class SessionEndpoints
{
    public static void MapSessionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/identity/sessions")
            .RequireAuthorization(SecurityPolicies.Authenticated);

        group.MapGet("/", async (ClaimsPrincipal principal, IdentityDbContext db) =>
        {
            var userId = UserId(principal);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            var currentSessionId = CurrentSessionId(principal);

            var sessions = await db.UserSessions
                .AsNoTracking()
                .Where(s => s.UserId == userId && !s.IsRevoked)
                .OrderByDescending(s => s.LastActiveAt)
                .Select(s => new
                {
                    s.Id,
                    s.DeviceInfo,
                    s.IpAddress,
                    s.UserAgent,
                    s.LastActiveAt,
                    s.CreatedAt,
                    isCurrent = currentSessionId.HasValue && s.Id == currentSessionId.Value
                })
                .ToListAsync();

            return Results.Ok(sessions);
        });

        group.MapDelete("/{sessionId:guid}", async (Guid sessionId, ClaimsPrincipal principal,
            IdentityDbContext db, IRefreshTokenService refreshTokens, HttpContext httpContext, IAuditService audit) =>
        {
            var userId = UserId(principal);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            // Ownership check before anything else: a session id is a guessable
            // handle to somebody else's device otherwise.
            var session = await db.UserSessions.AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);
            if (session == null) return Results.NotFound(new { Error = "Không tìm thấy phiên đăng nhập." });

            var killed = await refreshTokens.RevokeSessionAsync(sessionId, TokenIssuer.ClientIp(httpContext), "User");
            await audit.LogAsync(userId, "RevokeSession", "UserSession", sessionId.ToString(),
                $"Thu hồi phiên {session.DeviceInfo} ({killed} refresh token)");

            return Results.Ok(new { revoked = true, refreshTokensRevoked = killed });
        });

        // Kept at the historical path (`all-others`) because frontend/src/api/auth.ts
        // already calls it. It now means what its name says.
        group.MapDelete("/all-others", async (ClaimsPrincipal principal, IdentityDbContext db,
            IRefreshTokenService refreshTokens, UserManager<ApplicationUser> userManager,
            IUserStateCache stateCache, HttpContext httpContext, IAuditService audit) =>
        {
            var userId = UserId(principal);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var currentSessionId = CurrentSessionId(principal);
            var ip = TokenIssuer.ClientIp(httpContext);

            // Identify by SESSION, not by IP. Every device in the shop shares one
            // public IP, so the old IP comparison spared all of them.
            var others = await db.UserSessions
                .Where(s => s.UserId == userId && !s.IsRevoked && (!currentSessionId.HasValue || s.Id != currentSessionId.Value))
                .Select(s => s.Id)
                .ToListAsync();

            var killed = 0;
            foreach (var id in others) killed += await refreshTokens.RevokeSessionAsync(id, ip, "User");

            // Without a stamp bump the access tokens those devices are already
            // holding stay valid until they expire - up to an hour of access for
            // a device the user just told us to kick off.
            var user = await userManager.FindByIdAsync(userId);
            if (user != null && !currentSessionId.HasValue)
            {
                await userManager.UpdateSecurityStampAsync(user);
            }
            await stateCache.InvalidateAsync(userId);

            await audit.LogAsync(userId, "RevokeOtherSessions", "ApplicationUser", userId,
                $"Thu hồi {others.Count} phiên khác ({killed} refresh token)");

            return Results.Ok(new { revokedCount = others.Count, refreshTokensRevoked = killed });
        });
    }

    private static string? UserId(ClaimsPrincipal principal) =>
        principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");

    /// <summary>The session the caller is talking to us from, from the `sid` claim.</summary>
    internal static Guid? CurrentSessionId(ClaimsPrincipal principal) =>
        Guid.TryParse(principal.FindFirstValue(JwtTokenFactory.SessionClaimType), out var id) ? id : null;
}
