using System.Security.Claims;
using Identity.DTOs;
using Identity.Infrastructure;
using Identity.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Identity.Endpoints;

/// <summary>
/// Shared guards and projections for the user-admin surface, so the list file and
/// the action file cannot drift apart on "may this account be disabled?".
/// </summary>
internal static class UserAdminSupport
{
    public const string LastAdminError =
        "Không thể gỡ quyền/vô hiệu hóa tài khoản Admin cuối cùng đang hoạt động. Hãy cấp quyền Admin cho một tài khoản khác trước.";

    public const string SelfDeactivateError = "Không thể tự vô hiệu hóa tài khoản của chính mình.";

    public const string UserNotFound = "Không tìm thấy tài khoản";

    /// <summary>
    /// Returns a 409 result when deactivating <paramref name="target"/> is not
    /// allowed (self-deactivation, or the last active Admin), otherwise null.
    /// </summary>
    public static async Task<IResult?> CheckDeactivationAllowedAsync(
        UserManager<ApplicationUser> userManager,
        ClaimsPrincipal currentUser,
        ApplicationUser target)
    {
        var callerId = PerformedBy(currentUser);
        if (!string.IsNullOrEmpty(callerId) && string.Equals(callerId, target.Id, StringComparison.Ordinal))
            return Results.Conflict(new { Error = SelfDeactivateError, UserId = target.Id });

        if (await SystemRoleGuard.IsLastActiveAdminAsync(userManager, target.Id))
            return Results.Conflict(new { Error = LastAdminError, UserId = target.Id });

        return null;
    }

    public static UserDto ToDto(ApplicationUser user, IEnumerable<string> roles) => new()
    {
        Id = user.Id,
        Email = user.Email ?? string.Empty,
        FullName = user.FullName,
        IsActive = user.IsActive,
        Roles = roles.ToList(),
        CreatedAt = user.CreatedAt
    };

    public static string PerformedBy(ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";

    /// <summary>
    /// Roles for a whole PAGE of users in one query.
    ///
    /// The list endpoint used to call <c>UserManager.GetRolesAsync</c> inside the
    /// loop - one round trip per row - and then dropped rows that did not match
    /// the requested role AFTER paging, so `?role=Sale&amp;page=1` returned a
    /// handful of users next to a total that counted everybody.
    /// </summary>
    public static async Task<Dictionary<string, List<string>>> LoadRolesForPageAsync(
        IdentityDbContext db, IReadOnlyCollection<string> userIds)
    {
        if (userIds.Count == 0) return new Dictionary<string, List<string>>();

        var pairs = await (from ur in db.UserRoles
                           join r in db.Roles on ur.RoleId equals r.Id
                           where userIds.Contains(ur.UserId)
                           select new { ur.UserId, RoleName = r.Name })
            .AsNoTracking()
            .ToListAsync();

        return pairs
            .GroupBy(p => p.UserId)
            .ToDictionary(g => g.Key, g => g.Select(p => p.RoleName ?? string.Empty).Where(n => n.Length > 0).ToList());
    }

    /// <summary>
    /// A user must be findable even when deactivated. <c>ApplicationUser</c>
    /// carries a global <c>IsActive</c> query filter, so <c>FindByIdAsync</c>
    /// cannot see the very rows an admin needs to re-activate or inspect.
    /// </summary>
    public static Task<ApplicationUser?> FindAnyAsync(UserManager<ApplicationUser> userManager, string id) =>
        userManager.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == id);

    /// <summary>
    /// Makes an authorization change bite immediately: roll the security stamp
    /// (every access token already issued stops validating) and drop the cached
    /// user state (so the next request re-reads the database instead of waiting
    /// out the 60s TTL).
    /// </summary>
    public static async Task InvalidateTokensAsync(
        UserManager<ApplicationUser> userManager, IUserStateCache stateCache, ApplicationUser user)
    {
        await userManager.UpdateSecurityStampAsync(user);
        await stateCache.InvalidateAsync(user.Id);
    }
}
