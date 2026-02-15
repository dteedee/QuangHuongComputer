using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Identity.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
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

        group.MapPost("/login", async (LoginDto model, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration, IRateLimitService rateLimitService, IRefreshTokenService refreshTokenService, HttpContext httpContext) =>
        {
            try
            {
                // Rate limiting: 5 failed login attempts per 10 minutes per email
                var rateLimitKey = $"login:{model.Email}";
                if (await rateLimitService.IsRateLimitedAsync(rateLimitKey, 5, TimeSpan.FromMinutes(10)))
                {
                    return Results.StatusCode(429); // Too Many Requests
                }

                var user = await userManager.FindByEmailAsync(model.Email);
                if (user == null)
                {
                    return Results.BadRequest(new { Error = "User not found" });
                }

                if (!user.IsActive)
                {
                    return Results.BadRequest(new { Error = "User account is inactive" });
                }

                if (!await userManager.CheckPasswordAsync(user, model.Password))
                {
                    // Log attempt for security auditing
                    await rateLimitService.IncrementAsync(rateLimitKey, TimeSpan.FromMinutes(10));
                    return Results.BadRequest(new { Error = "Invalid password" });
                }

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

                var jwtId = Guid.NewGuid().ToString();
                var token = GenerateJwtToken(user, roles, roleClaims, configuration, jwtId);
                var permissions = roleClaims.Where(c => c.Type == SystemPermissions.PermissionType).Select(c => c.Value).Distinct().ToList();

                // Generate refresh token with IP tracking
                var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                var refreshToken = await refreshTokenService.GenerateRefreshTokenAsync(user.Id, ipAddress, jwtId);

                var response = new LoginResponseDto
                {
                    Token = token,
                    RefreshToken = refreshToken.Token,
                    User = new UserInfoDto
                    {
                        Id = user.Id,
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
                Console.WriteLine($"[Login Error] {ex.GetType().Name}: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                return Results.Problem(detail: ex.Message, statusCode: 500);
            }
        });

        // Refresh Token Endpoint - Secure implementation with database validation
        group.MapPost("/refresh-token", async (RefreshTokenRequestDto model, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration, IRefreshTokenService refreshTokenService, HttpContext httpContext) =>
        {
            if (string.IsNullOrEmpty(model.RefreshToken))
            {
                return Results.BadRequest(new { Error = "Refresh token is required" });
            }

            try
            {
                // 1. Validate refresh token from database
                var refreshToken = await refreshTokenService.GetRefreshTokenAsync(model.RefreshToken);
                if (refreshToken == null)
                {
                    return Results.BadRequest(new { Error = "Invalid refresh token" });
                }

                // 2. Check if token is active (not revoked, not expired)
                if (!refreshToken.IsActive)
                {
                    return Results.BadRequest(new { Error = "Refresh token is revoked or expired" });
                }

                // 3. Get user and verify they're still active
                var user = refreshToken.User;
                if (user == null || !user.IsActive)
                {
                    return Results.BadRequest(new { Error = "User not found or inactive" });
                }

                // 4. Get roles and claims for new JWT
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

                // 5. Revoke old refresh token and generate new one (token rotation)
                var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                var jwtId = Guid.NewGuid().ToString();
                var newRefreshToken = await refreshTokenService.GenerateRefreshTokenAsync(user.Id, ipAddress, jwtId);
                await refreshTokenService.RevokeRefreshTokenAsync(model.RefreshToken, ipAddress, newRefreshToken.Token);

                // 6. Generate new JWT token
                var newJwtToken = GenerateJwtToken(user, roles, roleClaims, configuration, jwtId);
                var permissions = roleClaims.Where(c => c.Type == SystemPermissions.PermissionType).Select(c => c.Value).Distinct().ToList();

                return Results.Ok(new
                {
                    Token = newJwtToken,
                    RefreshToken = newRefreshToken.Token,
                    User = new UserInfoDto
                    {
                        Id = user.Id,
                        Email = user.Email ?? string.Empty,
                        FullName = user.FullName,
                        Roles = roles.ToList(),
                        Permissions = permissions
                    }
                });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = $"Invalid refresh token: {ex.Message}" });
            }
        });

        // Logout - Revoke refresh token
        group.MapPost("/logout", async (RefreshTokenRequestDto model, IRefreshTokenService refreshTokenService, HttpContext httpContext) =>
        {
            if (string.IsNullOrEmpty(model.RefreshToken))
            {
                return Results.BadRequest(new { Error = "Refresh token is required" });
            }

            try
            {
                var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                await refreshTokenService.RevokeRefreshTokenAsync(model.RefreshToken, ipAddress);
                return Results.Ok(new { Message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = $"Logout failed: {ex.Message}" });
            }
        });

        // Revoke All Tokens (Logout from all devices)
        group.MapPost("/revoke-all-tokens", [Authorize] async (IRefreshTokenService refreshTokenService, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Results.Unauthorized();
            }

            try
            {
                await refreshTokenService.RevokeAllUserTokensAsync(userId);
                return Results.Ok(new { Message = "All tokens revoked successfully. You have been logged out from all devices." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = $"Failed to revoke tokens: {ex.Message}" });
            }
        });

        group.MapGet("/users", async (UserManager<ApplicationUser> userManager, [AsParameters] UserQueryParams queryParams) =>
        {
            var query = userManager.Users.AsQueryable();

            // Filter by active status
            if (!queryParams.ShowInactive)
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
                "email" => queryParams.SortDesc
                    ? query.OrderByDescending(u => u.Email)
                    : query.OrderBy(u => u.Email),
                "fullname" => queryParams.SortDesc
                    ? query.OrderByDescending(u => u.FullName)
                    : query.OrderBy(u => u.FullName),
                "createdat" => queryParams.SortDesc
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

        group.MapPost("/google", async (GoogleLoginDto model, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration, IPublishEndpoint publishEndpoint, IRefreshTokenService refreshTokenService, HttpContext httpContext, IWebHostEnvironment env) =>
        {
            try
            {
                var token = model.IdToken;

                if (string.IsNullOrEmpty(token))
                {
                    return Results.BadRequest(new { Error = "Invalid Request", Details = "idToken is required" });
                }

                Google.Apis.Auth.GoogleJsonWebSignature.Payload payload;

                // Simulation mode for development testing
                if (token.Contains("simulation_google_token"))
                {
                    if (!env.IsDevelopment())
                    {
                        return Results.BadRequest(new { Error = "Invalid Request", Details = "Simulation mode is only available in development environment" });
                    }

                    // Generate unique email for simulation to avoid conflicts
                    var timestamp = DateTime.UtcNow.Ticks;
                    payload = new Google.Apis.Auth.GoogleJsonWebSignature.Payload
                    {
                        Email = $"simulator_{timestamp}@google.com",
                        Name = "Google Test User",
                        Subject = $"simulation_subject_{timestamp}"
                    };

                    // Check if test user already exists, use existing one
                    var existingTestUser = await userManager.FindByEmailAsync("simulator@google.com");
                    if (existingTestUser != null)
                    {
                        payload.Email = "simulator@google.com";
                        payload.Name = existingTestUser.FullName;
                    }
                }
                else
                {
                    // Real Validation - Check configuration
                    var clientId = configuration["OAuth:Google:ClientId"];
                    if (string.IsNullOrEmpty(clientId))
                    {
                        return Results.BadRequest(new { Error = "Configuration Error", Details = "Google OAuth chưa được cấu hình. Vui lòng liên hệ quản trị viên." });
                    }

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

                // Generate JWT with refresh token
                var jwtId = Guid.NewGuid().ToString();
                var jwtToken = GenerateJwtToken(user, roles, roleClaims, configuration, jwtId);
                var permissions = roleClaims.Where(c => c.Type == SystemPermissions.PermissionType).Select(c => c.Value).Distinct().ToList();

                // Generate refresh token
                var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                var refreshToken = await refreshTokenService.GenerateRefreshTokenAsync(user.Id, ipAddress, jwtId);

                var response = new LoginResponseDto
                {
                    Token = jwtToken,
                    RefreshToken = refreshToken.Token,
                    User = new UserInfoDto
                    {
                        Id = user.Id,
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

        // Deactivate User (Soft Delete)
        group.MapDelete("/users/{id}", async (string id, UserManager<ApplicationUser> userManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound("User not found");

            user.IsActive = false;
            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            var performedBy = currentUser.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
            await auditService.LogAsync(performedBy, "DeactivateUser", "ApplicationUser", user.Id, "Deactivated user (Soft Delete)");

            return Results.Ok(new { Message = "User deactivated successfully", IsActive = false });
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Users.Delete));

        // Activate User
        group.MapPost("/users/{id}/activate", async (string id, UserManager<ApplicationUser> userManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound("User not found");

            user.IsActive = true;
            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            var performedBy = currentUser.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
            await auditService.LogAsync(performedBy, "ActivateUser", "ApplicationUser", user.Id, "Activated user");

            return Results.Ok(new { Message = "User activated successfully", IsActive = true });
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Users.Edit));

        // Toggle User Status
        group.MapPost("/users/{id}/toggle-status", async (string id, UserManager<ApplicationUser> userManager, IAuditService auditService, ClaimsPrincipal currentUser) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound("User not found");

            user.IsActive = !user.IsActive;
            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            var performedBy = currentUser.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
            await auditService.LogAsync(performedBy, user.IsActive ? "ActivateUser" : "DeactivateUser", "ApplicationUser", user.Id, user.IsActive ? "Activated user" : "Deactivated user");

            return Results.Ok(new { Message = user.IsActive ? "User activated" : "User deactivated", IsActive = user.IsActive });
        }).RequireAuthorization(p => p.RequireClaim(SystemPermissions.PermissionType, SystemPermissions.Users.Edit));

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

            // Generate a 6-digit numeric OTP
            var random = new Random();
            var token = random.Next(100000, 999999).ToString();
            
            // For security, if there's an existing unused token for this user, invalidate it
            await dbContext.PasswordResetTokens
                .Where(rt => rt.UserId == user.Id && !rt.IsUsed)
                .ExecuteUpdateAsync(s => s.SetProperty(rt => rt.IsUsed, true));

            var resetToken = new PasswordResetToken
            {
                UserId = user.Id,
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15), // Shorter expiry for OTP
                IsUsed = false
            };

            dbContext.PasswordResetTokens.Add(resetToken);
            await dbContext.SaveChangesAsync();

            // Send email with reset link and code
            var frontendUrl = configuration["Frontend:Url"] ?? "http://localhost:5173";
            var resetLink = $"{frontendUrl}/reset-password"; // No token in URL for security

            try
            {
                await emailService.SendPasswordResetEmailAsync(user.Email!, token);
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

        // ==================== CURRENT USER PROFILE ENDPOINTS ====================

        // GET /api/auth/me - Get current user profile
        group.MapGet("/me", [Authorize] async (ClaimsPrincipal user, UserManager<ApplicationUser> userManager, IdentityDbContext dbContext) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var appUser = await userManager.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (appUser == null)
                return Results.NotFound(new { Message = "User not found" });

            var roles = await userManager.GetRolesAsync(appUser);

            // Get user profile if exists
            var profile = await dbContext.UserProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            // Get default address
            var defaultAddress = await dbContext.CustomerAddresses
                .FirstOrDefaultAsync(a => a.UserId == userId && a.IsDefault && a.IsActive);

            return Results.Ok(new
            {
                id = appUser.Id,
                email = appUser.Email,
                fullName = appUser.FullName,
                phoneNumber = appUser.PhoneNumber,
                avatarUrl = appUser.AvatarUrl,
                roles = roles.ToList(),
                lastLoginAt = appUser.LastLoginAt,
                emailVerified = appUser.EmailConfirmed,
                profile = profile != null ? new
                {
                    gender = profile.Gender,
                    dateOfBirth = profile.DateOfBirth,
                    address = profile.Address,
                    city = profile.City,
                    district = profile.District,
                    ward = profile.Ward,
                    customerType = profile.CustomerType.ToString(),
                    companyName = profile.CompanyName,
                    taxCode = profile.TaxCode
                } : null,
                defaultAddress = defaultAddress != null ? new
                {
                    id = defaultAddress.Id,
                    recipientName = defaultAddress.RecipientName,
                    phoneNumber = defaultAddress.PhoneNumber,
                    addressLine = defaultAddress.AddressLine,
                    city = defaultAddress.City,
                    district = defaultAddress.District,
                    ward = defaultAddress.Ward
                } : null
            });
        });

        // PUT /api/auth/me - Update current user profile
        group.MapPut("/me", [Authorize] async (UpdateProfileDto model, ClaimsPrincipal user, UserManager<ApplicationUser> userManager, IdentityDbContext dbContext) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var appUser = await userManager.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (appUser == null)
                return Results.NotFound(new { Message = "User not found" });

            // Update basic user info
            appUser.FullName = model.FullName;
            if (!string.IsNullOrEmpty(model.PhoneNumber))
            {
                appUser.PhoneNumber = model.PhoneNumber;
            }

            var result = await userManager.UpdateAsync(appUser);
            if (!result.Succeeded)
                return Results.BadRequest(result.Errors);

            // Update or create profile
            var profile = await dbContext.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null)
            {
                profile = new UserProfile
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Address = model.Address,
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.UserProfiles.Add(profile);
            }
            else
            {
                profile.Address = model.Address;
                profile.UpdatedAt = DateTime.UtcNow;
            }

            await dbContext.SaveChangesAsync();

            return Results.Ok(new { Message = "Profile updated successfully" });
        });

        // POST /api/auth/me/change-password - Change password
        group.MapPost("/me/change-password", [Authorize] async (ChangePasswordDto model, ClaimsPrincipal user, UserManager<ApplicationUser> userManager) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var appUser = await userManager.FindByIdAsync(userId);
            if (appUser == null)
                return Results.NotFound(new { Message = "User not found" });

            var result = await userManager.ChangePasswordAsync(appUser, model.CurrentPassword, model.NewPassword);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description).ToList();
                return Results.BadRequest(new { Message = "Failed to change password", Errors = errors });
            }

            appUser.PasswordChangedAt = DateTime.UtcNow;
            await userManager.UpdateAsync(appUser);

            return Results.Ok(new { Message = "Password changed successfully" });
        });

        // GET /api/auth/me/addresses - Get user's addresses
        group.MapGet("/me/addresses", [Authorize] async (ClaimsPrincipal user, IdentityDbContext dbContext) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var addresses = await dbContext.CustomerAddresses
                .Where(a => a.UserId == userId && a.IsActive)
                .OrderByDescending(a => a.IsDefault)
                .ThenByDescending(a => a.CreatedAt)
                .Select(a => new
                {
                    a.Id,
                    a.RecipientName,
                    a.PhoneNumber,
                    a.AddressLine,
                    a.City,
                    a.District,
                    a.Ward,
                    a.PostalCode,
                    a.IsDefault,
                    a.AddressLabel
                })
                .ToListAsync();

            return Results.Ok(addresses);
        });

        // POST /api/auth/me/addresses - Add new address
        group.MapPost("/me/addresses", [Authorize] async (CustomerAddress model, ClaimsPrincipal user, IdentityDbContext dbContext) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // If this is default, unset other defaults
            if (model.IsDefault)
            {
                var existingDefaults = await dbContext.CustomerAddresses
                    .Where(a => a.UserId == userId && a.IsDefault)
                    .ToListAsync();
                foreach (var addr in existingDefaults)
                {
                    addr.IsDefault = false;
                }
            }

            var address = new CustomerAddress
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                RecipientName = model.RecipientName,
                PhoneNumber = model.PhoneNumber,
                AddressLine = model.AddressLine,
                City = model.City,
                District = model.District,
                Ward = model.Ward,
                PostalCode = model.PostalCode,
                IsDefault = model.IsDefault,
                AddressLabel = model.AddressLabel,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            dbContext.CustomerAddresses.Add(address);
            await dbContext.SaveChangesAsync();

            return Results.Ok(new { Message = "Address added successfully", Id = address.Id });
        });

        // PUT /api/auth/me/addresses/{id} - Update address
        group.MapPut("/me/addresses/{id:guid}", [Authorize] async (Guid id, CustomerAddress model, ClaimsPrincipal user, IdentityDbContext dbContext) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var address = await dbContext.CustomerAddresses
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

            if (address == null)
                return Results.NotFound(new { Message = "Address not found" });

            // If setting as default, unset others
            if (model.IsDefault && !address.IsDefault)
            {
                var existingDefaults = await dbContext.CustomerAddresses
                    .Where(a => a.UserId == userId && a.IsDefault && a.Id != id)
                    .ToListAsync();
                foreach (var addr in existingDefaults)
                {
                    addr.IsDefault = false;
                }
            }

            address.RecipientName = model.RecipientName;
            address.PhoneNumber = model.PhoneNumber;
            address.AddressLine = model.AddressLine;
            address.City = model.City;
            address.District = model.District;
            address.Ward = model.Ward;
            address.PostalCode = model.PostalCode;
            address.IsDefault = model.IsDefault;
            address.AddressLabel = model.AddressLabel;
            address.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(new { Message = "Address updated successfully" });
        });

        // DELETE /api/auth/me/addresses/{id} - Delete address
        group.MapDelete("/me/addresses/{id:guid}", [Authorize] async (Guid id, ClaimsPrincipal user, IdentityDbContext dbContext) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var address = await dbContext.CustomerAddresses
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

            if (address == null)
                return Results.NotFound(new { Message = "Address not found" });

            address.IsActive = false;
            await dbContext.SaveChangesAsync();

            return Results.Ok(new { Message = "Address deleted successfully" });
        });
    }

    private static string GenerateJwtToken(ApplicationUser user, IList<string> roles, IEnumerable<Claim> roleClaims, IConfiguration configuration, string jwtId)
    {
        var jwtSettings = configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSettings["Key"] ?? "super_secret_key_1234567890123456"));

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim("name", user.FullName),
            new Claim(JwtRegisteredClaimNames.Jti, jwtId)
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
