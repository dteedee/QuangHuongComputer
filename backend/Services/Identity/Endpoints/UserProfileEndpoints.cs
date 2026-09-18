using System.Security.Claims;
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
/// `/api/auth/me` - the signed-in user's own profile.
///
/// The `/me/addresses` CRUD that used to live here was removed by W1-2: it was a
/// SECOND address book (`IdentityCustomerAddresses`) next to the Sales one that
/// checkout actually reads. Both tables were empty in dev and test, so nothing
/// was migrated; `/api/sales/addresses` is the surviving book - see
/// docs/api-contracts/identity.md and the integration request to the account UI.
/// </summary>
public static class UserProfileEndpoints
{
    public static void MapUserProfileEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/me", async (ClaimsPrincipal user, UserManager<ApplicationUser> userManager, IdentityDbContext dbContext) =>
        {
            var userId = UserId(user);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var appUser = await userManager.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId);
            if (appUser == null) return Results.NotFound(new { Message = "User not found" });

            var roles = await userManager.GetRolesAsync(appUser);
            var profile = await dbContext.UserProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId);
            var twoFactorEnabled = await dbContext.TwoFactorConfigs.AsNoTracking()
                .AnyAsync(t => t.UserId == userId && t.IsEnabled);

            return Results.Ok(new
            {
                id = appUser.Id,
                email = appUser.Email,
                fullName = appUser.FullName,
                phoneNumber = appUser.PhoneNumber,
                avatarUrl = appUser.AvatarUrl,
                roles = roles.ToList(),
                createdAt = appUser.CreatedAt,
                lastLoginAt = appUser.LastLoginAt,
                emailVerified = appUser.EmailConfirmed,
                twoFactorEnabled,
                forcePasswordChange = appUser.ForcePasswordChange,
                profile = profile != null ? new
                {
                    gender = profile.Gender,
                    dateOfBirth = profile.DateOfBirth,
                    address = profile.Address,
                    city = profile.City,
                    district = profile.District,
                    ward = profile.Ward,
                    customerType = profile.CustomerType.ToString(),
                    companyName = profile.CompanyName,
                    taxCode = profile.TaxCode
                } : null
            });
        }).RequireAuthorization(SecurityPolicies.Authenticated);

        group.MapPut("/me", async (UpdateProfileDto model, ClaimsPrincipal user,
            UserManager<ApplicationUser> userManager, IdentityDbContext dbContext) =>
        {
            var userId = UserId(user);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var appUser = await userManager.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId);
            if (appUser == null) return Results.NotFound(new { Message = "User not found" });

            appUser.FullName = model.FullName;
            if (!string.IsNullOrEmpty(model.PhoneNumber)) appUser.PhoneNumber = model.PhoneNumber;

            var result = await userManager.UpdateAsync(appUser);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            var profile = await dbContext.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null)
            {
                dbContext.UserProfiles.Add(new UserProfile
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Address = model.Address,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                profile.Address = model.Address;
                profile.UpdatedAt = DateTime.UtcNow;
            }

            await dbContext.SaveChangesAsync();
            return Results.Ok(new { Message = "Profile updated successfully" });
        }).WithValidation<UpdateProfileDto>().RequireAuthorization(SecurityPolicies.Authenticated);

        group.MapPost("/me/change-password", async (ChangePasswordDto model, ClaimsPrincipal user,
            UserManager<ApplicationUser> userManager, IRefreshTokenService refreshTokenService,
            IUserStateCache stateCache, HttpContext httpContext) =>
        {
            var userId = UserId(user);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var appUser = await userManager.FindByIdAsync(userId);
            if (appUser == null) return Results.NotFound(new { Message = "User not found" });

            var result = await userManager.ChangePasswordAsync(appUser, model.CurrentPassword, model.NewPassword);
            if (!result.Succeeded)
            {
                return Results.BadRequest(new
                {
                    Message = "Failed to change password",
                    Errors = result.Errors.Select(e => e.Description).ToList()
                });
            }

            appUser.PasswordChangedAt = DateTime.UtcNow;
            appUser.ForcePasswordChange = false;
            await userManager.UpdateAsync(appUser);

            // ChangePasswordAsync already rolled the security stamp, so every
            // access token minted before this call is rejected within the
            // user-state TTL. Dropping the cache entry makes it immediate, and
            // revoking the families makes the refresh tokens useless too.
            await refreshTokenService.RevokeAllUserTokensAsync(appUser.Id, TokenIssuer.ClientIp(httpContext), "PasswordChange");
            await stateCache.InvalidateAsync(appUser.Id);

            return Results.Ok(new { Message = "Password changed successfully" });
        }).WithValidation<ChangePasswordDto>().RequireAuthorization(SecurityPolicies.Authenticated);
    }

    private static string? UserId(ClaimsPrincipal principal) =>
        principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
}
