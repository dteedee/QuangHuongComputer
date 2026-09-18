using Identity.DTOs;
using Identity.Infrastructure;
using Identity.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;

namespace Identity.Endpoints;

/// <summary>
/// The last step of every successful sign-in - password login, the 2FA second
/// step and Google login all end here.
///
/// It exists so that the three paths cannot drift apart again: before W1-2 each
/// one had its own copy of "stamp the login, mint a JWT, mint a refresh token",
/// with three different token lifetimes and no session record anywhere.
/// </summary>
internal static class LoginCompletion
{
    public static async Task<LoginResponseDto> CompleteAsync(
        ApplicationUser user,
        UserManager<ApplicationUser> userManager,
        ITokenIssuer tokenIssuer,
        HttpContext httpContext)
    {
        user.LastLoginAt = DateTime.UtcNow;
        user.LastLoginIp = TokenIssuer.ClientIp(httpContext);
        await userManager.UpdateAsync(user);

        // IssueAsync opens the UserSessions row (the device) and mints the
        // access+refresh pair bound to it.
        return await tokenIssuer.IssueAsync(user, httpContext);
    }
}
