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

namespace Identity.Endpoints;

/// <summary>
/// `POST /api/auth/users/{id}/roles` - the single most dangerous write in the
/// module, so it lives on its own: it can escalate a caller to Admin, it can
/// strip the last Admin and lock everyone out, and a typo in a role name used to
/// leave the account with NO roles at all because the removal was committed
/// before the additions were validated. All three are guarded below.
/// </summary>
public static class UserRoleAssignmentEndpoint
{
    public static void MapUserRoleAssignmentEndpoint(this RouteGroupBuilder group)
    {
        group.MapPost("/users/{id}/roles", async (string id, AssignRolesDto model, UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager, IUserStateCache stateCache, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await UserAdminSupport.FindAnyAsync(userManager, id);
            if (user == null) return Results.NotFound(new { Error = UserAdminSupport.UserNotFound });

            var requested = (model?.Roles ?? Array.Empty<string>()).Where(r => !string.IsNullOrWhiteSpace(r)).Distinct().ToArray();
            var currentRoles = await userManager.GetRolesAsync(user);

            // Validate BEFORE removing anything. AddToRolesAsync throws on an
            // unknown role name, and the removal below has already been committed
            // by then - a single typo used to strip the account of every role.
            var unknown = new List<string>();
            foreach (var role in requested)
            {
                if (!await roleManager.RoleExistsAsync(role)) unknown.Add(role);
            }
            if (unknown.Count > 0)
                return Results.BadRequest(new { Error = $"Vai trò không tồn tại: {string.Join(", ", unknown)}" });

            // Escalation guard: only an Admin hands out Admin/Manager.
            var newlyPrivileged = SystemRoleGuard.PrivilegedRolesIn(requested)
                .Where(r => !currentRoles.Contains(r, StringComparer.OrdinalIgnoreCase))
                .ToList();
            if (newlyPrivileged.Count > 0 && !currentUser.IsInRole(Roles.Admin))
            {
                return Results.Json(new { Error = $"Chỉ Admin mới được cấp vai trò: {string.Join(", ", newlyPrivileged)}" },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            // Lockout guard: this account still holds Admin, the new set drops it,
            // and nobody else active holds it.
            var losesAdmin = currentRoles.Contains(Roles.Admin, StringComparer.OrdinalIgnoreCase) &&
                             !requested.Contains(Roles.Admin, StringComparer.OrdinalIgnoreCase);
            if (losesAdmin && await SystemRoleGuard.IsLastActiveAdminAsync(userManager, user.Id))
                return Results.Conflict(new { Error = UserAdminSupport.LastAdminError, UserId = user.Id });

            var result = await userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            result = await userManager.AddToRolesAsync(user, requested);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            // UserManager does NOT roll the stamp on a role change, so without
            // this the stripped role kept working until the access token expired.
            await UserAdminSupport.InvalidateTokensAsync(userManager, stateCache, user);

            await auditService.LogAsync(UserAdminSupport.PerformedBy(currentUser), "UpdateUserRoles", "ApplicationUser", user.Id,
                $"Updated roles from [{string.Join(", ", currentRoles)}] to [{string.Join(", ", requested)}]");

            return Results.Ok(new { Message = "Roles updated successfully", Roles = requested });
        }).WithValidation<AssignRolesDto>().RequireAuthorization(Permissions.Users.ManageRoles);
    }
}
