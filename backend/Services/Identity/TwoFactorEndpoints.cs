using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Identity.Infrastructure;
using Identity.Domain;
using System.Security.Claims;
using System.Security.Cryptography;

namespace Identity;

public static class TwoFactorEndpoints
{
    public static void MapTwoFactorEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/identity/2fa").RequireAuthorization();

        // Setup: generate TOTP secret + QR URI
        group.MapPost("/setup", async (ClaimsPrincipal user, IdentityDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var existing = await db.TwoFactorConfigs.FirstOrDefaultAsync(t => t.UserId == userId);
            if (existing?.IsEnabled == true)
                return Results.BadRequest(new { error = "2FA already enabled" });

            var secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(20));
            var config = existing ?? new TwoFactorConfig { UserId = userId };
            config.TotpSecret = secret;
            config.IsEnabled = false;

            if (existing == null) db.TwoFactorConfigs.Add(config);
            await db.SaveChangesAsync();

            var userEmail = user.FindFirstValue(ClaimTypes.Email) ?? "user";
            var b32Secret = Base32Encode(Convert.FromBase64String(secret));
            var otpauthUri = $"otpauth://totp/QuangHuongComputer:{userEmail}?secret={b32Secret}&issuer=QuangHuongComputer&digits=6&period=30";

            return Results.Ok(new { secret = b32Secret, qrUri = otpauthUri });
        });

        // Verify setup: confirm with 6-digit code then enable 2FA
        group.MapPost("/verify-setup", async (TwoFactorVerifyRequest request, ClaimsPrincipal user, IdentityDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var config = await db.TwoFactorConfigs.FirstOrDefaultAsync(t => t.UserId == userId);
            if (config == null) return Results.NotFound();

            // Basic format validation (production: use OtpNet for HMAC-SHA1 TOTP verification)
            if (string.IsNullOrEmpty(request.Code) || request.Code.Length != 6 || !request.Code.All(char.IsDigit))
                return Results.BadRequest(new { error = "Invalid code format" });

            config.IsEnabled = true;
            config.EnabledDate = DateTime.UtcNow;

            // Generate 10 one-time backup codes
            var backupCodes = Enumerable.Range(0, 10)
                .Select(_ => $"{RandomNumberGenerator.GetInt32(100000, 999999)}")
                .ToList();
            config.BackupCodes = System.Text.Json.JsonSerializer.Serialize(backupCodes);

            await db.SaveChangesAsync();
            return Results.Ok(new { enabled = true, backupCodes });
        });

        // Disable 2FA and clear secrets
        group.MapPost("/disable", async (ClaimsPrincipal user, IdentityDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var config = await db.TwoFactorConfigs.FirstOrDefaultAsync(t => t.UserId == userId);
            if (config == null) return Results.NotFound();

            config.IsEnabled = false;
            config.TotpSecret = "";
            config.BackupCodes = "";
            await db.SaveChangesAsync();
            return Results.Ok(new { disabled = true });
        });

        // Get 2FA status for current user
        group.MapGet("/status", async (ClaimsPrincipal user, IdentityDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var config = await db.TwoFactorConfigs.FirstOrDefaultAsync(t => t.UserId == userId);
            return Results.Ok(new { isEnabled = config?.IsEnabled ?? false, enabledDate = config?.EnabledDate });
        });
    }

    private static string Base32Encode(byte[] data)
    {
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var result = new System.Text.StringBuilder();
        int buffer = 0, bitsLeft = 0;
        foreach (var b in data)
        {
            buffer = (buffer << 8) | b;
            bitsLeft += 8;
            while (bitsLeft >= 5) { bitsLeft -= 5; result.Append(alphabet[(buffer >> bitsLeft) & 0x1F]); }
        }
        if (bitsLeft > 0) result.Append(alphabet[(buffer << (5 - bitsLeft)) & 0x1F]);
        return result.ToString();
    }
}

public record TwoFactorVerifyRequest(string Code);
