using Microsoft.AspNetCore.Identity;
using Identity.Infrastructure;
using BuildingBlocks.Security;

namespace Identity.Services;

/// <summary>
/// Guards the role/permission surface against the two failure modes that actually
/// happened on this system:
///   1. `DELETE /api/auth/roles/Admin` succeeded and wiped the only administrative
///      role (plus, by FK cascade, every AspNetUserRoles row pointing at it).
///   2. Nothing stopped the last remaining Admin from being deactivated or having
///      its Admin membership removed, which locks everyone out of the back office.
/// Both are now refused at the endpoint with 409 Conflict.
/// </summary>
public static class SystemRoleGuard
{
    /// <summary>
    /// Roles the application itself depends on. They are seeded by
    /// <see cref="IdentitySeeder"/> and may never be deleted or renamed, because
    /// endpoint authorization and the permission seed refer to them by name.
    /// </summary>
    public static readonly IReadOnlyList<string> SystemRoles = new[]
    {
        Roles.Admin,
        Roles.Manager,
        Roles.Sale,
        Roles.InventoryStaff,
        Roles.Accountant,
        Roles.HR,
        Roles.Marketing,
        Roles.TechnicianInShop,
        Roles.TechnicianOnSite,
        Roles.Customer,
        Roles.Supplier
    };

    private static readonly HashSet<string> SystemRoleSet =
        new(SystemRoles, StringComparer.OrdinalIgnoreCase);

    /// <summary>Roles that may only be granted by a caller who already holds Admin.</summary>
    private static readonly HashSet<string> PrivilegedRoles =
        new(new[] { Roles.Admin, Roles.Manager }, StringComparer.OrdinalIgnoreCase);

    public static bool IsSystemRole(string? roleName) =>
        !string.IsNullOrWhiteSpace(roleName) && SystemRoleSet.Contains(roleName);

    public static bool IsPrivilegedRole(string? roleName) =>
        !string.IsNullOrWhiteSpace(roleName) && PrivilegedRoles.Contains(roleName);

    /// <summary>
    /// Roles in <paramref name="requestedRoles"/> that only an Admin may grant.
    /// </summary>
    public static IReadOnlyList<string> PrivilegedRolesIn(IEnumerable<string>? requestedRoles) =>
        (requestedRoles ?? Array.Empty<string>()).Where(IsPrivilegedRole).Distinct().ToList();

    /// <summary>
    /// Ids of the ACTIVE users holding <see cref="Roles.Admin"/>.
    /// ApplicationUser carries a global `IsActive` query filter, so a deactivated
    /// account is not counted here - which is exactly the semantics we want:
    /// "the last account that can still log in and administer the system".
    /// </summary>
    public static async Task<IReadOnlyList<string>> GetActiveAdminIdsAsync(
        UserManager<ApplicationUser> userManager)
    {
        var admins = await userManager.GetUsersInRoleAsync(Roles.Admin);
        return admins.Select(u => u.Id).ToList();
    }

    /// <summary>
    /// True when <paramref name="userId"/> is the only active account still holding Admin.
    /// Removing its role, deactivating it or deleting it would leave the system unadministrable.
    /// </summary>
    public static async Task<bool> IsLastActiveAdminAsync(
        UserManager<ApplicationUser> userManager, string userId)
    {
        var adminIds = await GetActiveAdminIdsAsync(userManager);
        return adminIds.Count == 1 &&
               string.Equals(adminIds[0], userId, StringComparison.Ordinal);
    }
}
