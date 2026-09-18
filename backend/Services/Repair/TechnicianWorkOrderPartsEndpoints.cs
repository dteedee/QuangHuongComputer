using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair;

/// <summary>
/// Parts and free-text log endpoints under /api/repair/tech. Split out of
/// TechnicianEndpoints.cs (W0-11). See the concurrency note on
/// WorkOrder.AddActivityLog - every new WorkOrderActivityLog here is also
/// staged explicitly via `db.WorkOrderActivityLogs.Add(log)`.
/// </summary>
public static class TechnicianWorkOrderPartsEndpoints
{
    public static void MapTechnicianWorkOrderPartsEndpoints(this RouteGroupBuilder group)
    {
        // Add parts - technician (own work order) or Manager/Admin.
        group.MapPost("/work-orders/{id:guid}/parts", async (Guid id, [FromBody] AddPartsDto dto, RepairDbContext db, ClaimsPrincipal user) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.Include(w => w.Parts).FirstOrDefaultAsync(w => w.Id == id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            if (!TechnicianAccess.IsManager(user))
            {
                var technician = await TechnicianAccess.ResolveTechnicianAsync(db, userId);
                if (technician == null || workOrder.TechnicianId != technician.Id)
                    return Results.Forbid();
            }

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

                var log = WorkOrderActivityLog.CreatePartAdded(
                    workOrder.Id, dto.PartName, dto.Quantity, userId, TechnicianAccess.GetUserName(user));
                workOrder.AddActivityLog(log);
                db.WorkOrderActivityLogs.Add(log);

                await db.SaveChangesAsync();
                return Results.Ok(new
                {
                    Message = "Part added",
                    PartId = part.Id,
                    TotalPartsCost = workOrder.PartsCost
                });
            }
            catch (Exception)
            {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        });

        // Remove part - technician (own work order) or Manager/Admin.
        group.MapDelete("/work-orders/{id:guid}/parts/{partId:guid}", async (Guid id, Guid partId, RepairDbContext db, ClaimsPrincipal user) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.Include(w => w.Parts).FirstOrDefaultAsync(w => w.Id == id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            if (!TechnicianAccess.IsManager(user))
            {
                var technician = await TechnicianAccess.ResolveTechnicianAsync(db, userId);
                if (technician == null || workOrder.TechnicianId != technician.Id)
                    return Results.Forbid();
            }

            workOrder.RemovePart(partId);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Part removed", TotalPartsCost = workOrder.PartsCost });
        });

        // Add note/log - technician (own work order) or Manager/Admin.
        group.MapPost("/work-orders/{id:guid}/log", async (Guid id, [FromBody] AddLogDto dto, RepairDbContext db, ClaimsPrincipal user) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            if (!TechnicianAccess.IsManager(user))
            {
                var technician = await TechnicianAccess.ResolveTechnicianAsync(db, userId);
                if (technician == null || workOrder.TechnicianId != technician.Id)
                    return Results.Forbid();
            }

            var log = workOrder.AddNote(dto.Note, userId, TechnicianAccess.GetUserName(user));
            db.WorkOrderActivityLogs.Add(log);

            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Log added" });
        });
    }
}

// DTOs shared by the technician parts/log endpoints.
public record AddPartsDto(
    Guid InventoryItemId,
    string PartName,
    int Quantity,
    decimal UnitPrice,
    string? PartNumber
);
public record AddLogDto(string Note);
