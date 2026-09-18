using System.Security.Claims;
using Identity.Infrastructure;
using Identity.Services;
using Identity.DTOs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using BuildingBlocks.Repository;
using BuildingBlocks.Security;

namespace Identity.Endpoints;

/// <summary>
/// User administration. Every path that can take access away from an account is
/// guarded against the two lockout scenarios: removing the last active Admin and
/// an administrator deactivating themselves.
/// </summary>
public static class UserAdminEndpoints
{
    private const string LastAdminError =
        "Không thể gỡ quyền/vô hiệu hóa tài khoản Admin cuối cùng đang hoạt động. Hãy cấp quyền Admin cho một tài khoản khác trước.";

    private const string SelfDeactivateError =
        "Không thể tự vô hiệu hóa tài khoản của chính mình.";

    public static void MapUserAdminEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/users", async (UserManager<ApplicationUser> userManager, [AsParameters] UserQueryParams queryParams) =>
        {
            var query = userManager.Users.AsQueryable();
            if (!queryParams.ShowInactive) query = query.Where(u => u.IsActive);

            if (!string.IsNullOrWhiteSpace(queryParams.SearchText))
            {
                var searchTerm = queryParams.SearchText.ToLower();
                query = query.Where(u =>
                    u.Email!.ToLower().Contains(searchTerm) ||
                    u.FullName.ToLower().Contains(searchTerm));
            }

            var total = await query.CountAsync();

            query = queryParams.SortBy?.ToLower() switch
            {
                "email" => queryParams.SortDesc ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
                "fullname" => queryParams.SortDesc ? query.OrderByDescending(u => u.FullName) : query.OrderBy(u => u.FullName),
                "createdat" => queryParams.SortDesc ? query.OrderByDescending(u => u.Id) : query.OrderBy(u => u.Id),
                _ => query.OrderBy(u => u.Email)
            };

            var users = await query.Skip(queryParams.Skip).Take(queryParams.Take).ToListAsync();

            var userDtos = new List<UserDto>();
            foreach (var user in users)
            {
                var roles = await userManager.GetRolesAsync(user);
                if (!string.IsNullOrWhiteSpace(queryParams.Role) && !roles.Contains(queryParams.Role)) continue;
                userDtos.Add(ToDto(user, roles));
            }

            return Results.Ok(new PagedResult<UserDto>
            {
                Items = userDtos,
                Total = total,
                Page = queryParams.PageNumber,
                PageSize = queryParams.PageSize
            });
        }).RequireAuthorization(p => p.RequireClaim(Permissions.PermissionType, Permissions.Users.View));

        group.MapPost("/users", async (CreateUserDto model, UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            if (await userManager.FindByEmailAsync(model.Email) != null)
                return Results.BadRequest(new { Error = "Email đã tồn tại" });

            // Privilege-escalation guard: a caller with Users.Create but without
            // Admin must not be able to mint an Admin/Manager account.
            var privileged = SystemRoleGuard.PrivilegedRolesIn(model.Roles);
            if (privileged.Count > 0 && !currentUser.IsInRole(Roles.Admin))
            {
                return Results.Json(new
                {
                    Error = $"Chỉ Admin mới được cấp vai trò: {string.Join(", ", privileged)}"
                }, statusCode: StatusCodes.Status403Forbidden);
            }

            var user = new ApplicationUser { Email = model.Email, UserName = model.Email, FullName = model.FullName, IsActive = true, EmailConfirmed = true };
            var result = await userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            var assignedRoles = new List<string>();
            if (model.Roles?.Length > 0)
            {
                foreach (var role in model.Roles)
                {
                    if (await roleManager.RoleExistsAsync(role)) assignedRoles.Add(role);
                }
                if (assignedRoles.Count > 0) await userManager.AddToRolesAsync(user, assignedRoles);
            }

            await auditService.LogAsync(PerformedBy(currentUser), "CreateUser", "ApplicationUser", user.Id,
                $"Created user {user.Email} with roles: {string.Join(", ", assignedRoles)}");

            return Results.Created($"/api/auth/users/{user.Id}", ToDto(user, assignedRoles));
        }).RequireAuthorization(p => p.RequireClaim(Permissions.PermissionType, Permissions.Users.Create));

        group.MapGet("/users/{id}", async (string id, UserManager<ApplicationUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound(new { Error = "Không tìm thấy tài khoản" });
            return Results.Ok(ToDto(user, await userManager.GetRolesAsync(user)));
        }).RequireAuthorization(p => p.RequireClaim(Permissions.PermissionType, Permissions.Users.View));

        group.MapPut("/users/{id}", async (string id, UpdateUserDto model, UserManager<ApplicationUser> userManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound(new { Error = "Không tìm thấy tài khoản" });

            var oldValues = $"{{ FullName: {user.FullName}, Email: {user.Email} }}";

            user.FullName = model.FullName;
            user.Email = model.Email;
            user.UserName = model.Email;

            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            await auditService.LogAsync(PerformedBy(currentUser), "UpdateUser", "ApplicationUser", user.Id, $"Updated user details. Old: {oldValues}");

            // Was `User = user` - the raw entity, which serialises PasswordHash
            // and SecurityStamp straight into the HTTP response.
            return Results.Ok(new { Message = "User updated successfully", User = ToDto(user, await userManager.GetRolesAsync(user)) });
        }).RequireAuthorization(p => p.RequireClaim(Permissions.PermissionType, Permissions.Users.Edit));

        // Soft delete (deactivate).
        group.MapDelete("/users/{id}", async (string id, UserManager<ApplicationUser> userManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound(new { Error = "Không tìm thấy tài khoản" });

            var blocked = await CheckDeactivationAllowedAsync(userManager, currentUser, user);
            if (blocked != null) return blocked;

            user.IsActive = false;
            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            await auditService.LogAsync(PerformedBy(currentUser), "DeactivateUser", "ApplicationUser", user.Id, "Deactivated user (Soft Delete)");
            return Results.Ok(new { Message = "User deactivated successfully", IsActive = false });
        }).RequireAuthorization(p => p.RequireClaim(Permissions.PermissionType, Permissions.Users.Delete));

        group.MapPost("/users/{id}/activate", async (string id, UserManager<ApplicationUser> userManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            // A deactivated user is hidden by the global IsActive query filter,
            // so FindByIdAsync cannot see the very account we are re-activating.
            var user = await userManager.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return Results.NotFound(new { Error = "Không tìm thấy tài khoản" });

            user.IsActive = true;
            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            await auditService.LogAsync(PerformedBy(currentUser), "ActivateUser", "ApplicationUser", user.Id, "Activated user");
            return Results.Ok(new { Message = "User activated successfully", IsActive = true });
        }).RequireAuthorization(p => p.RequireClaim(Permissions.PermissionType, Permissions.Users.Edit));

        group.MapPost("/users/{id}/toggle-status", async (string id, UserManager<ApplicationUser> userManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await userManager.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return Results.NotFound(new { Error = "Không tìm thấy tài khoản" });

            if (user.IsActive)
            {
                var blocked = await CheckDeactivationAllowedAsync(userManager, currentUser, user);
                if (blocked != null) return blocked;
            }

            user.IsActive = !user.IsActive;
            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            await auditService.LogAsync(PerformedBy(currentUser), user.IsActive ? "ActivateUser" : "DeactivateUser", "ApplicationUser", user.Id,
                user.IsActive ? "Activated user" : "Deactivated user");
            return Results.Ok(new { Message = user.IsActive ? "User activated" : "User deactivated", IsActive = user.IsActive });
        }).RequireAuthorization(p => p.RequireClaim(Permissions.PermissionType, Permissions.Users.Edit));

        group.MapPost("/users/{id}/roles", async (string id, AssignRolesDto model, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound(new { Error = "Không tìm thấy tài khoản" });

            var requested = (model?.Roles ?? Array.Empty<string>()).Where(r => !string.IsNullOrWhiteSpace(r)).Distinct().ToArray();
            var currentRoles = await userManager.GetRolesAsync(user);

            // Validate BEFORE removing anything. AddToRolesAsync throws on an
            // unknown role name, and the removal below has already been committed
            // by then - a single typo used to strip the account of every role and
            // return a 500. Fail the whole call up front instead.
            var unknown = new List<string>();
            foreach (var role in requested)
            {
                if (!await roleManager.RoleExistsAsync(role)) unknown.Add(role);
            }
            if (unknown.Count > 0)
            {
                return Results.BadRequest(new { Error = $"Vai trò không tồn tại: {string.Join(", ", unknown)}" });
            }

            // Escalation guard: only an Admin hands out Admin/Manager.
            var newlyPrivileged = SystemRoleGuard
                .PrivilegedRolesIn(requested)
                .Where(r => !currentRoles.Contains(r, StringComparer.OrdinalIgnoreCase))
                .ToList();
            if (newlyPrivileged.Count > 0 && !currentUser.IsInRole(Roles.Admin))
            {
                return Results.Json(new
                {
                    Error = $"Chỉ Admin mới được cấp vai trò: {string.Join(", ", newlyPrivileged)}"
                }, statusCode: StatusCodes.Status403Forbidden);
            }

            // Lockout guard: this account still holds Admin, the new set drops it,
            // and nobody else active holds it.
            var losesAdmin = currentRoles.Contains(Roles.Admin, StringComparer.OrdinalIgnoreCase) &&
                             !requested.Contains(Roles.Admin, StringComparer.OrdinalIgnoreCase);
            if (losesAdmin && await SystemRoleGuard.IsLastActiveAdminAsync(userManager, user.Id))
            {
                return Results.Conflict(new { Error = LastAdminError, UserId = user.Id });
            }

            var result = await userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            result = await userManager.AddToRolesAsync(user, requested);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            await auditService.LogAsync(PerformedBy(currentUser), "UpdateUserRoles", "ApplicationUser", user.Id,
                $"Updated roles from [{string.Join(", ", currentRoles)}] to [{string.Join(", ", requested)}]");

            return Results.Ok(new { Message = "Roles updated successfully", Roles = requested });
        }).RequireAuthorization(p => p.RequireClaim(Permissions.PermissionType, Permissions.Users.ManageRoles));
    }

    /// <summary>
    /// Returns a 409 result when deactivating <paramref name="target"/> is not
    /// allowed (self-deactivation, or the last active Admin), otherwise null.
    /// </summary>
    private static async Task<IResult?> CheckDeactivationAllowedAsync(
        UserManager<ApplicationUser> userManager,
        ClaimsPrincipal currentUser,
        ApplicationUser target)
    {
        var callerId = currentUser.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrEmpty(callerId) && string.Equals(callerId, target.Id, StringComparison.Ordinal))
        {
            return Results.Conflict(new { Error = SelfDeactivateError, UserId = target.Id });
        }

        if (await SystemRoleGuard.IsLastActiveAdminAsync(userManager, target.Id))
        {
            return Results.Conflict(new { Error = LastAdminError, UserId = target.Id });
        }

        return null;
    }

    private static UserDto ToDto(ApplicationUser user, IEnumerable<string> roles) => new()
    {
        Id = user.Id,
        Email = user.Email ?? string.Empty,
        FullName = user.FullName,
        IsActive = user.IsActive,
        Roles = roles.ToList(),
        // ApplicationUser has no CreatedAt column yet (added by W1-2).
        CreatedAt = default
    };

    private static string PerformedBy(ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
}
