using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Identity.Services;

/// <summary>
/// The <c>OnTokenValidated</c> hook that turns "deactivate this user" and
/// "revoke these sessions" into something that actually takes effect.
///
/// A JWT is valid until it expires; nothing in the signature can be withdrawn.
/// So after the signature check we ask <see cref="IUserStateCache"/> (Redis, 60s
/// TTL, database fallback) two questions:
///   1. is the account still active?
///   2. does the token's security stamp still match the account's?
/// A "no" to either fails authentication, so the request is a 401 and the client
/// re-authenticates. The stamp is bumped on password change, role change,
/// role-permission change and "revoke all sessions" - which is what makes those
/// four operations immediate instead of "within the token lifetime".
///
/// Fail-open is deliberate in exactly ONE case: a token issued before this
/// feature shipped carries no <see cref="StampClaimType"/>. Those tokens are
/// still subject to the IsActive check and die within the access-token lifetime
/// anyway; rejecting them outright would log out every signed-in user the moment
/// the API restarts, which is the "breaking login for everyone" risk the phase
/// file calls out. Redis being down is NOT such a case - see UserStateCache.
/// </summary>
public static class AccessTokenStateGuard
{
    /// <summary>Short, non-colliding claim name. `stamp` is not a registered JWT claim.</summary>
    public const string StampClaimType = "stamp";

    public static Task ValidateAsync(TokenValidatedContext context)
    {
        return ValidateCoreAsync(context);
    }

    private static async Task ValidateCoreAsync(TokenValidatedContext context)
    {
        var principal = context.Principal;
        if (principal == null)
        {
            context.Fail("Không xác định được người dùng.");
            return;
        }

        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? principal.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId)) return; // not a user token (machine/hub token) - nothing to check

        var services = context.HttpContext.RequestServices;
        var cache = services.GetService<IUserStateCache>();
        if (cache == null) return; // module not wired (unit-test host) - nothing to enforce

        UserSecurityState? state;
        try
        {
            state = await cache.GetAsync(userId, context.HttpContext.RequestAborted);
        }
        catch (Exception ex)
        {
            // UserStateCache already falls back to the database internally; if even
            // that threw, the safe answer is "cannot prove this account is still
            // valid" -> refuse. Anything else re-opens the hole D05 item 8 forbids.
            services.GetService<ILoggerFactory>()?
                .CreateLogger(typeof(AccessTokenStateGuard))
                .LogError(ex, "User-state check failed for {UserId}; refusing the token", userId);
            context.Fail("Không kiểm tra được trạng thái tài khoản.");
            return;
        }

        if (state == null)
        {
            context.Fail("Tài khoản không còn tồn tại.");
            return;
        }

        if (!state.IsActive)
        {
            context.Fail("Tài khoản đã bị vô hiệu hóa.");
            return;
        }

        // Per-device revocation: "thu hồi phiên này" has to stop the access token
        // that device is already holding, not just its refresh token - otherwise
        // the revoked laptop keeps working for the rest of the token's hour.
        if (Guid.TryParse(principal.FindFirstValue(JwtTokenFactory.SessionClaimType), out var sessionId)
            && await cache.IsSessionRevokedAsync(sessionId, context.HttpContext.RequestAborted))
        {
            context.Fail("Phiên đăng nhập đã bị thu hồi.");
            return;
        }

        var tokenStamp = principal.FindFirstValue(StampClaimType);
        if (string.IsNullOrEmpty(tokenStamp)) return; // legacy token - see class remarks

        if (!string.Equals(tokenStamp, state.SecurityStamp, StringComparison.Ordinal))
        {
            context.Fail("Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.");
        }
    }
}
