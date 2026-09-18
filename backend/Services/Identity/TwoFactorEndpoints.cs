using System.Security.Claims;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Identity.Domain;
using Identity.DTOs;
using Identity.Infrastructure;
using Identity.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Identity;

/// <summary>
/// `/api/identity/2fa` - enrolment, confirmation, status and disabling.
///
/// What this replaces: every one of these endpoints was a facade.
/// `verify-setup` accepted ANY six digits, so "000000" enabled 2FA without the
/// user ever pairing an app; the backup codes were stored in clear text and were
/// never single use; and `disable` required nothing at all - no password, no
/// code - so anyone holding a session could strip the second factor.
///
/// Now: RFC 6238 verification against the stored secret (<see cref="TotpService"/>),
/// hashed single-use backup codes, and disabling costs password + live code.
/// </summary>
public static class TwoFactorEndpoints
{
    private const string InvalidCode = "Mã xác thực không đúng hoặc đã hết hạn.";

    public static void MapTwoFactorEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/identity/2fa")
            .RequireAuthorization(SecurityPolicies.Authenticated);

        // ---------------------------------------------------------------- setup
        group.MapPost("/setup", async (ClaimsPrincipal principal, IdentityDbContext db, UserManager<ApplicationUser> userManager) =>
        {
            var userId = UserId(principal);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var config = await db.TwoFactorConfigs.FirstOrDefaultAsync(t => t.UserId == userId);
            if (config?.IsEnabled == true)
                return Results.BadRequest(new { Error = "Xác thực 2 lớp đã được bật cho tài khoản này." });

            var secret = TotpService.GenerateSecretBase32();
            if (config == null)
            {
                config = new TwoFactorConfig { Id = Guid.NewGuid(), UserId = userId };
                db.TwoFactorConfigs.Add(config);
            }
            config.TotpSecret = secret;
            config.IsEnabled = false;
            config.FailedAttempts = 0;
            config.LockedUntil = null;
            config.LastUsedTimeStep = 0;
            config.BackupCodes = string.Empty;
            config.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var email = (await userManager.FindByIdAsync(userId))?.Email ?? principal.FindFirstValue(ClaimTypes.Email) ?? "user";
            return Results.Ok(new
            {
                secret,
                qrUri = TotpService.BuildOtpAuthUri("QuangHuongComputer", email, secret)
            });
        });

        // --------------------------------------------------------- verify-setup
        group.MapPost("/verify-setup", async (TwoFactorVerifyRequest request, ClaimsPrincipal principal,
            IdentityDbContext db, UserManager<ApplicationUser> userManager,
            IUserStateCache stateCache, IAuditService audit) =>
        {
            var userId = UserId(principal);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var config = await db.TwoFactorConfigs.FirstOrDefaultAsync(t => t.UserId == userId);
            if (config == null || string.IsNullOrEmpty(config.TotpSecret))
                return Results.BadRequest(new { Error = "Chưa khởi tạo xác thực 2 lớp. Hãy gọi /setup trước." });
            if (config.IsEnabled)
                return Results.BadRequest(new { Error = "Xác thực 2 lớp đã được bật cho tài khoản này." });

            var locked = await TwoFactorAttemptGuard.GuardAsync(db, config);
            if (locked != null) return locked;

            // THE fix: the code is checked against the real secret. A wrong code fails.
            if (!TotpService.TryVerify(config.TotpSecret, request?.Code, config.LastUsedTimeStep, out var step))
            {
                await TwoFactorAttemptGuard.RegisterFailureAsync(db, config);
                return Results.BadRequest(new { Error = InvalidCode });
            }

            var backupCodes = BackupCodeService.Generate();
            config.IsEnabled = true;
            config.EnabledDate = DateTime.UtcNow;
            config.LastUsedTimeStep = step;
            config.FailedAttempts = 0;
            config.LockedUntil = null;
            config.BackupCodes = BackupCodeService.SerializeHashes(backupCodes);
            config.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var user = await userManager.FindByIdAsync(userId);
            if (user != null)
            {
                user.TwoFactorEnabled = true;
                await userManager.UpdateAsync(user);
            }
            await stateCache.InvalidateAsync(userId);
            await audit.LogAsync(userId, "EnableTwoFactor", "ApplicationUser", userId, "Bật xác thực 2 lớp");

            // The clear-text codes exist only in this response. They are never readable again.
            return Results.Ok(new { enabled = true, backupCodes });
        }).WithValidation<TwoFactorVerifyRequest>();

        // -------------------------------------------------------------- disable
        group.MapPost("/disable", async (TwoFactorDisableDto request, ClaimsPrincipal principal,
            IdentityDbContext db, UserManager<ApplicationUser> userManager,
            IUserStateCache stateCache, IAuditService audit) =>
        {
            var userId = UserId(principal);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var user = await userManager.FindByIdAsync(userId);
            if (user == null) return Results.Unauthorized();

            var config = await db.TwoFactorConfigs.FirstOrDefaultAsync(t => t.UserId == userId);
            if (config is not { IsEnabled: true })
                return Results.BadRequest(new { Error = "Xác thực 2 lớp chưa được bật." });

            if (!await userManager.CheckPasswordAsync(user, request?.Password ?? string.Empty))
                return Results.BadRequest(new { Error = "Mật khẩu không đúng." });

            var locked = await TwoFactorAttemptGuard.GuardAsync(db, config);
            if (locked != null) return locked;

            var codeOk = TotpService.TryVerify(config.TotpSecret, request?.Code, config.LastUsedTimeStep, out var step);
            if (codeOk) config.LastUsedTimeStep = step;
            if (!codeOk && BackupCodeService.TryRedeem(config.BackupCodes, request?.BackupCode, out var remaining))
            {
                config.BackupCodes = remaining;
                codeOk = true;
            }
            if (!codeOk)
            {
                await TwoFactorAttemptGuard.RegisterFailureAsync(db, config);
                return Results.BadRequest(new { Error = InvalidCode });
            }

            config.IsEnabled = false;
            config.TotpSecret = string.Empty;
            config.BackupCodes = string.Empty;
            config.FailedAttempts = 0;
            config.LockedUntil = null;
            config.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            user.TwoFactorEnabled = false;
            await userManager.UpdateAsync(user);
            await stateCache.InvalidateAsync(userId);
            await audit.LogAsync(userId, "DisableTwoFactor", "ApplicationUser", userId, "Tắt xác thực 2 lớp");

            return Results.Ok(new { disabled = true });
        }).WithValidation<TwoFactorDisableDto>();

        // --------------------------------------------------------------- status
        group.MapGet("/status", async (ClaimsPrincipal principal, IdentityDbContext db) =>
        {
            var userId = UserId(principal);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var config = await db.TwoFactorConfigs.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == userId);
            return Results.Ok(new TwoFactorStatusDto
            {
                IsEnabled = config?.IsEnabled ?? false,
                EnabledDate = config?.EnabledDate,
                BackupCodesRemaining = config?.IsEnabled == true ? BackupCodeService.RemainingCount(config.BackupCodes) : 0
            });
        });
    }

    private static string? UserId(ClaimsPrincipal principal) =>
        principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
}
