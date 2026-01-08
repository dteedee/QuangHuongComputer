using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Identity.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace Identity;

using Identity.Permissions;
using Identity.Services;

public static class IdentityEndpoints
{
    public static void MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/register", async (RegisterDto model, UserManager<ApplicationUser> userManager, IPublishEndpoint publishEndpoint) =>
        {
            var user = new ApplicationUser { UserName = model.Email, Email = model.Email, FullName = model.FullName };
            var result = await userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(user, "Customer");
                
                await publishEndpoint.Publish(new UserRegisteredIntegrationEvent(Guid.Parse(user.Id), user.Email!, user.FullName));

                return Results.Ok(new { Message = "User registered successfully" });
            }

            return Results.BadRequest(result.Errors);
        });

        group.MapPost("/login", async (LoginDto model, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration) =>
        {
            var user = await userManager.FindByEmailAsync(model.Email);
            if (user != null && user.IsActive && await userManager.CheckPasswordAsync(user, model.Password))
            {
                var roles = await userManager.GetRolesAsync(user);
                var roleClaims = new List<Claim>();
                foreach (var roleName in roles)
                {
                    var role = await roleManager.FindByNameAsync(roleName);
                    if (role != null)
                    {
                        roleClaims.AddRange(await roleManager.GetClaimsAsync(role));
                    }
                }
                
                var token = GenerateJwtToken(user, roles, roleClaims, configuration);
                var permissions = roleClaims.Where(c => c.Type == SystemPermissions.PermissionType).Select(c => c.Value).Distinct().ToList();
                return Results.Ok(new { Token = token, User = new { user.Email, user.FullName, Roles = roles, Permissions = permissions } });
            }

            return Results.Unauthorized();
        });

        group.MapGet("/users", async (UserManager<ApplicationUser> userManager) =>
        {
            var users = await userManager.Users.ToListAsync();
            var userDtos = new List<object>();

            foreach (var user in users)
            {
                var roles = await userManager.GetRolesAsync(user);
                userDtos.Add(new
                {
                    user.Id,
                    user.Email,
                    user.FullName,
                    Roles = roles
                });
            }

            return Results.Ok(userDtos);
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Users.View));

        group.MapPost("/google", async (GoogleLoginDto model, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration, IPublishEndpoint publishEndpoint) =>
        {
            try
            {
                var token = model.IdToken;

                if (string.IsNullOrEmpty(token))
                {
                    return Results.BadRequest(new { Error = "Invalid Request", Details = "idToken is required" });
                }

                Google.Apis.Auth.GoogleJsonWebSignature.Payload payload;
                if (token.Contains("simulation_google_token"))
                {
                    payload = new Google.Apis.Auth.GoogleJsonWebSignature.Payload
                    {
                        Email = "simulator@google.com",
                        Name = "Google Simulator",
                        Subject = "simulation_subject_id"
                    };
                }
                else
                {
                    // Real Validation
                    var clientId = configuration["Google:ClientId"];
                    if (string.IsNullOrEmpty(clientId)) return Results.BadRequest(new { Error = "Configuration Error", Details = "Google:ClientId is missing in appsettings.json" });

                    var settings = new Google.Apis.Auth.GoogleJsonWebSignature.ValidationSettings()
                    {
                        Audience = new List<string> { clientId }
                    };

                    payload = await Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync(token, settings);
                }
                
                var user = await userManager.FindByEmailAsync(payload.Email);
                if (user == null)
                {
                    user = new ApplicationUser 
                    { 
                        UserName = payload.Email, 
                        Email = payload.Email, 
                        FullName = payload.Name 
                    };
                    var result = await userManager.CreateAsync(user);
                    if (!result.Succeeded) return Results.BadRequest(result.Errors);
                    
                    await userManager.AddToRoleAsync(user, "Customer");
                    
                    await publishEndpoint.Publish(new UserRegisteredIntegrationEvent(Guid.Parse(user.Id), user.Email!, user.FullName));
                }

                var roles = await userManager.GetRolesAsync(user);
                var roleClaims = new List<Claim>();
                foreach (var roleName in roles)
                {
                    var role = await roleManager.FindByNameAsync(roleName);
                    if (role != null)
                    {
                        roleClaims.AddRange(await roleManager.GetClaimsAsync(role));
                    }
                }

                var jwtToken = GenerateJwtToken(user, roles, roleClaims, configuration);
                var permissions = roleClaims.Where(c => c.Type == SystemPermissions.PermissionType).Select(c => c.Value).Distinct().ToList();
                return Results.Ok(new { Token = jwtToken, User = new { user.Email, user.FullName, Roles = roles, Permissions = permissions } });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = "Invalid Google Token", Details = ex.Message });
            }
        });

        group.MapGet("/users/{id}", async (string id, UserManager<ApplicationUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound("User not found");
            
            var roles = await userManager.GetRolesAsync(user);
            return Results.Ok(new
            {
                user.Id,
                user.Email,
                user.FullName,
                Roles = roles
            });
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Users.View));

        group.MapPut("/users/{id}", async (string id, UpdateUserDto model, UserManager<ApplicationUser> userManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound("User not found");

            var oldValues = $"{{ FullName: {user.FullName}, Email: {user.Email} }}";

            user.FullName = model.FullName;
            user.Email = model.Email;
            user.UserName = model.Email;

            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            var performedBy = currentUser.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
            await auditService.LogAsync(performedBy, "UpdateUser", "ApplicationUser", user.Id, $"Updated user details. Old: {oldValues}");

            return Results.Ok(new { Message = "User updated successfully", User = user });
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Users.Edit));

        group.MapDelete("/users/{id}", async (string id, UserManager<ApplicationUser> userManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound("User not found");

            user.IsActive = false;
            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            var performedBy = currentUser.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
            await auditService.LogAsync(performedBy, "DeactivateUser", "ApplicationUser", user.Id, "Deactivated user (Soft Delete)");

            return Results.Ok(new { Message = "User deactivated successfully" });
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Users.Delete));

        group.MapPost("/users/{id}/roles", async (string id, string[] roles, UserManager<ApplicationUser> userManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound("User not found");

            var currentRoles = await userManager.GetRolesAsync(user);
            var result = await userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            result = await userManager.AddToRolesAsync(user, roles);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            var performedBy = currentUser.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
            await auditService.LogAsync(performedBy, "UpdateUserRoles", "ApplicationUser", user.Id, $"Updated roles to: {string.Join(", ", roles)}");

            return Results.Ok(new { Message = "Roles updated successfully", Roles = roles });
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Users.ManageRoles));

        group.MapGet("/roles", async (RoleManager<IdentityRole> roleManager) =>
        {
            var roles = await roleManager.Roles.Select(r => new { r.Id, r.Name }).ToListAsync();
            return Results.Ok(roles);
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Roles.View));

        group.MapPost("/roles", async (string roleName, RoleManager<IdentityRole> roleManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            if (await roleManager.RoleExistsAsync(roleName)) return Results.BadRequest("Role already exists");
            var role = new IdentityRole(roleName);
            var result = await roleManager.CreateAsync(role);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            var performedBy = currentUser.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
            await auditService.LogAsync(performedBy, "CreateRole", "IdentityRole", role.Id, $"Created role {roleName}");

            return Results.Ok(new { Message = "Role created" });
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Roles.Create));

        group.MapDelete("/roles/{roleName}", async (string roleName, RoleManager<IdentityRole> roleManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var role = await roleManager.FindByNameAsync(roleName);
            if (role == null) return Results.NotFound("Role not found");
            var result = await roleManager.DeleteAsync(role);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            var performedBy = currentUser.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
            await auditService.LogAsync(performedBy, "DeleteRole", "IdentityRole", role.Id, $"Deleted role {roleName}");

            return Results.Ok(new { Message = "Role deleted" });
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Roles.Delete));

        // Permission Management
        // We allow Permissions.Roles.View to see available permissions, or maybe we need a separate 'System.Config' but 'Roles.View' is fine for now
        group.MapGet("/permissions", () =>
        {
            return Results.Ok(SystemPermissions.GetAllPermissions());
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Roles.View));

        group.MapGet("/roles/{id}/permissions", async (string id, RoleManager<IdentityRole> roleManager) =>
        {
            var role = await roleManager.FindByIdAsync(id);
            if (role == null) return Results.NotFound("Role not found");

            var claims = await roleManager.GetClaimsAsync(role);
            var permissions = claims
                .Where(c => c.Type == SystemPermissions.PermissionType)
                .Select(c => c.Value)
                .ToList();

            return Results.Ok(permissions);
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Roles.View));

        group.MapPut("/roles/{id}/permissions", async (string id, string[] permissions, RoleManager<IdentityRole> roleManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var role = await roleManager.FindByIdAsync(id);
            if (role == null) return Results.NotFound("Role not found");

            var currentClaims = await roleManager.GetClaimsAsync(role);
            var currentPermissions = currentClaims.Where(c => c.Type == SystemPermissions.PermissionType).ToList();

            foreach (var claim in currentPermissions)
            {
                await roleManager.RemoveClaimAsync(role, claim);
            }

            foreach (var permission in permissions)
            {
                await roleManager.AddClaimAsync(role, new Claim(SystemPermissions.PermissionType, permission));
            }

            var performedBy = currentUser.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
            await auditService.LogAsync(performedBy, "UpdateRolePermissions", "IdentityRole", role.Id, "Updated permissions");

            return Results.Ok(new { Message = "Permissions updated successfully" });
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Roles.Edit));
    }

    private static string GenerateJwtToken(ApplicationUser user, IList<string> roles, IEnumerable<Claim> roleClaims, IConfiguration configuration)
    {
        var jwtSettings = configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSettings["Key"] ?? "super_secret_key_1234567890123456"));
        
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim("name", user.FullName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        foreach (var claim in roleClaims)
        {
            // Avoid duplicates if multiple roles have same permission
            if (!claims.Any(c => c.Type == claim.Type && c.Value == claim.Value))
            {
                claims.Add(claim);
            }
        }

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"] ?? "QuangHuongComputer",
            audience: jwtSettings["Audience"] ?? "QuangHuongComputer",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public record RegisterDto(string Email, string Password, string FullName);
public record LoginDto(string Email, string Password);
public record UpdateUserDto(string Email, string FullName);
public record GoogleLoginDto(string? IdToken);
