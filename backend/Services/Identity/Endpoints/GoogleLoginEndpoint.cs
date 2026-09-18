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
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace Identity.Endpoints;

/// <summary>`POST /api/auth/google` - sign-in with a Google id_token.</summary>
public static class GoogleLoginEndpoint
{
    public static void MapGoogleLoginEndpoint(this RouteGroupBuilder group)
    {
        group.MapPost("/google", async (GoogleLoginDto model, UserManager<ApplicationUser> userManager, IConfiguration configuration, IPublishEndpoint publishEndpoint, ITokenIssuer tokenIssuer, HttpContext httpContext, IWebHostEnvironment env) =>
        {
            try
            {
                var idToken = model.IdToken;
                if (string.IsNullOrEmpty(idToken))
                {
                    return Results.BadRequest(new { Error = "Invalid Request", Details = "idToken is required" });
                }

                var payload = await ResolvePayloadAsync(idToken, userManager, configuration, env);
                if (payload is null)
                {
                    return Results.BadRequest(new { Error = "Configuration Error", Details = "Google OAuth chưa được cấu hình. Vui lòng liên hệ quản trị viên." });
                }

                var fullName = ResolveDisplayName(payload);
                var user = await userManager.FindByEmailAsync(payload.Email);
                if (user == null)
                {
                    user = new ApplicationUser
                    {
                        UserName = payload.Email,
                        Email = payload.Email,
                        FullName = fullName,
                        EmailConfirmed = true, // Google already verified it
                        CreatedAt = DateTime.UtcNow
                    };
                    var result = await userManager.CreateAsync(user);
                    if (!result.Succeeded) return Results.BadRequest(result.Errors);

                    await userManager.AddToRoleAsync(user, BuildingBlocks.Security.Roles.Customer);
                    await publishEndpoint.Publish(new UserRegisteredIntegrationEvent(Guid.Parse(user.Id), user.Email!, user.FullName));
                }
                else
                {
                    // A deactivated account must not be able to walk back in
                    // through the social provider - the old code never checked.
                    if (!user.IsActive)
                    {
                        return Results.BadRequest(new { Error = "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên." });
                    }

                    var needsUpdate = false;
                    if (string.IsNullOrEmpty(user.FullName) || user.FullName == "Google User")
                    {
                        user.FullName = fullName;
                        needsUpdate = true;
                    }
                    if (!user.EmailConfirmed)
                    {
                        user.EmailConfirmed = true;
                        needsUpdate = true;
                    }
                    if (needsUpdate) await userManager.UpdateAsync(user);
                }

                // Same completion path as password login: one session row, one
                // token pair, one lifetime. This block used to be a third copy.
                return Results.Ok(await LoginCompletion.CompleteAsync(user, userManager, tokenIssuer, httpContext));
            }
            catch (Exception)
            {
                return Results.BadRequest(new { Error = "Google Token không hợp lệ" });
            }
        });
    }

    /// <summary>
    /// Validates the Google id_token, or synthesises a payload on the Development
    /// simulation path. Returns null when Google OAuth is not configured.
    /// </summary>
    private static async Task<Google.Apis.Auth.GoogleJsonWebSignature.Payload?> ResolvePayloadAsync(
        string idToken,
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration,
        IWebHostEnvironment env)
    {
        if (idToken.Contains("simulation_google_token"))
        {
            if (!env.IsDevelopment())
            {
                throw new InvalidOperationException("Simulation mode is only available in development environment");
            }

            var timestamp = DateTime.UtcNow.Ticks;
            var simulated = new Google.Apis.Auth.GoogleJsonWebSignature.Payload
            {
                Email = $"simulator_{timestamp}@google.com",
                Name = "Google Test User",
                Subject = $"simulation_subject_{timestamp}"
            };

            var existingTestUser = await userManager.FindByEmailAsync("simulator@google.com");
            if (existingTestUser != null)
            {
                simulated.Email = "simulator@google.com";
                simulated.Name = existingTestUser.FullName;
            }
            return simulated;
        }

        var clientId = configuration["OAuth:Google:ClientId"];
        if (string.IsNullOrEmpty(clientId)) return null;

        var settings = new Google.Apis.Auth.GoogleJsonWebSignature.ValidationSettings
        {
            Audience = new List<string> { clientId }
        };
        return await Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync(idToken, settings);
    }

    private static string ResolveDisplayName(Google.Apis.Auth.GoogleJsonWebSignature.Payload payload)
    {
        if (!string.IsNullOrEmpty(payload.Name)) return payload.Name;

        var combined = $"{payload.GivenName ?? ""} {payload.FamilyName ?? ""}".Trim();
        if (!string.IsNullOrEmpty(combined)) return combined;

        return payload.Email?.Split('@')[0] ?? "Google User";
    }
}
