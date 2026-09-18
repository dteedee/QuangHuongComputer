using System.Security.Claims;
using Identity.Infrastructure;
using Identity.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;

namespace Identity.Endpoints;

/// <summary>
/// Role and permission administration.
///
/// This is the surface that lost the owner his `Admin` role: `DELETE
/// /api/auth/roles/Admin` had no guard whatsoever, succeeded, and cascaded the
/// AspNetUserRoles rows with it. Every destructive path here now refuses a
/// system role and refuses any role that still has members.
/// </summary>
public static class RoleAdminEndpoints
{
    public static void MapRoleAdminEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/roles", async (RoleManager<IdentityRole> roleManager) =>
        {
            var roles = await roleManager.Roles.Select(r => new { r.Id, r.Name }).ToListAsync();
            return Results.Ok(roles);
        }).RequireAuthorization(Permissions.Roles.View);

        // Was `(string roleName, ...)`, which minimal APIs bind from the QUERY
        // STRING - so every JSON call from the admin UI 400'd. Now a real body.
        group.MapPost("/roles", async (CreateRoleDto model, RoleManager<IdentityRole> roleManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var name = (model?.Name ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(name))
                return Results.BadRequest(new { Error = "Tên vai trò không được để trống" });
            if (name.Length > 64)
                return Results.BadRequest(new { Error = "Tên vai trò tối đa 64 ký tự" });
            if (!name.All(c => char.IsLetterOrDigit(c) || c == '.' || c == '_' || c == '-'))
                return Results.BadRequest(new { Error = "Tên vai trò chỉ được chứa chữ, số và . _ -" });

            if (await roleManager.RoleExistsAsync(name))
                return Results.Conflict(new { Error = "Vai trò đã tồn tại" });

            var role = new IdentityRole(name);
            var result = await roleManager.CreateAsync(role);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            await auditService.LogAsync(PerformedBy(currentUser), "CreateRole", "IdentityRole", role.Id, $"Created role {name}");
            return Results.Ok(new { Message = "Role created", role.Id, role.Name });
        }).WithValidation<CreateRoleDto>().RequireAuthorization(Permissions.Roles.Create);

        group.MapDelete("/roles/{roleName}", async (string roleName, RoleManager<IdentityRole> roleManager, UserManager<ApplicationUser> userManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var role = await roleManager.FindByNameAsync(roleName);
            if (role == null) return Results.NotFound(new { Error = "Không tìm thấy vai trò" });

            // Guard 1 - the incident guard. A seeded role is part of the
            // application's authorization model, not user data.
            if (SystemRoleGuard.IsSystemRole(role.Name))
            {
                await auditService.LogAsync(PerformedBy(currentUser), "DeleteRoleRefused", "IdentityRole", role.Id,
                    $"Refused delete of system role {role.Name}");
                return Results.Conflict(new
                {
                    Error = $"Không thể xóa vai trò hệ thống '{role.Name}'.",
                    RoleName = role.Name,
                    IsSystemRole = true
                });
            }

            // Guard 2 - deleting a role cascades AspNetUserRoles and silently
            // strips every member of their access.
            var members = await userManager.GetUsersInRoleAsync(role.Name!);
            if (members.Count > 0)
            {
                return Results.Conflict(new
                {
                    Error = $"Vai trò '{role.Name}' đang được gán cho {members.Count} tài khoản. Gỡ vai trò khỏi các tài khoản này trước.",
                    RoleName = role.Name,
                    AssignedUserCount = members.Count
                });
            }

            var result = await roleManager.DeleteAsync(role);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            await auditService.LogAsync(PerformedBy(currentUser), "DeleteRole", "IdentityRole", role.Id, $"Deleted role {roleName}");
            return Results.Ok(new { Message = "Role deleted" });
        }).RequireAuthorization(Permissions.Roles.Delete);

        group.MapPut("/roles/{id}", async (string id, UpdateRoleDto model, RoleManager<IdentityRole> roleManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var role = await roleManager.FindByIdAsync(id);
            if (role == null) return Results.NotFound(new { Error = "Không tìm thấy vai trò" });

            // Renaming a system role is as destructive as deleting it: every
            // `[Authorize(Roles = "Admin")]` and the permission seed match by name.
            if (SystemRoleGuard.IsSystemRole(role.Name))
            {
                return Results.Conflict(new
                {
                    Error = $"Không thể đổi tên vai trò hệ thống '{role.Name}'.",
                    RoleName = role.Name,
                    IsSystemRole = true
                });
            }

            var newName = (model?.Name ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(newName))
                return Results.BadRequest(new { Error = "Tên vai trò không được để trống" });

            // Escalation guard: renaming a custom role INTO a system name would
            // hand its members the seeded permissions of that name.
            if (SystemRoleGuard.IsSystemRole(newName))
            {
                return Results.Conflict(new { Error = $"Không thể đổi tên thành vai trò hệ thống '{newName}'." });
            }

            var clash = await roleManager.FindByNameAsync(newName);
            if (clash != null && clash.Id != role.Id)
                return Results.Conflict(new { Error = "Vai trò đã tồn tại" });

            var oldName = role.Name;
            role.Name = newName;
            var result = await roleManager.UpdateAsync(role);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            await auditService.LogAsync(PerformedBy(currentUser), "UpdateRole", "IdentityRole", role.Id, $"Renamed role {oldName} to {newName}");
            return Results.Ok(new { Message = "Role updated", role.Id, role.Name });
        }).WithValidation<UpdateRoleDto>().RequireAuthorization(Permissions.Roles.Edit);

        group.MapGet("/permissions", () => Results.Ok(Permissions.GetAllPermissions()))
            .RequireAuthorization(Permissions.Roles.View);

        group.MapGet("/permissions/registry", () =>
        {
            var grouped = PermissionRegistry.GetGroupedByModule();
            var result = grouped.Select(g => new
            {
                module = g.Key,
                permissions = g.Value.Select(p => new
                {
                    key = p.Key,
                    displayName = p.DisplayName,
                    description = p.Description,
                    type = p.Type.ToString(),
                    dependsOn = p.DependsOn
                })
            });
            return Results.Ok(result);
        }).RequireAuthorization(SecurityPolicies.Authenticated);

        group.MapGet("/roles/{id}/permissions", async (string id, RoleManager<IdentityRole> roleManager) =>
        {
            var role = await roleManager.FindByIdAsync(id);
            if (role == null) return Results.NotFound(new { Error = "Không tìm thấy vai trò" });

            var claims = await roleManager.GetClaimsAsync(role);
            return Results.Ok(claims
                .Where(c => c.Type == Permissions.PermissionType)
                .Select(c => c.Value)
                .ToList());
        }).RequireAuthorization(Permissions.Roles.View);

        // `string[] permissions` WITHOUT [FromBody] is bound from the QUERY STRING
        // by minimal APIs (arrays of simple types bind from query since .NET 7),
        // exactly like the `string roleName` bug on POST /roles. The admin UI PUTs
        // a JSON array body (frontend/src/api/admin.ts:169), so the parameter
        // arrived EMPTY and this handler then stripped every permission from the
        // role it was asked to update. [FromBody] is what makes it read the body.
        group.MapPut("/roles/{id}/permissions", async (string id, [Microsoft.AspNetCore.Mvc.FromBody] string[] permissions, RoleManager<IdentityRole> roleManager, UserManager<ApplicationUser> userManager, IUserStateCache stateCache, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var role = await roleManager.FindByIdAsync(id);
            if (role == null) return Results.NotFound(new { Error = "Không tìm thấy vai trò" });

            var validated = PermissionRegistry.ValidatePermissions((permissions ?? Array.Empty<string>()).ToList());

            // Emptying Admin's permission set is the same lockout as deleting the
            // role - the caller would remove their own ability to put it back.
            if (string.Equals(role.Name, Roles.Admin, StringComparison.OrdinalIgnoreCase) &&
                !validated.Contains(Permissions.Roles.Edit))
            {
                return Results.Conflict(new
                {
                    Error = "Vai trò Admin phải giữ quyền quản trị vai trò (Permissions.Roles.Edit)."
                });
            }

            var currentClaims = await roleManager.GetClaimsAsync(role);
            foreach (var claim in currentClaims.Where(c => c.Type == Permissions.PermissionType))
            {
                await roleManager.RemoveClaimAsync(role, claim);
            }
            foreach (var permission in validated)
            {
                await roleManager.AddClaimAsync(role, new Claim(Permissions.PermissionType, permission));
            }

            // Permissions ride in the access token as claims, so every member of
            // this role is still carrying the OLD set. Rolling their security
            // stamp makes those tokens invalid on the next request instead of
            // leaving a revoked permission usable for the token's lifetime.
            var members = await userManager.GetUsersInRoleAsync(role.Name!);
            foreach (var member in members)
            {
                await userManager.UpdateSecurityStampAsync(member);
                await stateCache.InvalidateAsync(member.Id);
            }

            await auditService.LogAsync(PerformedBy(currentUser), "UpdateRolePermissions", "IdentityRole", role.Id,
                $"Updated permissions for {role.Name} ({validated.Count} granted, {members.Count} phiên bị làm mới)");
            return Results.Ok(new { Message = "Permissions updated successfully", MembersInvalidated = members.Count });
        }).RequireAuthorization(Permissions.Roles.Edit);
    }

    private static string PerformedBy(ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
}
