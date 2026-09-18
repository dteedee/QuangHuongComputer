using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair;

/// <summary>
/// Resolves the calling Identity user to their Repair.Domain.Technician row and
/// answers the role questions every /api/repair/tech/* and technician-assign
/// handler needs.
///
/// W0-11: handlers used to compare WorkOrder.TechnicianId (a Technician.Id)
/// directly against the caller's Identity user id - two different id spaces -
/// so every technician got 403 or an empty list. Technician.UserId (nullable,
/// filtered-unique) links them; this is the one place that walks it, so the
/// resolution rule lives in exactly one spot.
/// </summary>
public static class TechnicianAccess
{
    public static bool TryGetUserId(ClaimsPrincipal user, out Guid userId)
    {
        var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdStr, out userId);
    }

    public static bool IsManager(ClaimsPrincipal user)
    {
        var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value);
        return roles.Contains("Manager") || roles.Contains("Admin");
    }

    /// <summary>Caller's own Technician row, or null when the user carries a
    /// technician role but has no linked row (misconfigured account - deny,
    /// don't crash).</summary>
    public static Task<Technician?> ResolveTechnicianAsync(RepairDbContext db, Guid userId) =>
        db.Technicians.FirstOrDefaultAsync(t => t.UserId == userId);

    public static string GetUserName(ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
}
