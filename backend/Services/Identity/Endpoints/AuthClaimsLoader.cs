using System.Security.Claims;
using Identity.Infrastructure;
using Identity.Services;
using Identity.DTOs;
using Microsoft.AspNetCore.Identity;

namespace Identity.Endpoints;

/// <summary>
/// Shared by every path that issues a token (password login, Google login,
/// refresh). Each one used to carry its own copy of this loop.
/// </summary>
internal static class AuthClaimsLoader
{
    /// <summary>The user's roles plus every claim carried by those roles.</summary>
    public static async Task<(IList<string> Roles, List<Claim> RoleClaims)> LoadAsync(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ApplicationUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        var roleClaims = new List<Claim>();
        foreach (var roleName in roles)
        {
            var role = await roleManager.FindByNameAsync(roleName);
            if (role != null) roleClaims.AddRange(await roleManager.GetClaimsAsync(role));
        }
        return (roles, roleClaims);
    }

    public static UserInfoDto BuildUserInfo(ApplicationUser user, IList<string> roles, List<Claim> roleClaims) => new()
    {
        Id = user.Id,
        Email = user.Email ?? string.Empty,
        FullName = user.FullName,
        Roles = roles.ToList(),
        Permissions = JwtTokenFactory.ExtractPermissions(roleClaims)
    };
}
