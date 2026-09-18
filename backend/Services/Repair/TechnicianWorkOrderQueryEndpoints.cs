using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair;

/// <summary>
/// Read endpoints under /api/repair/tech: a technician's own work orders (via
/// TechnicianAccess), the unassigned queue for managers, and single work order
/// detail. Split out of TechnicianEndpoints.cs (W0-11) to keep each file under
/// ~200 lines; see TechnicianWorkOrderActionEndpoints and
/// TechnicianWorkOrderPartsEndpoints for the mutating handlers.
/// </summary>
public static class TechnicianWorkOrderQueryEndpoints
{
    public static void MapTechnicianWorkOrderQueryEndpoints(this RouteGroupBuilder group)
    {
        // Get assigned work orders for current technician (or all, for Manager/Admin)
        group.MapGet("/work-orders", async (RepairDbContext db, ClaimsPrincipal user, int page = 1, int pageSize = 20) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            IQueryable<WorkOrder> query;
            if (TechnicianAccess.IsManager(user))
            {
                query = db.WorkOrders.AsQueryable();
            }
            else
            {
                var technician = await TechnicianAccess.ResolveTechnicianAsync(db, userId);
                if (technician == null)
                    return Results.Ok(new { Total = 0, Page = page, PageSize = pageSize, WorkOrders = Array.Empty<object>() });
                query = db.WorkOrders.Where(w => w.TechnicianId == technician.Id);
            }

            var total = await query.CountAsync();
            var workOrders = await query
                .Include(w => w.Parts)
                .Include(w => w.Quotes)
                .OrderByDescending(w => w.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(w => new
                {
                    w.Id,
                    w.TicketNumber,
                    w.CustomerId,
                    w.DeviceModel,
                    w.SerialNumber,
                    w.Description,
                    w.Status,
                    w.TechnicianId,
                    w.ServiceType,
                    w.ServiceAddress,
                    w.EstimatedCost,
                    w.ServiceFee,
                    TotalCost = w.PartsCost + w.LaborCost + w.ServiceFee,
                    PartsCount = w.Parts.Count,
                    HasQuote = w.CurrentQuoteId != null,
                    w.CreatedAt,
                    w.AssignedAt,
                    w.StartedAt,
                    w.FinishedAt
                })
                .ToListAsync();

            return Results.Ok(new
            {
                Total = total,
                Page = page,
                PageSize = pageSize,
                WorkOrders = workOrders
            });
        });

        // Get unassigned work orders (for managers only)
        group.MapGet("/work-orders/unassigned", async (RepairDbContext db, ClaimsPrincipal user) =>
        {
            if (!TechnicianAccess.IsManager(user))
                return Results.Forbid();

            var workOrders = await db.WorkOrders
                .Where(w => w.TechnicianId == null && w.Status == WorkOrderStatus.Requested)
                .OrderBy(w => w.CreatedAt)
                .Select(w => new
                {
                    w.Id,
                    w.TicketNumber,
                    w.CustomerId,
                    w.DeviceModel,
                    w.Description,
                    w.ServiceType,
                    w.ServiceAddress,
                    w.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(workOrders);
        });

        // Get work order details
        group.MapGet("/work-orders/{id:guid}", async (Guid id, RepairDbContext db, ClaimsPrincipal user) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders
                .Include(w => w.Parts)
                .Include(w => w.Quotes)
                .Include(w => w.ActivityLogs.OrderByDescending(a => a.CreatedAt))
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            if (!TechnicianAccess.IsManager(user))
            {
                var technician = await TechnicianAccess.ResolveTechnicianAsync(db, userId);
                if (technician == null || workOrder.TechnicianId != technician.Id)
                    return Results.Forbid();
            }

            return Results.Ok(new
            {
                workOrder.Id,
                workOrder.TicketNumber,
                workOrder.CustomerId,
                workOrder.DeviceModel,
                workOrder.SerialNumber,
                workOrder.Description,
                workOrder.Status,
                workOrder.TechnicianId,
                workOrder.ServiceType,
                workOrder.ServiceAddress,
                workOrder.EstimatedCost,
                workOrder.PartsCost,
                workOrder.LaborCost,
                workOrder.ServiceFee,
                workOrder.TotalCost,
                workOrder.TechnicalNotes,
                Parts = workOrder.Parts.Select(p => new
                {
                    p.Id,
                    p.PartName,
                    p.PartNumber,
                    p.Quantity,
                    p.UnitPrice,
                    p.TotalPrice
                }),
                Quotes = workOrder.Quotes.Select(q => new
                {
                    q.Id,
                    q.QuoteNumber,
                    q.PartsCost,
                    q.LaborCost,
                    q.ServiceFee,
                    q.TotalCost,
                    q.Status,
                    q.CreatedAt,
                    q.ValidUntil
                }),
                ActivityLogs = workOrder.ActivityLogs.Select(a => new
                {
                    a.Id,
                    a.Activity,
                    a.Description,
                    a.PreviousStatus,
                    a.NewStatus,
                    a.PerformedByName,
                    a.CreatedAt
                }),
                workOrder.CreatedAt,
                workOrder.AssignedAt,
                workOrder.DiagnosedAt,
                workOrder.StartedAt,
                workOrder.FinishedAt
            });
        });
    }
}
