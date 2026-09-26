using Identity.Infrastructure;
using Identity.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;

namespace Identity.Endpoints;

/// <summary>
/// `POST /api/auth/refresh-token` and `POST /api/auth/logout` - the two routes authenticated by the
/// HttpOnly refresh cookie (<see cref="RefreshTokenCookie"/>) instead of a bearer token.
///
/// Neither reads a refresh token from the request body any more. The only non-browser client in the
/// repo (mobile/) never signs in, so there is no caller that needs a body-token transition window,
/// and keeping one would leave the exact "token readable by script" path this change removes.
/// Both demand <see cref="RequireAjaxHeaderFilter"/> (CSRF, layer 2).
///
/// Not on the strict `auth` rate-limit policy (10/min/IP): the SPA now refreshes on every full page
/// load, and a whole shop's staff share one public IP. The token is 256 bits of randomness, so there
/// is nothing to brute-force; the general limiter still applies.
/// </summary>
public static class RefreshTokenEndpoints
{
    private const string InvalidToken = "Invalid refresh token";

    public static void MapRefreshTokenEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/refresh-token", async (UserManager<ApplicationUser> userManager,
            IRefreshTokenService refreshTokenService, ITokenIssuer tokenIssuer, HttpContext httpContext) =>
        {
            var presented = RefreshTokenCookie.Read(httpContext);
            if (presented is null)
                return Results.BadRequest(new { Error = "Refresh token is required" });

            var refreshToken = await refreshTokenService.GetRefreshTokenAsync(presented);
            if (refreshToken == null) return Rejected(httpContext, InvalidToken);

            // Reuse detection. A token that was already rotated away is being
            // presented again: either it was stolen from the client or the row
            // was read from the database. Either way the family is compromised,
            // so it dies instead of producing a fresh pair.
            if (refreshToken.IsRevoked && refreshToken.ReplacedByToken != null)
            {
                await refreshTokenService.HandleReuseAsync(refreshToken, TokenIssuer.ClientIp(httpContext));
                return Rejected(httpContext, "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
            }

            if (!refreshToken.IsActive) return Rejected(httpContext, InvalidToken);

            var user = refreshToken.User ?? await userManager.FindByIdAsync(refreshToken.UserId);
            if (user == null || !user.IsActive) return Rejected(httpContext, "User not found or inactive");

            var rotated = await tokenIssuer.RotateAsync(user, refreshToken, presented, httpContext);
            return RefreshTokenCookie.SignIn(httpContext, rotated);
        }).AddEndpointFilter<RequireAjaxHeaderFilter>();

        group.MapPost("/logout", async (IRefreshTokenService refreshTokenService, HttpContext httpContext) =>
        {
            var presented = RefreshTokenCookie.Read(httpContext);
            if (presented is not null)
            {
                var ip = TokenIssuer.ClientIp(httpContext);
                var token = await refreshTokenService.GetRefreshTokenAsync(presented);

                // Logging out closes the DEVICE, not just the one token in hand -
                // otherwise the family's next rotation is still valid.
                if (token?.SessionId is { } sessionId) await refreshTokenService.RevokeSessionAsync(sessionId, ip, "Logout");
                else await refreshTokenService.RevokeRefreshTokenAsync(presented, ip);
            }

            // Always expire the cookie, even when it was already dead: logout must be idempotent.
            RefreshTokenCookie.Clear(httpContext);
            return Results.Ok(new { Message = "Logged out successfully" });
        }).AddEndpointFilter<RequireAjaxHeaderFilter>();
    }

    /// <summary>A dead cookie is dropped at once, so the browser stops presenting it on every page load.</summary>
    private static IResult Rejected(HttpContext httpContext, string error)
    {
        RefreshTokenCookie.Clear(httpContext);
        return Results.BadRequest(new { Error = error });
    }
}
