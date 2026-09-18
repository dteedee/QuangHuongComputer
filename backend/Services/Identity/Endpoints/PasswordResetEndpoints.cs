using Identity.Infrastructure;
using Identity.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using BuildingBlocks.Validation;

namespace Identity.Endpoints;

/// <summary>
/// Forgot / reset password.
///
/// The old flow was a complete account takeover:
///   * the 6-digit code came from `new Random()` (clock-seeded, predictable);
///   * it was stored in clear text;
///   * `/reset-password` matched on the CODE ALONE, so anyone could request a
///     code for their own address and then use it to reset the account that
///     happened to own a colliding row - with 900.000 possible codes and no
///     attempt limit, a collision was a matter of a few thousand requests.
///
/// Now: CSPRNG code, salted hash at rest, lookup keyed on the e-mail, five
/// attempts per challenge, and every refresh token of the account is revoked on
/// success so an attacker's existing session dies with the password change.
/// </summary>
public static class PasswordResetEndpoints
{
    /// <summary>
    /// Identical answer whether or not the address exists - anything else is an
    /// account-enumeration oracle.
    /// </summary>
    private const string GenericForgotResponse =
        "Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi tới hộp thư của bạn.";

    private const string GenericResetError =
        "Mã xác nhận không hợp lệ hoặc đã hết hạn.";

