using System.Security.Claims;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Identity;
using Perms = BuildingBlocks.Security.Permissions;

namespace Identity.Services;

/// <summary>
/// Áp <see cref="RolePermissionMatrix"/> vào claim của role — CHỈ THÊM, không bao giờ thu hồi.
///
/// Mỗi role mang một claim <see cref="RolePermissionMatrix.SeedVersionClaimType"/>. Lần chạy
/// sau chỉ cấp những quyền mới hơn phiên bản đã lưu, nên quyền admin gỡ tay KHÔNG bị
/// seeder cấp lại ở lần khởi động kế tiếp (lỗi cũ: seeder ghi đè mọi chỉnh sửa).
/// Muốn quay về mặc định thì gọi <see cref="ResetRoleToDefaultsAsync"/> một cách tường minh.
///
/// Lưu ý về DB cũ: DB chưa có claim phiên bản được coi là version 0, nên lần chạy đầu
/// sẽ cấp trọn ma trận một lần (kể cả quyền v1 từng bị gỡ tay trước đây) rồi đóng dấu v2.
/// Từ lần thứ hai trở đi mọi thao tác gỡ tay đều sống sót.
/// </summary>
public static class RolePermissionSeeder
{
    public static async Task SeedRolePermissionsAsync(RoleManager<IdentityRole> roleManager)
    {
        foreach (var roleName in RolePermissionMatrix.RoleNames())
        {
            var role = await roleManager.FindByNameAsync(roleName);
            if (role == null) continue;

            var claims = await roleManager.GetClaimsAsync(role);
            var storedVersion = ReadSeedVersion(claims);
            if (storedVersion >= RolePermissionMatrix.CurrentVersion && roleName != Roles.Admin)
            {
                continue;
            }

            // DB chưa từng đóng dấu phiên bản: dọn những quyền cấp nhầm ở bản seed cũ.
            if (storedVersion < RolePermissionMatrix.CurrentVersion &&
                RolePermissionMatrix.LegacyRevocations.TryGetValue(roleName, out var revoke))
            {
                await RemovePermissionsAsync(roleManager, role, claims, revoke);
                claims = await roleManager.GetClaimsAsync(role);
            }

            var toGrant = RolePermissionMatrix.GrantsSince(roleName, storedVersion);
            await AddPermissionsAsync(roleManager, role, claims, toGrant);
            await WriteSeedVersionAsync(roleManager, role, RolePermissionMatrix.CurrentVersion);
        }
    }

    /// <summary>
    /// Hành động quản trị tường minh: xoá sạch quyền hiện có của role rồi cấp lại đúng
    /// ma trận mặc định. Đây là cách DUY NHẤT để "khôi phục mặc định" — seeder không
    /// bao giờ tự làm việc này.
    /// </summary>
    public static async Task<bool> ResetRoleToDefaultsAsync(RoleManager<IdentityRole> roleManager, string roleName)
    {
        var role = await roleManager.FindByNameAsync(roleName);
        if (role == null) return false;

        var claims = await roleManager.GetClaimsAsync(role);
        var defaults = RolePermissionMatrix.For(roleName).ToHashSet(StringComparer.Ordinal);

        foreach (var claim in claims.Where(c => c.Type == Perms.PermissionType && !defaults.Contains(c.Value)))
        {
            await roleManager.RemoveClaimAsync(role, claim);
        }

        claims = await roleManager.GetClaimsAsync(role);
        await AddPermissionsAsync(roleManager, role, claims, defaults);
        await WriteSeedVersionAsync(roleManager, role, RolePermissionMatrix.CurrentVersion);
        return true;
    }

    private static int ReadSeedVersion(IEnumerable<Claim> claims)
    {
        var claim = claims.FirstOrDefault(c => c.Type == RolePermissionMatrix.SeedVersionClaimType);
        return claim != null && int.TryParse(claim.Value, out var version) ? version : 0;
    }

    private static async Task WriteSeedVersionAsync(RoleManager<IdentityRole> roleManager, IdentityRole role, int version)
    {
        var claims = await roleManager.GetClaimsAsync(role);
        foreach (var stale in claims.Where(c => c.Type == RolePermissionMatrix.SeedVersionClaimType))
        {
            if (stale.Value == version.ToString()) return;
            await roleManager.RemoveClaimAsync(role, stale);
        }

        await roleManager.AddClaimAsync(role,
            new Claim(RolePermissionMatrix.SeedVersionClaimType, version.ToString()));
    }

    private static async Task AddPermissionsAsync(
        RoleManager<IdentityRole> roleManager,
        IdentityRole role,
        IList<Claim> currentClaims,
        IEnumerable<string> permissions)
    {
        var existing = currentClaims
            .Where(c => c.Type == Perms.PermissionType)
            .Select(c => c.Value)
            .ToHashSet(StringComparer.Ordinal);

        foreach (var permission in permissions.Distinct(StringComparer.Ordinal))
        {
            if (existing.Add(permission))
            {
                await roleManager.AddClaimAsync(role, new Claim(Perms.PermissionType, permission));
            }
        }
    }

    private static async Task RemovePermissionsAsync(
        RoleManager<IdentityRole> roleManager,
        IdentityRole role,
        IList<Claim> currentClaims,
        IEnumerable<string> permissions)
    {
        foreach (var permission in permissions)
        {
            var claim = currentClaims.FirstOrDefault(c => c.Type == Perms.PermissionType && c.Value == permission);
            if (claim != null)
            {
                await roleManager.RemoveClaimAsync(role, claim);
            }
        }
    }
}
