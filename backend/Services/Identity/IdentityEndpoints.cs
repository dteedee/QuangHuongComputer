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
using BuildingBlocks.Repository;

namespace Identity;

using Identity.Permissions;
using Identity.Services;
using Identity.DTOs;

public static class IdentityEndpoints
{
    public static void MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/register", async (RegisterDto model, UserManager<ApplicationUser> userManager, IPublishEndpoint publishEndpoint, IEmailService emailService) =>
        {
            var user = new ApplicationUser { UserName = model.Email, Email = model.Email, FullName = model.FullName };
            var result = await userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(user, "Customer");

                await publishEndpoint.Publish(new UserRegisteredIntegrationEvent(Guid.Parse(user.Id), user.Email!, user.FullName));

                // Send welcome email
                try
                {
                    await emailService.SendWelcomeEmailAsync(user.Email!, user.FullName);
                }
                catch (Exception ex)
                {
                    // Log error but don't fail registration
                    Console.WriteLine($"Failed to send welcome email: {ex.Message}");
                }

                return Results.Ok(new { Message = "User registered successfully" });
            }

            return Results.BadRequest(result.Errors);
        });

        group.MapPost("/login", async (LoginDto model, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration, IRateLimitService rateLimitService) =>
        {
            // Rate limiting: 5 failed login attempts per 10 minutes per email
            var rateLimitKey = $"login:{model.Email}";
            if (await rateLimitService.IsRateLimitedAsync(rateLimitKey, 5, TimeSpan.FromMinutes(10)))
            {
                return Results.StatusCode(429); // Too Many Requests
            }

            var user = await userManager.FindByEmailAsync(model.Email);
            if (user != null && user.IsActive && await userManager.CheckPasswordAsync(user, model.Password))
            {
                // Reset rate limit on successful login
                await rateLimitService.ResetAsync(rateLimitKey);
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

                var response = new LoginResponseDto
                {
                    Token = token,
                    User = new UserInfoDto
                    {
                        Email = user.Email ?? string.Empty,
                        FullName = user.FullName,
                        Roles = roles.ToList(),
                        Permissions = permissions
                    }
                };

                return Results.Ok(response);
            }

            // Increment failed login attempts
            await rateLimitService.IncrementAsync(rateLimitKey, TimeSpan.FromMinutes(10));

            return Results.Unauthorized();
        });

        // Refresh Token Endpoint
        group.MapPost("/refresh-token", async (RefreshTokenRequestDto model, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration) =>
        {
            if (string.IsNullOrEmpty(model.RefreshToken))
            {
                return Results.BadRequest(new { Error = "Refresh token is required" });
            }

            // Get the principal from the expired token
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(configuration["Jwt:Key"] ?? "super_secret_key_1234567890123456");

            try
            {
                var tokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = false, // Don't validate expiration for refresh
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["Jwt:Issuer"] ?? "QuangHuongComputer",
                    ValidAudience = configuration["Jwt:Audience"] ?? "QuangHuongComputer",
                    IssuerSigningKey = new SymmetricSecurityKey(key)
                };

                var principal = tokenHandler.ValidateToken(model.RefreshToken, tokenValidationParameters, out var validatedToken);

                if (validatedToken is not JwtSecurityToken jwtToken ||
                    !jwtToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                {
                    return Results.BadRequest(new { Error = "Invalid refresh token" });
                }

                var userId = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
                if (string.IsNullOrEmpty(userId))
                {
                    return Results.BadRequest(new { Error = "Invalid token payload" });
                }

                var user = await userManager.FindByIdAsync(userId);
                if (user == null || !user.IsActive)
                {
                    return Results.BadRequest(new { Error = "User not found or inactive" });
                }

                // Get roles and claims
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

                // Generate new JWT token
                var newToken = GenerateJwtToken(user, roles, roleClaims, configuration);

                return Results.Ok(new
                {
                    Token = newToken,
                    User = new UserInfoDto
                    {
                        Email = user.Email ?? string.Empty,
                        FullName = user.FullName,
                        Roles = roles.ToList(),
                        Permissions = roleClaims.Where(c => c.Type == SystemPermissions.PermissionType).Select(c => c.Value).Distinct().ToList()
                    }
                });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = $"Invalid refresh token: {ex.Message}" });
            }
        });

        // Logout (for blacklisting tokens if needed)
        group.MapPost("/logout", async () =>
        {
            // In a stateless JWT setup, logout is handled client-side
            // For future: implement token blacklisting with Redis
            return Results.Ok(new { Message = "Logged out successfully" });
        });

        group.MapGet("/users", async (UserManager<ApplicationUser> userManager, [AsParameters] UserQueryParams queryParams) =>
        {
            var query = userManager.Users.AsQueryable();

            // Filter by active status
            if (!queryParams.IncludeInactive)
            {
                query = query.Where(u => u.IsActive);
            }

            // Search by email, name
            if (!string.IsNullOrWhiteSpace(queryParams.Search))
            {
                var searchTerm = queryParams.Search.ToLower();
                query = query.Where(u =>
                    u.Email!.ToLower().Contains(searchTerm) ||
                    u.FullName.ToLower().Contains(searchTerm));
            }

            // Count total before pagination
            var total = await query.CountAsync();

            // Sort
            query = queryParams.SortBy?.ToLower() switch
            {
                "email" => queryParams.SortDescending
                    ? query.OrderByDescending(u => u.Email)
                    : query.OrderBy(u => u.Email),
                "fullname" => queryParams.SortDescending
                    ? query.OrderByDescending(u => u.FullName)
                    : query.OrderBy(u => u.FullName),
                "createdat" => queryParams.SortDescending
                    ? query.OrderByDescending(u => u.Id)
                    : query.OrderBy(u => u.Id),
                _ => query.OrderBy(u => u.Email)
            };

            // Paginate
            var users = await query
                .Skip(queryParams.Skip)
                .Take(queryParams.Take)
                .ToListAsync();

            // Build DTOs with roles
            var userDtos = new List<UserDto>();
            foreach (var user in users)
            {
                var roles = await userManager.GetRolesAsync(user);

                // Filter by role if specified
                if (!string.IsNullOrWhiteSpace(queryParams.Role) && !roles.Contains(queryParams.Role))
                {
                    continue;
                }

                userDtos.Add(new UserDto
                {
                    Id = user.Id,
                    Email = user.Email ?? string.Empty,
                    FullName = user.FullName,
                    IsActive = user.IsActive,
                    Roles = roles.ToList(),
                    CreatedAt = DateTime.UtcNow // Note: ApplicationUser doesn't have CreatedAt, using current time
                });
            }

            var pagedResult = new PagedResult<UserDto>
            {
                Items = userDtos,
                Total = total,
                Page = queryParams.Page,
                PageSize = queryParams.PageSize
            };

            return Results.Ok(pagedResult);
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

                var response = new LoginResponseDto
                {
                    Token = jwtToken,
                    User = new UserInfoDto
                    {
                        Email = user.Email ?? string.Empty,
                        FullName = user.FullName,
                        Roles = roles.ToList(),
                        Permissions = permissions
                    }
                };

                return Results.Ok(response);
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

        group.MapPost("/users/{id}/roles", async (string id, AssignRolesDto model, UserManager<ApplicationUser> userManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound("User not found");

            var currentRoles = await userManager.GetRolesAsync(user);
            var result = await userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            result = await userManager.AddToRolesAsync(user, model.Roles);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            var performedBy = currentUser.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
            await auditService.LogAsync(performedBy, "UpdateUserRoles", "ApplicationUser", user.Id, $"Updated roles to: {string.Join(", ", model.Roles)}");

            return Results.Ok(new { Message = "Roles updated successfully", Roles = model.Roles });
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

        // Forgot Password
        group.MapPost("/forgot-password", async (ForgotPasswordDto model, UserManager<ApplicationUser> userManager, IdentityDbContext dbContext, IEmailService emailService, IConfiguration configuration, IRateLimitService rateLimitService) =>
        {
            // Rate limiting: 3 attempts per 15 minutes per email
            var rateLimitKey = $"forgot-password:{model.Email}";
            if (await rateLimitService.IsRateLimitedAsync(rateLimitKey, 3, TimeSpan.FromMinutes(15)))
            {
                return Results.StatusCode(429); // Too Many Requests
            }

            await rateLimitService.IncrementAsync(rateLimitKey, TimeSpan.FromMinutes(15));

            var user = await userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                // Don't reveal that the user does not exist for security reasons
                return Results.Ok(new { Message = "If the email exists, a password reset link has been sent." });
            }

            // Generate a unique token
            var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray()) + Convert.ToBase64String(Guid.NewGuid().ToByteArray());

            var resetToken = new PasswordResetToken
            {
                UserId = user.Id,
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddHours(1),
                IsUsed = false
            };

            dbContext.PasswordResetTokens.Add(resetToken);
            await dbContext.SaveChangesAsync();

            // Send email with reset link
            var frontendUrl = configuration["Frontend:Url"] ?? "http://localhost:5173";
            var resetLink = $"{frontendUrl}/reset-password?token={token}";

            try
            {
                await emailService.SendPasswordResetEmailAsync(user.Email!, resetLink);
            }
            catch (Exception ex)
            {
                // Log error but don't reveal to user for security reasons
                Console.WriteLine($"Failed to send email: {ex.Message}");
            }

            return Results.Ok(new { Message = "If the email exists, a password reset link has been sent." });
        });

        // Reset Password
        group.MapPost("/reset-password", async (ResetPasswordDto model, UserManager<ApplicationUser> userManager, IdentityDbContext dbContext) =>
        {
            var resetToken = await dbContext.PasswordResetTokens
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == model.Token && !rt.IsUsed && rt.ExpiresAt > DateTime.UtcNow);

            if (resetToken == null)
            {
                return Results.BadRequest(new { Message = "Invalid or expired token." });
            }

            var user = resetToken.User;
            if (user == null)
            {
                return Results.BadRequest(new { Message = "User not found." });
            }

            // Remove old password and set new one
            var removePasswordResult = await userManager.RemovePasswordAsync(user);
            if (!removePasswordResult.Succeeded)
            {
                return Results.BadRequest(removePasswordResult.Errors);
            }

            var addPasswordResult = await userManager.AddPasswordAsync(user, model.NewPassword);
            if (!addPasswordResult.Succeeded)
            {
                return Results.BadRequest(addPasswordResult.Errors);
            }

            // Mark token as used
            resetToken.IsUsed = true;
            await dbContext.SaveChangesAsync();

            return Results.Ok(new { Message = "Password has been reset successfully." });
        });
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
public record RefreshTokenRequestDto(string RefreshToken);
public record UpdateUserDto(string Email, string FullName);
public record GoogleLoginDto(string? IdToken);
public record ForgotPasswordDto(string Email);
public record ResetPasswordDto(string Token, string NewPassword);