    public static void MapPasswordResetEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/forgot-password", async (
            ForgotPasswordDto model,
            UserManager<ApplicationUser> userManager,
            IdentityDbContext dbContext,
            IEmailService emailService,
            IRateLimitService rateLimitService,
            IHostEnvironment env,
            ILoggerFactory loggerFactory,
            HttpContext httpContext) =>
        {
            var logger = loggerFactory.CreateLogger("Identity.PasswordReset");
            var email = PasswordResetCodeService.NormalizeEmail(model?.Email);
            if (string.IsNullOrWhiteSpace(email))
            {
                return Results.Ok(new { Message = GenericForgotResponse });
            }

            // Keyed on IP **and** e-mail: an e-mail-only key lets one attacker
            // lock a victim out of their own reset, an IP-only key lets one
            // attacker walk every address behind a single NAT.
            var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var rateLimitKey = $"forgot-password:{ip}:{email}";
            if (await rateLimitService.IsRateLimitedAsync(rateLimitKey, 3, TimeSpan.FromMinutes(15)))
            {
                return Results.StatusCode(StatusCodes.Status429TooManyRequests);
            }
            await rateLimitService.IncrementAsync(rateLimitKey, TimeSpan.FromMinutes(15));

            var user = await userManager.FindByEmailAsync(email);
            if (user == null || !user.IsActive)
            {
                return Results.Ok(new { Message = GenericForgotResponse });
            }

            // Only one live challenge per account.
            await dbContext.PasswordResetTokens
                .Where(rt => rt.UserId == user.Id && !rt.IsUsed)
                .ExecuteUpdateAsync(s => s.SetProperty(rt => rt.IsUsed, true));

            var code = PasswordResetCodeService.GenerateCode();
            var salt = PasswordResetCodeService.GenerateSalt();

            dbContext.PasswordResetTokens.Add(new PasswordResetToken
            {
                UserId = user.Id,
                Email = email,
                Salt = salt,
                CodeHash = PasswordResetCodeService.ComputeHash(email, code, salt),
                ExpiresAt = DateTime.UtcNow.Add(PasswordResetCodeService.Lifetime),
                IsUsed = false,
                Attempts = 0
            });
            await dbContext.SaveChangesAsync();

            try
            {
                await emailService.SendPasswordResetEmailAsync(user.Email!, code);
            }
            catch (Exception ex)
            {
                // Never surface the delivery outcome - that would reveal whether
                // the address exists. Log it for the operator instead.
                logger.LogError(ex, "Password reset mail could not be sent");
            }

            if (env.IsDevelopment())
            {
                // Dev convenience only; Development never runs against real users.
                logger.LogWarning("[DEV] Password reset code for {Email}: {Code}", email, code);
            }

            return Results.Ok(new { Message = GenericForgotResponse });
        }).WithValidation<ForgotPasswordDto>().RequireRateLimiting("auth");

        group.MapPost("/reset-password", async (
            ResetPasswordDto model,
            UserManager<ApplicationUser> userManager,
            IdentityDbContext dbContext,
            IRefreshTokenService refreshTokenService,
            IRateLimitService rateLimitService,
            HttpContext httpContext) =>
        {
            var email = PasswordResetCodeService.NormalizeEmail(model?.Email);
            var code = (model?.SubmittedCode ?? string.Empty).Trim();
            var newPassword = model?.NewPassword ?? string.Empty;

            if (string.IsNullOrWhiteSpace(email))
            {
                return Results.BadRequest(new { Message = "Vui lòng nhập email đã yêu cầu đặt lại mật khẩu." });
            }
            if (!PasswordResetCodeService.IsWellFormedCode(code) || string.IsNullOrEmpty(newPassword))
            {
                return Results.BadRequest(new { Message = GenericResetError });
            }

            var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var rateLimitKey = $"reset-password:{ip}:{email}";
            if (await rateLimitService.IsRateLimitedAsync(rateLimitKey, 10, TimeSpan.FromMinutes(15)))
            {
                return Results.StatusCode(StatusCodes.Status429TooManyRequests);
            }
            await rateLimitService.IncrementAsync(rateLimitKey, TimeSpan.FromMinutes(15));

            // Lookup is by E-MAIL, never by code. This single line is the fix for
            // the takeover: a challenge can only ever resolve to its own account.
            var challenge = await dbContext.PasswordResetTokens
                .Where(rt => rt.Email == email && !rt.IsUsed && rt.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(rt => rt.Id)
                .FirstOrDefaultAsync();

            if (challenge == null)
            {
                return Results.BadRequest(new { Message = GenericResetError });
            }

            if (challenge.Attempts >= PasswordResetCodeService.MaxAttempts)
            {
                challenge.IsUsed = true;
                await dbContext.SaveChangesAsync();
                return Results.BadRequest(new { Message = GenericResetError });
            }

            if (!PasswordResetCodeService.VerifyHash(challenge.CodeHash, email, code, challenge.Salt))
            {
                challenge.Attempts++;
                if (challenge.Attempts >= PasswordResetCodeService.MaxAttempts) challenge.IsUsed = true;
                await dbContext.SaveChangesAsync();
                return Results.BadRequest(new { Message = GenericResetError });
            }

            var user = await userManager.FindByIdAsync(challenge.UserId);
            if (user == null || !user.IsActive ||
                !string.Equals(PasswordResetCodeService.NormalizeEmail(user.Email), email, StringComparison.Ordinal))
            {
                // The account was renamed or deactivated after the code was issued.
                challenge.IsUsed = true;
                await dbContext.SaveChangesAsync();
                return Results.BadRequest(new { Message = GenericResetError });
            }

            // GeneratePasswordResetToken + ResetPassword replaces the hash in one
            // step. The old code did RemovePassword then AddPassword, which left
            // the account with NO password at all if the second call failed
            // validation - a password-less account anyone could then take over.
            var identityToken = await userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await userManager.ResetPasswordAsync(user, identityToken, newPassword);
            if (!resetResult.Succeeded)
            {
                // Password-policy failures are the user's own input; surface them
                // without touching the challenge so they can retry.
                return Results.BadRequest(new
                {
                    Message = "Mật khẩu mới không hợp lệ.",
                    Errors = resetResult.Errors.Select(e => e.Description).ToList()
                });
            }

            challenge.IsUsed = true;
            await dbContext.SaveChangesAsync();

            user.PasswordChangedAt = DateTime.UtcNow;
            await userManager.UpdateSecurityStampAsync(user);
            await userManager.ResetAccessFailedCountAsync(user);
            await userManager.SetLockoutEndDateAsync(user, null);
            await userManager.UpdateAsync(user);

            // Any session established before the reset - including an attacker's -
            // must not survive it.
            await refreshTokenService.RevokeAllUserTokensAsync(user.Id);
            await rateLimitService.ResetAsync(rateLimitKey);

            return Results.Ok(new { Message = "Mật khẩu đã được đặt lại thành công." });
        }).WithValidation<ResetPasswordDto>().RequireRateLimiting("auth");
    }
}
