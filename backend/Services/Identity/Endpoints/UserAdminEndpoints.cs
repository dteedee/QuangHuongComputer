using System.Security.Claims;
using BuildingBlocks.Repository;
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
/// User administration: listing and CRUD. The state-changing actions
/// (activate / deactivate / roles / reset-password / revoke-sessions) live in
/// <see cref="UserAdminActionEndpoints"/>; the shared guards in
/// <see cref="UserAdminSupport"/>.
/// </summary>
public static class UserAdminEndpoints
{
    public static void MapUserAdminEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/users", async (UserManager<ApplicationUser> userManager, IdentityDbContext db,
            [AsParameters] UserQueryParams queryParams) =>
        {
            // IgnoreQueryFilters first: the global IsActive filter on
            // ApplicationUser meant `includeInactive=true` could never show a
            // single deactivated account, because they were filtered out of the
            // source query before the flag was ever looked at.
            var query = userManager.Users.IgnoreQueryFilters().AsQueryable();
            if (!queryParams.ShowInactive) query = query.Where(u => u.IsActive);

            if (!string.IsNullOrWhiteSpace(queryParams.SearchText))
            {
                var searchTerm = queryParams.SearchText.ToLower();
                query = query.Where(u =>
                    u.Email!.ToLower().Contains(searchTerm) ||
                    u.FullName.ToLower().Contains(searchTerm));
            }

            // Role filter BEFORE paging and before the count. It used to run on
            // the already-paged list, so `?role=Sale` returned "3 of 412 users"
            // where 412 counted every role - the total was simply wrong.
            if (!string.IsNullOrWhiteSpace(queryParams.Role))
            {
                var roleId = await db.Roles
                    .Where(r => r.Name == queryParams.Role)
                    .Select(r => r.Id)
                    .FirstOrDefaultAsync();

                if (roleId == null)
                {
                    return Results.Ok(new PagedResult<UserDto>
                    {
                        Items = new List<UserDto>(),
                        Total = 0,
                        Page = queryParams.PageNumber,
                        PageSize = queryParams.PageSize
                    });
                }

                query = query.Where(u => db.UserRoles.Any(ur => ur.UserId == u.Id && ur.RoleId == roleId));
            }

            var total = await query.CountAsync();

            query = queryParams.SortBy?.ToLower() switch
            {
                "email" => queryParams.SortDesc ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
                "fullname" => queryParams.SortDesc ? query.OrderByDescending(u => u.FullName) : query.OrderBy(u => u.FullName),
                // Sorts by the real column now. It used to sort by Id - a random
                // GUID - while claiming to sort by creation date.
                "createdat" => queryParams.SortDesc ? query.OrderByDescending(u => u.CreatedAt) : query.OrderBy(u => u.CreatedAt),
                _ => query.OrderBy(u => u.Email)
            };

            var users = await query.Skip(queryParams.Skip).Take(queryParams.Take).AsNoTracking().ToListAsync();
            var roleMap = await UserAdminSupport.LoadRolesForPageAsync(db, users.Select(u => u.Id).ToList());

            return Results.Ok(new PagedResult<UserDto>
            {
                Items = users
                    .Select(u => UserAdminSupport.ToDto(u, roleMap.TryGetValue(u.Id, out var r) ? r : new List<string>()))
                    .ToList(),
                Total = total,
                Page = queryParams.PageNumber,
                PageSize = queryParams.PageSize
            });
        }).RequireAuthorization(Permissions.Users.View);

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
                return Results.Json(new { Error = $"Chỉ Admin mới được cấp vai trò: {string.Join(", ", privileged)}" },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            var user = new ApplicationUser
            {
                Email = model.Email,
                UserName = model.Email,
                FullName = model.FullName,
                IsActive = true,
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow
            };
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

            await auditService.LogAsync(UserAdminSupport.PerformedBy(currentUser), "CreateUser", "ApplicationUser", user.Id,
                $"Created user {user.Email} with roles: {string.Join(", ", assignedRoles)}");

            return Results.Created($"/api/auth/users/{user.Id}", UserAdminSupport.ToDto(user, assignedRoles));
        }).WithValidation<CreateUserDto>().RequireAuthorization(Permissions.Users.Create);

        group.MapGet("/users/{id}", async (string id, UserManager<ApplicationUser> userManager, IdentityDbContext db) =>
        {
            var user = await UserAdminSupport.FindAnyAsync(userManager, id);
            if (user == null) return Results.NotFound(new { Error = UserAdminSupport.UserNotFound });

            var roleMap = await UserAdminSupport.LoadRolesForPageAsync(db, new[] { user.Id });
            return Results.Ok(UserAdminSupport.ToDto(user, roleMap.TryGetValue(user.Id, out var r) ? r : new List<string>()));
        }).RequireAuthorization(Permissions.Users.View);

        group.MapPut("/users/{id}", async (string id, UpdateUserDto model, UserManager<ApplicationUser> userManager,
            IdentityDbContext db, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await UserAdminSupport.FindAnyAsync(userManager, id);
            if (user == null) return Results.NotFound(new { Error = UserAdminSupport.UserNotFound });

            var oldValues = $"{{ FullName: {user.FullName}, Email: {user.Email} }}";

            user.FullName = model.FullName;
            user.Email = model.Email;
            user.UserName = model.Email;

            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            await auditService.LogAsync(UserAdminSupport.PerformedBy(currentUser), "UpdateUser", "ApplicationUser", user.Id,
                $"Updated user details. Old: {oldValues}");

            // Was `User = user` - the raw entity, which serialises PasswordHash
            // and SecurityStamp straight into the HTTP response.
            var roleMap = await UserAdminSupport.LoadRolesForPageAsync(db, new[] { user.Id });
            return Results.Ok(new
            {
                Message = "User updated successfully",
                User = UserAdminSupport.ToDto(user, roleMap.TryGetValue(user.Id, out var r) ? r : new List<string>())
            });
        }).WithValidation<UpdateUserDto>().RequireAuthorization(Permissions.Users.Edit);

        // Soft delete (deactivate).
        group.MapDelete("/users/{id}", async (string id, UserManager<ApplicationUser> userManager,
            IRefreshTokenService refreshTokens, IUserStateCache stateCache,
            IAuditService auditService, ClaimsPrincipal currentUser, HttpContext httpContext) =>
                await UserAdminActionEndpoints.DeactivateAsync(id, userManager, refreshTokens, stateCache, auditService, currentUser, httpContext))
            .RequireAuthorization(Permissions.Users.Delete);
    }
}
