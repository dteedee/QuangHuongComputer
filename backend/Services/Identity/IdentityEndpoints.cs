using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Identity.Endpoints;

namespace Identity;

/// <summary>
/// Composition root for `/api/auth`. The endpoint bodies live in
/// <c>Identity/Endpoints/*</c> - this file used to be 1.129 lines, which is how
/// an unguarded `DELETE /roles/{roleName}` stayed invisible in review.
/// </summary>
public static class IdentityEndpoints
{
    public static void MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapAuthenticationEndpoints();
        group.MapGoogleLoginEndpoint();
        group.MapPasswordResetEndpoints();
        group.MapUserAdminEndpoints();
        group.MapRoleAdminEndpoints();
        group.MapUserProfileEndpoints();
    }
}
