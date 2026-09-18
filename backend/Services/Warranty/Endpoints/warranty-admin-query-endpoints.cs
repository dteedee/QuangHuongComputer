using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty;

/// <summary>
/// W2-6: admin read-only queries over ProductWarranty (eligible-serials for loaner assignment,
/// serial timeline for W2-5's serial detail page). Split out of warranty-endpoints.cs (was 251
/// lines, over the 200-line/file rule).
/// </summary>
public static class WarrantyAdminQueryEndpoints
{
    public static void MapWarrantyAdminQueryEndpoints(this IEndpointRouteBuilder app)
    {
        var adminGroup = app.MapGroup("/api/warranty/admin")
            .RequireModulePermissions(PermissionModules.Warranty);

        // D08 §4: serial còn hạn BH (chưa có claim đang mở) — cho màn hình gán máy mượn (LoanerDevice).
        adminGroup.MapGet("/claims/eligible-serials", async (
            WarrantyDbContext db,
            [FromQuery] string? q = null) =>
        {
            var now = DateTime.UtcNow;
            var query = db.ProductWarranties.AsNoTracking()
                .Where(w => w.Status == WarrantyStatus.Active && w.ExpirationDate >= now);
            if (!string.IsNullOrWhiteSpace(q))
                query = query.Where(w => w.SerialNumber.Contains(q));

            var serials = await query
                .OrderByDescending(w => w.PurchaseDate)
                .Take(50)
                .Select(w => new { w.SerialNumber, w.ProductId, w.ExpirationDate, w.Provider })
                .ToListAsync();
            return Results.Ok(serials);
        });

        // Implementation Step 13 / Todo "Serial-timeline query services exposed": read-only view of
        // everything Warranty knows about a serial — for W2-5's serial detail page. Merges
        // ProductWarranty (both providers), WarrantyClaim history and any RMA the serial was part of
        // (ItemsJson scan — see rma-dto-mapping.cs ToDto for the same parse-never-throws pattern).
        adminGroup.MapGet("/serial-timeline/{serialNumber}", async (string serialNumber, WarrantyDbContext db) =>
        {
            var warranties = await db.ProductWarranties.AsNoTracking()
                .Where(w => w.SerialNumber == serialNumber)
                .OrderBy(w => w.PurchaseDate)
                .ToListAsync();

            var claims = await db.Claims.AsNoTracking()
                .Where(c => c.SerialNumber == serialNumber)
                .OrderBy(c => c.FiledDate)
                .Select(c => new
                {
                    c.Id,
                    Status = c.Status.ToString(),
                    c.FiledDate,
                    c.ApprovedBy,
                    c.ResolvedBy,
                    c.ResolvedDate,
                    c.DeviceReceivedAt,
                    c.DeviceReturnedAt,
                    c.RmaId,
                    c.LoanerDeviceId
                })
                .ToListAsync();

            var rmaIds = claims.Where(c => c.RmaId.HasValue).Select(c => c.RmaId!.Value).Distinct().ToList();
            var rmas = rmaIds.Count == 0
                ? new List<object>()
                : (await db.Rmas.AsNoTracking().Where(r => rmaIds.Contains(r.Id)).ToListAsync())
                    .Select(r => (object)new { r.Id, r.RmaNumber, Status = r.Status.ToString(), r.SentDate, r.ActualReturnDate })
                    .ToList();

            return Results.Ok(new
            {
                SerialNumber = serialNumber,
                Warranties = warranties.Select(w => new
                {
                    w.Id,
                    Provider = w.Provider.ToString(),
                    Status = w.Status.ToString(),
                    w.PurchaseDate,
                    w.ExpirationDate,
                    w.WarrantyPeriodMonths,
                    w.ExtendedDays,
                    w.ReplacedByWarrantyId,
                    IsValid = w.IsValid()
                }),
                Claims = claims,
                Rmas = rmas
            });
        });
    }
}
