using System.Security.Claims;
using System.Security.Cryptography;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Identity.DTOs;
using Identity.Infrastructure;
using Identity.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Identity.Endpoints;

/// <summary>
/// The user-admin actions that change what an account can do. Every one of them
/// now takes effect immediately instead of "some time within the token lifetime":
/// they roll the security stamp and drop the cached user state, which is what
/// <see cref="AccessTokenStateGuard"/> checks on every request.
/// </summary>
public static class UserAdminActionEndpoints
{
    public static void MapUserAdminActionEndpoints(this RouteGroupBuilder group)
    {
        // Role assignment lives in UserRoleAssignmentEndpoint.cs.
        group.MapUserRoleAssignmentEndpoint();

        group.MapPost("/users/{id}/activate", async (string id, UserManager<ApplicationUser> userManager,
            IUserStateCache stateCache, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await UserAdminSupport.FindAnyAsync(userManager, id);
            if (user == null) return Results.NotFound(new { Error = UserAdminSupport.UserNotFound });

            user.IsActive = true;
            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            await stateCache.InvalidateAsync(user.Id);
            await auditService.LogAsync(UserAdminSupport.PerformedBy(currentUser), "ActivateUser", "ApplicationUser", user.Id, "Activated user");
            return Results.Ok(new { Message = "User activated successfully", IsActive = true });
        }).RequireAuthorization(Permissions.Users.Edit);

        group.MapPost("/users/{id}/deactivate", async (string id, UserManager<ApplicationUser> userManager,
            IRefreshTokenService refreshTokens, IUserStateCache stateCache, IAuditService auditService,
            ClaimsPrincipal currentUser, HttpContext httpContext) =>
                await DeactivateAsync(id, userManager, refreshTokens, stateCache, auditService, currentUser, httpContext))
            .RequireAuthorization(Permissions.Users.Delete);

        group.MapPost("/users/{id}/toggle-status", async (string id, UserManager<ApplicationUser> userManager,
            IRefreshTokenService refreshTokens, IUserStateCache stateCache, IAuditService auditService,
            ClaimsPrincipal currentUser, HttpContext httpContext) =>
        {
            var user = await UserAdminSupport.FindAnyAsync(userManager, id);
            if (user == null) return Results.NotFound(new { Error = UserAdminSupport.UserNotFound });

            if (user.IsActive)
                return await DeactivateAsync(id, userManager, refreshTokens, stateCache, auditService, currentUser, httpContext);

            user.IsActive = true;
            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            await stateCache.InvalidateAsync(user.Id);
            await auditService.LogAsync(UserAdminSupport.PerformedBy(currentUser), "ActivateUser", "ApplicationUser", user.Id, "Activated user");
            return Results.Ok(new { Message = "User activated", IsActive = true });
        }).RequireAuthorization(Permissions.Users.Edit);

        group.MapPost("/users/{id}/reset-password", async (string id, UserManager<ApplicationUser> userManager,
            IRefreshTokenService refreshTokens, IUserStateCache stateCache, IEmailService emailService,
            IAuditService auditService, ClaimsPrincipal currentUser, HttpContext httpContext) =>
        {
            var user = await UserAdminSupport.FindAnyAsync(userManager, id);
            if (user == null) return Results.NotFound(new { Error = UserAdminSupport.UserNotFound });

            var temporaryPassword = GenerateTemporaryPassword();
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var result = await userManager.ResetPasswordAsync(user, token, temporaryPassword);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            user.ForcePasswordChange = true;
            user.PasswordChangedAt = DateTime.UtcNow;
            await userManager.UpdateAsync(user);
            await userManager.ResetAccessFailedCountAsync(user);
            await userManager.SetLockoutEndDateAsync(user, null);

            // An admin reset must end every session the old password opened.
            await refreshTokens.RevokeAllUserTokensAsync(user.Id, TokenIssuer.ClientIp(httpContext), "Admin");
            await stateCache.InvalidateAsync(user.Id);

            try
            {
                await emailService.SendEmailAsync(user.Email!, "Mật khẩu tạm thời - Quang Hưởng Computer",
                    $"<p>Quản trị viên đã đặt lại mật khẩu của bạn.</p><p>Mật khẩu tạm thời: <b>{temporaryPassword}</b></p>" +
                    "<p>Bạn sẽ được yêu cầu đổi mật khẩu ngay khi đăng nhập.</p>");
            }
            catch (Exception)
            {
                // Mail is best effort; the admin still gets the password below.
            }

            // Never logged: AuditSecretScrubber would scrub it anyway, but the
            // safest audit entry is one that never contained the secret.
            await auditService.LogAsync(UserAdminSupport.PerformedBy(currentUser), "ResetUserPassword", "ApplicationUser", user.Id,
                "Đặt lại mật khẩu, bắt buộc đổi ở lần đăng nhập kế tiếp");

            return Results.Ok(new
            {
                Message = "Đã đặt lại mật khẩu. Người dùng phải đổi mật khẩu ở lần đăng nhập kế tiếp.",
                TemporaryPassword = temporaryPassword,
                ForcePasswordChange = true
            });
        }).RequireAuthorization(Permissions.Users.Edit);

        group.MapPost("/users/{id}/revoke-sessions", async (string id, UserManager<ApplicationUser> userManager,
            IRefreshTokenService refreshTokens, IUserStateCache stateCache, IAuditService auditService,
            ClaimsPrincipal currentUser, HttpContext httpContext) =>
        {
            var user = await UserAdminSupport.FindAnyAsync(userManager, id);
            if (user == null) return Results.NotFound(new { Error = UserAdminSupport.UserNotFound });

            var killed = await refreshTokens.RevokeAllUserTokensAsync(user.Id, TokenIssuer.ClientIp(httpContext), "Admin");
            await UserAdminSupport.InvalidateTokensAsync(userManager, stateCache, user);

            await auditService.LogAsync(UserAdminSupport.PerformedBy(currentUser), "RevokeUserSessions", "ApplicationUser", user.Id,
                $"Thu hồi toàn bộ phiên đăng nhập ({killed} refresh token)");

            return Results.Ok(new { Message = "Đã thu hồi toàn bộ phiên đăng nhập.", RefreshTokensRevoked = killed });
        }).RequireAuthorization(Permissions.Users.Edit);
    }

