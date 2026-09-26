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
/// `POST /api/auth/login/2fa` - step 2 of a two-factor sign-in.
///
/// Step 1 (`/api/auth/login`) proves the password and answers
/// `{ requiresTwoFactor: true, challengeToken }` WITHOUT minting any token. This
/// endpoint proves possession of the second factor and only then issues the real
/// access + refresh pair. Before W1-2 there was no step 2 at all: login handed
/// out full tokens whether or not the account had 2FA switched on, which is why
/// enabling it changed nothing about how anyone logged in.
/// </summary>
public static class TwoFactorLoginEndpoint
{
    private const string InvalidCode = "Mã xác thực không đúng hoặc đã hết hạn.";

    public static void MapTwoFactorLoginEndpoint(this RouteGroupBuilder group)
    {
        group.MapPost("/login/2fa", async (LoginTwoFactorDto model, UserManager<ApplicationUser> userManager,
            IdentityDbContext db, ITwoFactorChallengeService challenges, ITokenIssuer tokenIssuer,
            IAuditService audit, HttpContext httpContext) =>
        {
            var challenge = await challenges.ResolveAsync(model?.ChallengeToken);
            if (challenge == null)
                return Results.BadRequest(new { Error = "Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại." });

            var user = await userManager.FindByIdAsync(challenge.UserId);
            if (user == null || !user.IsActive)
            {
                await challenges.ConsumeAsync(challenge);
                return Results.BadRequest(new { Error = "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên." });
            }

            var config = await db.TwoFactorConfigs.FirstOrDefaultAsync(t => t.UserId == user.Id);
            if (config is not { IsEnabled: true })
            {
                // 2FA was switched off while this challenge was open. The password
                // was already proven, so honour the login rather than dead-ending it.
                await challenges.ConsumeAsync(challenge);
                return RefreshTokenCookie.SignIn(httpContext, await LoginCompletion.CompleteAsync(user, userManager, tokenIssuer, httpContext));
            }

            // W1-2 (thẩm định): TwoFactorAttemptGuard trước đây chỉ chạy ở /2fa/verify-setup và
            // /2fa/disable - KHÔNG chạy ở đây, đúng con đường mà kẻ tấn công thực sự dò mã. Trần 5
            // lần/15 phút mà phase file và docs/api-contracts/identity.md §4 hứa hẹn vì thế không
            // áp dụng cho đăng nhập: mỗi lần /login mở một challenge mới với 5 lượt đoán mới.
            // Không có nguy cơ DoS từ người lạ: muốn tới được đây phải qua bước mật khẩu.
            var locked = await TwoFactorAttemptGuard.GuardAsync(db, config);
            if (locked != null) return locked;

            var verified = TotpService.TryVerify(config.TotpSecret, model?.Code, config.LastUsedTimeStep, out var step);
            if (verified)
            {
                // Spending the step is what stops a shoulder-surfed code from
                // being replayed for the rest of its 90-second window.
                config.LastUsedTimeStep = step;
            }
            else if (BackupCodeService.TryRedeem(config.BackupCodes, model?.BackupCode, out var remainingCodes))
            {
                config.BackupCodes = remainingCodes;
                verified = true;
                await audit.LogAsync(user.Id, "TwoFactorBackupCodeUsed", "ApplicationUser", user.Id,
                    $"Dùng mã dự phòng, còn lại {BackupCodeService.RemainingCount(remainingCodes)}");
            }

            if (!verified)
            {
                var dead = await challenges.RegisterFailedAttemptAsync(challenge);
                // RegisterFailureAsync (thay cho `config.FailedAttempts++` trần) mới là thứ đặt
                // LockedUntil khi chạm 5 lần - nếu không, bộ đếm cứ tăng mà không bao giờ khoá.
                await TwoFactorAttemptGuard.RegisterFailureAsync(db, config);
                return Results.BadRequest(new
                {
                    Error = dead ? "Sai mã quá nhiều lần. Vui lòng đăng nhập lại." : InvalidCode
                });
            }

            config.FailedAttempts = 0;
            config.LockedUntil = null;
            await db.SaveChangesAsync();
            await challenges.ConsumeAsync(challenge);

            return RefreshTokenCookie.SignIn(httpContext, await LoginCompletion.CompleteAsync(user, userManager, tokenIssuer, httpContext));
        }).WithValidation<LoginTwoFactorDto>()
          // W4-5: bước 2 của đăng nhập BẮT BUỘC ẩn danh (chưa có token nào được phát ở bước 1).
          // Không lộ tài khoản có tồn tại hay không: đầu vào là challengeToken chứ không phải
          // email/username, và token sai/hết hạn luôn trả cùng một thông báo.
          .AllowAnonymous()
          .RequireRateLimiting("auth");
    }
}
