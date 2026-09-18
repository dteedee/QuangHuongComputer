using System.Security.Claims;
using Identity.Infrastructure;
using Identity.DTOs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace Identity.Endpoints;

/// <summary>`/api/auth/me` - the signed-in user's own profile and addresses.</summary>
public static class UserProfileEndpoints
{
    public static void MapUserProfileEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/me", [Authorize] async (ClaimsPrincipal user, UserManager<ApplicationUser> userManager, IdentityDbContext dbContext) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var appUser = await userManager.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId);
            if (appUser == null) return Results.NotFound(new { Message = "User not found" });

            var roles = await userManager.GetRolesAsync(appUser);
            var profile = await dbContext.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            var defaultAddress = await dbContext.CustomerAddresses
                .FirstOrDefaultAsync(a => a.UserId == userId && a.IsDefault && a.IsActive);

            return Results.Ok(new
            {
                id = appUser.Id,
                email = appUser.Email,
                fullName = appUser.FullName,
                phoneNumber = appUser.PhoneNumber,
                avatarUrl = appUser.AvatarUrl,
                roles = roles.ToList(),
                lastLoginAt = appUser.LastLoginAt,
                emailVerified = appUser.EmailConfirmed,
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
                } : null,
                defaultAddress = defaultAddress != null ? new
                {
                    id = defaultAddress.Id,
                    recipientName = defaultAddress.RecipientName,
                    phoneNumber = defaultAddress.PhoneNumber,
                    addressLine = defaultAddress.AddressLine,
                    city = defaultAddress.City,
                    district = defaultAddress.District,
                    ward = defaultAddress.Ward
                } : null
            });
        });

        group.MapPut("/me", [Authorize] async (UpdateProfileDto model, ClaimsPrincipal user, UserManager<ApplicationUser> userManager, IdentityDbContext dbContext) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
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
        });

        group.MapPost("/me/change-password", [Authorize] async (ChangePasswordDto model, ClaimsPrincipal user, UserManager<ApplicationUser> userManager, Identity.Services.IRefreshTokenService refreshTokenService) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
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
            await userManager.UpdateAsync(appUser);

            // Same reasoning as a reset: other devices must re-authenticate.
            await refreshTokenService.RevokeAllUserTokensAsync(appUser.Id);

            return Results.Ok(new { Message = "Password changed successfully" });
        });

        group.MapGet("/me/addresses", [Authorize] async (ClaimsPrincipal user, IdentityDbContext dbContext) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var addresses = await dbContext.CustomerAddresses
                .Where(a => a.UserId == userId && a.IsActive)
                .OrderByDescending(a => a.IsDefault)
                .ThenByDescending(a => a.CreatedAt)
                .Select(a => new
                {
                    a.Id, a.RecipientName, a.PhoneNumber, a.AddressLine,
                    a.City, a.District, a.Ward, a.PostalCode, a.IsDefault, a.AddressLabel
                })
                .ToListAsync();

            return Results.Ok(addresses);
        });

        group.MapPost("/me/addresses", [Authorize] async (CustomerAddress model, ClaimsPrincipal user, IdentityDbContext dbContext) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            if (model.IsDefault) await ClearOtherDefaultsAsync(dbContext, userId, null);

            var address = new CustomerAddress
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                RecipientName = model.RecipientName,
                PhoneNumber = model.PhoneNumber,
                AddressLine = model.AddressLine,
                City = model.City,
                District = model.District,
                Ward = model.Ward,
                PostalCode = model.PostalCode,
                IsDefault = model.IsDefault,
                AddressLabel = model.AddressLabel,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            dbContext.CustomerAddresses.Add(address);
            await dbContext.SaveChangesAsync();

            return Results.Ok(new { Message = "Address added successfully", Id = address.Id });
        });

        group.MapPut("/me/addresses/{id:guid}", [Authorize] async (Guid id, CustomerAddress model, ClaimsPrincipal user, IdentityDbContext dbContext) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var address = await dbContext.CustomerAddresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
            if (address == null) return Results.NotFound(new { Message = "Address not found" });

            if (model.IsDefault && !address.IsDefault) await ClearOtherDefaultsAsync(dbContext, userId, id);

            address.RecipientName = model.RecipientName;
            address.PhoneNumber = model.PhoneNumber;
            address.AddressLine = model.AddressLine;
            address.City = model.City;
            address.District = model.District;
            address.Ward = model.Ward;
            address.PostalCode = model.PostalCode;
            address.IsDefault = model.IsDefault;
            address.AddressLabel = model.AddressLabel;
            address.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();
            return Results.Ok(new { Message = "Address updated successfully" });
        });

        group.MapDelete("/me/addresses/{id:guid}", [Authorize] async (Guid id, ClaimsPrincipal user, IdentityDbContext dbContext) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var address = await dbContext.CustomerAddresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
            if (address == null) return Results.NotFound(new { Message = "Address not found" });

            address.IsActive = false;
            await dbContext.SaveChangesAsync();
            return Results.Ok(new { Message = "Address deleted successfully" });
        });
    }

    /// <summary>Exactly one default address per user.</summary>
    private static async Task ClearOtherDefaultsAsync(IdentityDbContext dbContext, string userId, Guid? exceptId)
    {
        var existingDefaults = await dbContext.CustomerAddresses
            .Where(a => a.UserId == userId && a.IsDefault && (exceptId == null || a.Id != exceptId))
            .ToListAsync();
        foreach (var addr in existingDefaults) addr.IsDefault = false;
    }
}
