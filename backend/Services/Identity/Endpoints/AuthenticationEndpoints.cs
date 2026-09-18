using System.Security.Claims;
using BuildingBlocks.Messaging.IntegrationEvents;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Identity.DTOs;
using Identity.Infrastructure;
using Identity.Services;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Identity.Endpoints;

/// <summary>Register, password login, the 2FA second step, token refresh and revocation.</summary>
public static class AuthenticationEndpoints
{
    /// <summary>
    /// One message for every credential failure. Distinguishing "user not found"
    /// from "wrong password" (as the old code did) is a free account-enumeration
    /// oracle: an attacker learns which e-mails exist before guessing anything.
    /// </summary>
    private const string GenericCredentialError = "Email hoặc mật khẩu không đúng.";

    private const string DeactivatedError = "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.";

    public static void MapAuthenticationEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/register", async (RegisterDto model, UserManager<ApplicationUser> userManager,
            IPublishEndpoint publishEndpoint, IEmailService emailService) =>
        {
            var user = new ApplicationUser
            {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                CreatedAt = DateTime.UtcNow
            };
            var result = await userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            await userManager.AddToRoleAsync(user, Roles.Customer);
            await publishEndpoint.Publish(new UserRegisteredIntegrationEvent(Guid.Parse(user.Id), user.Email!, user.FullName));

            try
            {
                await emailService.SendWelcomeEmailAsync(user.Email!, user.FullName);
            }
            catch (Exception)
            {
                // A failed welcome mail must never fail the registration.
            }

            return Results.Ok(new { Message = "User registered successfully" });
        }).WithValidation<RegisterDto>().RequireRateLimiting("auth");

        // ----------------------------------------------------------------- login
        group.MapPost("/login", async (LoginDto model, UserManager<ApplicationUser> userManager,
            IdentityDbContext db, IRateLimitService rateLimitService, ITokenIssuer tokenIssuer,
            ITwoFactorChallengeService challenges, HttpContext httpContext) =>
        {
            // In-process throttle (5 failures / 10 min per e-mail) in front of
            // the persistent Identity lockout configured in DependencyInjection.
            var rateLimitKey = $"login:{PasswordResetCodeService.NormalizeEmail(model.Email)}";
            if (await rateLimitService.IsRateLimitedAsync(rateLimitKey, 5, TimeSpan.FromMinutes(10)))
                return Results.StatusCode(StatusCodes.Status429TooManyRequests);

            var user = await userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                // Same shape, same status as a wrong password - no enumeration.
                await rateLimitService.IncrementAsync(rateLimitKey, TimeSpan.FromMinutes(10));
                return Results.BadRequest(new { Error = GenericCredentialError });
            }

            if (await userManager.IsLockedOutAsync(user))
                return Results.StatusCode(StatusCodes.Status429TooManyRequests);

            if (!await userManager.CheckPasswordAsync(user, model.Password))
            {
                await userManager.AccessFailedAsync(user);
                await rateLimitService.IncrementAsync(rateLimitKey, TimeSpan.FromMinutes(10));
                return Results.BadRequest(new { Error = GenericCredentialError });
            }

            // Only AFTER the password is proven correct may we say anything
            // specific about the account - that leaks nothing to a guesser.
            if (!user.IsActive) return Results.BadRequest(new { Error = DeactivatedError });

            await userManager.ResetAccessFailedCountAsync(user);
            await rateLimitService.ResetAsync(rateLimitKey);

            // Step 2 gate. No tokens are minted here: the challenge carries no
            // roles and no permissions, so the window between the two steps
            // grants nothing at all.
            var twoFactor = await db.TwoFactorConfigs.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == user.Id);
            if (twoFactor is { IsEnabled: true })
            {
                var (challengeToken, expiresIn) = await challenges.CreateAsync(user.Id, httpContext);
                return Results.Ok(new TwoFactorRequiredDto { ChallengeToken = challengeToken, ExpiresInSeconds = expiresIn });
            }

            return Results.Ok(await LoginCompletion.CompleteAsync(user, userManager, tokenIssuer, httpContext));
        }).WithValidation<LoginDto>().RequireRateLimiting("auth");

        // Step 2 of the 2FA login lives in TwoFactorLoginEndpoint.cs.

        group.MapPost("/refresh-token", async (RefreshTokenRequestDto model, UserManager<ApplicationUser> userManager,
            IRefreshTokenService refreshTokenService, ITokenIssuer tokenIssuer, HttpContext httpContext) =>
        {
            if (string.IsNullOrEmpty(model.RefreshToken))
                return Results.BadRequest(new { Error = "Refresh token is required" });

            var refreshToken = await refreshTokenService.GetRefreshTokenAsync(model.RefreshToken);
            if (refreshToken == null) return Results.BadRequest(new { Error = "Invalid refresh token" });

            // Reuse detection. A token that was already rotated away is being
            // presented again: either it was stolen from the client or the row
            // was read from the database. Either way the family is compromised,
            // so it dies instead of producing a fresh pair.
            if (refreshToken.IsRevoked && refreshToken.ReplacedByToken != null)
            {
                await refreshTokenService.HandleReuseAsync(refreshToken, TokenIssuer.ClientIp(httpContext));
                return Results.BadRequest(new { Error = "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại." });
            }

            if (!refreshToken.IsActive) return Results.BadRequest(new { Error = "Invalid refresh token" });

            var user = refreshToken.User ?? await userManager.FindByIdAsync(refreshToken.UserId);
            if (user == null || !user.IsActive) return Results.BadRequest(new { Error = "User not found or inactive" });

            return Results.Ok(await tokenIssuer.RotateAsync(user, refreshToken, model.RefreshToken, httpContext));
        }).RequireRateLimiting("auth");

        group.MapPost("/logout", async (RefreshTokenRequestDto model, IRefreshTokenService refreshTokenService, HttpContext httpContext) =>
        {
            if (string.IsNullOrEmpty(model.RefreshToken))
                return Results.BadRequest(new { Error = "Refresh token is required" });

            var ip = TokenIssuer.ClientIp(httpContext);
            var token = await refreshTokenService.GetRefreshTokenAsync(model.RefreshToken);

            // Logging out closes the DEVICE, not just the one token in hand -
            // otherwise the family's next rotation is still valid.
            if (token?.SessionId is { } sessionId) await refreshTokenService.RevokeSessionAsync(sessionId, ip, "Logout");
            else await refreshTokenService.RevokeRefreshTokenAsync(model.RefreshToken, ip);

            return Results.Ok(new { Message = "Logged out successfully" });
        });

        group.MapPost("/revoke-all-tokens", [Authorize] async (IRefreshTokenService refreshTokenService,
            UserManager<ApplicationUser> userManager, IUserStateCache stateCache,
            ClaimsPrincipal principal, HttpContext httpContext) =>
        {
            var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var killed = await refreshTokenService.RevokeAllUserTokensAsync(userId, TokenIssuer.ClientIp(httpContext), "User");

            // Bump the stamp too, or the access tokens already issued keep working
            // for up to their full lifetime after "log out everywhere".
            var user = await userManager.FindByIdAsync(userId);
            if (user != null) await userManager.UpdateSecurityStampAsync(user);
            await stateCache.InvalidateAsync(userId);

            return Results.Ok(new
            {
                Message = "All tokens revoked successfully. You have been logged out from all devices.",
                RefreshTokensRevoked = killed
            });
        });
    }
}
