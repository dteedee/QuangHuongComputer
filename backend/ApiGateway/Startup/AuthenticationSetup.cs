using BuildingBlocks.Security;
using Microsoft.AspNetCore.Authorization;

namespace ApiGateway.Startup;

/// <summary>
/// Registers authorization policies derived from the <see cref="Permissions"/> catalog.
///
/// JWT bearer authentication itself is configured inside the Identity module (see
/// <c>Identity.DependencyInjection.AddIdentityModule</c>). This class only wires the
/// permission-based authorization layer on top of it so that endpoints can gate on
/// <c>[Authorize(Policy = Permissions.X.Y)]</c>.
/// </summary>
public static class AuthenticationSetup
{
    public static void Configure(WebApplicationBuilder builder)
    {
        builder.Services.AddAuthorization(options =>
        {
            foreach (var field in typeof(Permissions).GetNestedTypes().SelectMany(t => t.GetFields()))
            {
                var permission = field.GetValue(null)?.ToString();
                if (permission != null)
                {
                    options.AddPolicy(permission, policy => policy.Requirements.Add(new PermissionRequirement(permission)));
                }
            }
        });

        builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
    }
}
