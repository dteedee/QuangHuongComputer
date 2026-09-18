using System.Security.Claims;
using Identity.Infrastructure;
using Identity.Services;
using Identity.DTOs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Authorization;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace Identity.Endpoints;

/// <summary>Register, password login, token refresh and revocation. Google sign-in lives in GoogleLoginEndpoint.</summary>
public static class AuthenticationEndpoints
{
    /// <summary>
    /// One message for every credential failure. Distinguishing "user not found"
    /// from "wrong password" (as the old code did) is a free account-enumeration
    /// oracle: an attacker learns which e-mails exist before guessing anything.
    /// </summary>
    private const string GenericCredentialError = "Email hoặc mật khẩu không đúng.";

    public static void MapAuthenticationEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/register", async (RegisterDto model, UserManager<ApplicationUser> userManager, IPublishEndpoint publishEndpoint, IEmailService emailService) =>
        {
            var user = new ApplicationUser { UserName = model.Email, Email = model.Email, FullName = model.FullName };
            var result = await userManager.CreateAsync(user, model.Password);

            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            await userManager.AddToRoleAsync(user, BuildingBlocks.Security.Roles.Customer);
            await publishEndpoint.Publish(new UserRegisteredIntegrationEvent(Guid.Parse(user.Id), user.Email!, user.FullName));

            try
            {
                await emailService.SendWelcomeEmailAsync(user.Email!, user.FullName);
            }
            catch (Exception)
            {
                // A failed welcome mail must never fail the registration.
            }

            return Results.Ok(new { Message = "User registered successfully" });
        });

        group.MapPost("/login", async (LoginDto model, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration, IRateLimitService rateLimitService, IRefreshTokenService refreshTokenService, HttpContext httpContext) =>
        {
            try
            {
                // In-process throttle (5 failures / 10 min per e-mail) in front of
                // the persistent Identity lockout configured in DependencyInjection.
                var rateLimitKey = $"login:{PasswordResetCodeService.NormalizeEmail(model.Email)}";
                if (await rateLimitService.IsRateLimitedAsync(rateLimitKey, 5, TimeSpan.FromMinutes(10)))
                {
                    return Results.StatusCode(StatusCodes.Status429TooManyRequests);
                }

                var user = await userManager.FindByEmailAsync(model.Email);
                if (user == null)
                {
                    // Same shape, same status as a wrong password - no enumeration.
                    await rateLimitService.IncrementAsync(rateLimitKey, TimeSpan.FromMinutes(10));
                    return Results.BadRequest(new { Error = GenericCredentialError });
                }

                if (await userManager.IsLockedOutAsync(user))
                {
                    return Results.StatusCode(StatusCodes.Status429TooManyRequests);
                }

                if (!await userManager.CheckPasswordAsync(user, model.Password))
                {
                    await userManager.AccessFailedAsync(user);
                    await rateLimitService.IncrementAsync(rateLimitKey, TimeSpan.FromMinutes(10));
                    return Results.BadRequest(new { Error = GenericCredentialError });
                }

                // Only AFTER the password is proven correct may we say anything
                // specific about the account - that leaks nothing to a guesser.
                if (!user.IsActive)
                {
                    return Results.BadRequest(new { Error = "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên." });
                }

                await userManager.ResetAccessFailedCountAsync(user);
                await rateLimitService.ResetAsync(rateLimitKey);

                var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                user.LastLoginAt = DateTime.UtcNow;
                user.LastLoginIp = ipAddress;
                await userManager.UpdateAsync(user);

                var (roles, roleClaims) = await AuthClaimsLoader.LoadAsync(userManager, roleManager, user);
                var jwtId = Guid.NewGuid().ToString();
                var token = JwtTokenFactory.Create(user, roles, roleClaims, configuration, jwtId);
                var refreshToken = await refreshTokenService.GenerateRefreshTokenAsync(user.Id, ipAddress, jwtId);

                return Results.Ok(new LoginResponseDto
                {
                    Token = token,
                    RefreshToken = refreshToken.Token,
                    User = AuthClaimsLoader.BuildUserInfo(user, roles, roleClaims)
                });
            }
            catch (Exception)
            {
                return Results.Problem(detail: "Có lỗi xảy ra. Vui lòng thử lại.", statusCode: 500);
            }
        });

        group.MapPost("/refresh-token", async (RefreshTokenRequestDto model, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration, IRefreshTokenService refreshTokenService, HttpContext httpContext) =>
        {
            if (string.IsNullOrEmpty(model.RefreshToken))
            {
                return Results.BadRequest(new { Error = "Refresh token is required" });
            }

            try
            {
                var refreshToken = await refreshTokenService.GetRefreshTokenAsync(model.RefreshToken);
                if (refreshToken == null || !refreshToken.IsActive)
                {
                    return Results.BadRequest(new { Error = "Invalid refresh token" });
                }

                var user = refreshToken.User;
                if (user == null || !user.IsActive)
                {
                    return Results.BadRequest(new { Error = "User not found or inactive" });
                }

                var (roles, roleClaims) = await AuthClaimsLoader.LoadAsync(userManager, roleManager, user);

                // Rotation: issue the new pair first, then retire the presented one.
                var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                var jwtId = Guid.NewGuid().ToString();
                var newRefreshToken = await refreshTokenService.GenerateRefreshTokenAsync(user.Id, ipAddress, jwtId);
                await refreshTokenService.RevokeRefreshTokenAsync(model.RefreshToken, ipAddress, newRefreshToken.Token);

                return Results.Ok(new LoginResponseDto
                {
                    Token = JwtTokenFactory.Create(user, roles, roleClaims, configuration, jwtId),
                    RefreshToken = newRefreshToken.Token,
                    User = AuthClaimsLoader.BuildUserInfo(user, roles, roleClaims)
                });
            }
            catch (Exception)
            {
                return Results.BadRequest(new { Error = "Token không hợp lệ" });
            }
        });

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
            catch (Exception)
            {
                return Results.BadRequest(new { Error = "Đăng xuất thất bại" });
            }
        });

        group.MapPost("/revoke-all-tokens", [Authorize] async (IRefreshTokenService refreshTokenService, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            try
            {
                await refreshTokenService.RevokeAllUserTokensAsync(userId);
                return Results.Ok(new { Message = "All tokens revoked successfully. You have been logged out from all devices." });
            }
            catch (Exception)
            {
                return Results.BadRequest(new { Error = "Không thể thu hồi token" });
            }
        });

    }

}
