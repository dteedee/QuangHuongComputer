using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace Repair;

/// <summary>
/// Routes /api/repair/tech/* to the handler groups. W0-11 split the single
/// 400+ line file into TechnicianAccess (shared resolution/role helpers),
/// TechnicianWorkOrderQueryEndpoints (reads), TechnicianWorkOrderActionEndpoints
/// (accept/decline/status) and TechnicianWorkOrderPartsEndpoints (parts/log).
/// </summary>
public static class TechnicianEndpoints
{
    public static void MapTechnicianEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/repair/tech")
            .RequireAuthorization(policy => policy.RequireRole("TechnicianInShop", "TechnicianOnSite", "Admin", "Manager"));

        group.MapTechnicianWorkOrderQueryEndpoints();
        group.MapTechnicianWorkOrderActionEndpoints();
        group.MapTechnicianWorkOrderPartsEndpoints();
    }
}
