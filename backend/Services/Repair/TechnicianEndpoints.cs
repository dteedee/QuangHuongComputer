using BuildingBlocks.Security;
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
        // W1-10: khu vực kỹ thuật viên -> GET Repair.ViewAll, POST Repair.CreateQuote,
        // PUT/PATCH/DELETE Repair.UpdateStatus. Cả hai role kỹ thuật viên đều giữ đủ các quyền này.
        var group = app.MapGroup("/api/repair/tech")
            .RequireModulePermissions(PermissionModules.Repair);

        group.MapTechnicianWorkOrderQueryEndpoints();
        group.MapTechnicianWorkOrderActionEndpoints();
        group.MapTechnicianWorkOrderPartsEndpoints();
    }
}
