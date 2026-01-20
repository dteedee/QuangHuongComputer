using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;
using Microsoft.AspNetCore.Authorization;

namespace Repair;

public static class TechnicianEndpoints
{
    public static void MapTechnicianEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/repair/tech")
            .RequireAuthorization(policy => policy.RequireRole("TechnicianInShop", "TechnicianOnSite", "Admin", "Manager"));

        // Get assigned work orders for current technician
        group.MapGet("/work-orders", async (RepairDbContext db, ClaimsPrincipal user, int page = 1, int pageSize = 20) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            // Check if user is Manager or Admin - they can see all work orders
            var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
            var isManager = roles.Contains("Manager") || roles.Contains("Admin");

            var query = isManager
                ? db.WorkOrders.AsQueryable()
                : db.WorkOrders.Where(w => w.TechnicianId == userId);

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
            var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
            if (!roles.Contains("Manager") && !roles.Contains("Admin"))
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
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders
                .Include(w => w.Parts)
                .Include(w => w.Quotes)
                .Include(w => w.ActivityLogs.OrderByDescending(a => a.CreatedAt))
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            // Check authorization
            var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
            var isManager = roles.Contains("Manager") || roles.Contains("Admin");
            if (!isManager && workOrder.TechnicianId != userId)
                return Results.Forbid();

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

        // Accept assignment
        group.MapPut("/work-orders/{id:guid}/accept", async (Guid id, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            if (workOrder.TechnicianId != userId)
                return Results.Forbid();

            try
            {
                workOrder.AcceptAssignment();

                var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
                var log = WorkOrderActivityLog.CreateStatusChange(
                    workOrder.Id,
                    workOrder.Status,
                    workOrder.Status,
                    userId,
                    userName,
                    "Assignment accepted by technician");
                workOrder.AddActivityLog(log);

                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Assignment accepted", Status = workOrder.Status.ToString() });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        });

        // Decline assignment
        group.MapPut("/work-orders/{id:guid}/decline", async (Guid id, [FromBody] DeclineReasonDto dto, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            if (workOrder.TechnicianId != userId)
                return Results.Forbid();

            try
            {
                var previousStatus = workOrder.Status;
                workOrder.DeclineAssignment();

                var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
                var log = WorkOrderActivityLog.CreateStatusChange(
                    workOrder.Id,
                    previousStatus,
                    workOrder.Status,
                    userId,
                    userName,
                    $"Assignment declined: {dto.Reason}");
                workOrder.AddActivityLog(log);

                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Assignment declined", Status = workOrder.Status.ToString() });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        });

        // Update status
        group.MapPut("/work-orders/{id:guid}/status", async (Guid id, [FromBody] UpdateStatusDto dto, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            // Check authorization
            var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
            var isManager = roles.Contains("Manager") || roles.Contains("Admin");
            if (!isManager && workOrder.TechnicianId != userId)
                return Results.Forbid();

            try
            {
                var previousStatus = workOrder.Status;

                // Handle different status transitions
                switch (dto.Status)
                {
                    case WorkOrderStatus.Diagnosed:
                        workOrder.MarkAsDiagnosed(dto.Notes ?? "Diagnosed");
                        break;
                    case WorkOrderStatus.InProgress:
                        workOrder.StartRepair();
                        break;
                    case WorkOrderStatus.OnHold:
                        workOrder.PutOnHold(dto.Notes ?? "On hold");
                        break;
                    case WorkOrderStatus.Completed:
                        workOrder.CompleteRepair(notes: dto.Notes);
                        break;
                    default:
                        workOrder.UpdateStatus(dto.Status, dto.Notes);
                        break;
                }

                var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
                var log = WorkOrderActivityLog.CreateStatusChange(
                    workOrder.Id,
                    previousStatus,
                    workOrder.Status,
                    userId,
                    userName,
                    dto.Notes);
                workOrder.AddActivityLog(log);

                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Status updated", Status = workOrder.Status.ToString() });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        });

        // Add parts
        group.MapPost("/work-orders/{id:guid}/parts", async (Guid id, [FromBody] AddPartsDto dto, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.Include(w => w.Parts).FirstOrDefaultAsync(w => w.Id == id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            // Check authorization
            var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
            var isManager = roles.Contains("Manager") || roles.Contains("Admin");
            if (!isManager && workOrder.TechnicianId != userId)
                return Results.Forbid();

            try
            {
                var part = new WorkOrderPart(
                    workOrder.Id,
                    dto.InventoryItemId,
                    dto.PartName,
                    dto.Quantity,
                    dto.UnitPrice,
                    dto.PartNumber);

                workOrder.AddPart(part);

                var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
                var log = WorkOrderActivityLog.CreatePartAdded(
                    workOrder.Id,
                    dto.PartName,
                    dto.Quantity,
                    userId,
                    userName);
                workOrder.AddActivityLog(log);

                await db.SaveChangesAsync();
                return Results.Ok(new
                {
                    Message = "Part added",
                    PartId = part.Id,
                    TotalPartsCost = workOrder.PartsCost
                });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        });

        // Remove part
        group.MapDelete("/work-orders/{id:guid}/parts/{partId:guid}", async (Guid id, Guid partId, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.Include(w => w.Parts).FirstOrDefaultAsync(w => w.Id == id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            // Check authorization
            var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
            var isManager = roles.Contains("Manager") || roles.Contains("Admin");
            if (!isManager && workOrder.TechnicianId != userId)
                return Results.Forbid();

            workOrder.RemovePart(partId);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Part removed", TotalPartsCost = workOrder.PartsCost });
        });

        // Add note/log
        group.MapPost("/work-orders/{id:guid}/log", async (Guid id, [FromBody] AddLogDto dto, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            // Check authorization
            var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
            var isManager = roles.Contains("Manager") || roles.Contains("Admin");
            if (!isManager && workOrder.TechnicianId != userId)
                return Results.Forbid();

            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
            workOrder.AddNote(dto.Note, userId, userName);

            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Log added" });
        });
    }
}

// DTOs
public record DeclineReasonDto(string Reason);
public record UpdateStatusDto(WorkOrderStatus Status, string? Notes);
public record AddPartsDto(
    Guid InventoryItemId,
    string PartName,
    int Quantity,
    decimal UnitPrice,
    string? PartNumber
);
public record AddLogDto(string Note);
