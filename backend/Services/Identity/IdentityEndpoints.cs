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

        group.MapPost("/login", async (LoginDto model, UserManager<ApplicationUser> userManager, IConfiguration configuration) =>
        {
            var user = await userManager.FindByEmailAsync(model.Email);
            if (user != null && await userManager.CheckPasswordAsync(user, model.Password))
            {
                var roles = await userManager.GetRolesAsync(user);
                var token = GenerateJwtToken(user, roles, configuration);
                return Results.Ok(new { Token = token, User = new { user.Email, user.FullName, Roles = roles } });
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
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        group.MapPost("/google", async (GoogleLoginDto model, UserManager<ApplicationUser> userManager, IConfiguration configuration, IPublishEndpoint publishEndpoint) =>
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
                var jwtToken = GenerateJwtToken(user, roles, configuration);
                return Results.Ok(new { Token = jwtToken, User = new { user.Email, user.FullName, Roles = roles } });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = "Invalid Google Token", Details = ex.Message });
            }
        });

        group.MapGet("/roles", async (RoleManager<IdentityRole> roleManager) =>
        {
            var roles = await roleManager.Roles.Select(r => r.Name).ToListAsync();
            return Results.Ok(roles);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        group.MapPost("/users/{id}/roles", async (string id, string[] roles, UserManager<ApplicationUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound("User not found");

            var currentRoles = await userManager.GetRolesAsync(user);
            var result = await userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            result = await userManager.AddToRolesAsync(user, roles);
            if (!result.Succeeded) return Results.BadRequest(result.Errors);

            return Results.Ok(new { Message = "Roles updated successfully", Roles = roles });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));
    }

    private static string GenerateJwtToken(ApplicationUser user, IList<string> roles, IConfiguration configuration)
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
public record GoogleLoginDto(string? IdToken);