    /// <summary>Shared by DELETE /users/{id}, POST /users/{id}/deactivate and toggle-status.</summary>
    internal static async Task<IResult> DeactivateAsync(
        string id,
        UserManager<ApplicationUser> userManager,
        IRefreshTokenService refreshTokens,
        IUserStateCache stateCache,
        IAuditService auditService,
        ClaimsPrincipal currentUser,
        HttpContext httpContext)
    {
        var user = await UserAdminSupport.FindAnyAsync(userManager, id);
        if (user == null) return Results.NotFound(new { Error = UserAdminSupport.UserNotFound });

        var blocked = await UserAdminSupport.CheckDeactivationAllowedAsync(userManager, currentUser, user);
        if (blocked != null) return blocked;

        user.IsActive = false;
        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded) return Results.BadRequest(result.Errors);

        // This trio is what makes "vô hiệu hóa" real: the refresh families die,
        // the stamp rolls so the access token in the user's browser stops
        // validating, and the cache entry is dropped so the very next request
        // re-reads IsActive=false instead of a 60s-stale "true".
        await refreshTokens.RevokeAllUserTokensAsync(user.Id, TokenIssuer.ClientIp(httpContext), "Admin");
        await UserAdminSupport.InvalidateTokensAsync(userManager, stateCache, user);

        await auditService.LogAsync(UserAdminSupport.PerformedBy(currentUser), "DeactivateUser", "ApplicationUser", user.Id,
            "Deactivated user (Soft Delete)");
        return Results.Ok(new { Message = "User deactivated successfully", IsActive = false });
    }

    /// <summary>
    /// A 12-character temporary password from the OS CSPRNG. It satisfies the
    /// configured policy (>= 6 chars) and is single use in practice because
    /// <c>ForcePasswordChange</c> is set at the same time.
    /// </summary>
    private static string GenerateTemporaryPassword()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        var chars = new char[12];
        for (var i = 0; i < chars.Length; i++) chars[i] = alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)];
        // Guarantee a digit and a symbol regardless of the draw.
        chars[0] = (char)('2' + RandomNumberGenerator.GetInt32(8));
        chars[^1] = "!@#$%".ToCharArray()[RandomNumberGenerator.GetInt32(5)];
        return new string(chars);
    }
}
