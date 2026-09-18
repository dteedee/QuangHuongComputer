using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair;

/// <summary>
/// Status-transition endpoints under /api/repair/tech: accept/decline an
/// assignment and update status (diagnosed/in-progress/on-hold/completed).
/// Split out of TechnicianEndpoints.cs (W0-11).
///
/// Every handler here stages its WorkOrderActivityLog on the DbSet explicitly
/// (`db.WorkOrderActivityLogs.Add(log)`) in addition to `workOrder.AddActivityLog`
/// - see the concurrency note on WorkOrder.AddActivityLog. Dropping that line
/// reintroduces the "expected to affect 1 row(s), but actually affected 0"
/// DbUpdateConcurrencyException reproduced against :5050 2026-09-18.
/// </summary>
public static class TechnicianWorkOrderActionEndpoints
{
    public static void MapTechnicianWorkOrderActionEndpoints(this RouteGroupBuilder group)
    {
        // Accept assignment - technician only, no manager bypass (original behaviour).
        group.MapPut("/work-orders/{id:guid}/accept", async (Guid id, RepairDbContext db, ClaimsPrincipal user) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            var technician = await TechnicianAccess.ResolveTechnicianAsync(db, userId);
            if (technician == null || workOrder.TechnicianId != technician.Id)
                return Results.Forbid();

            try
            {
                workOrder.AcceptAssignment();

                var log = WorkOrderActivityLog.CreateStatusChange(
                    workOrder.Id, workOrder.Status, workOrder.Status,
                    userId, TechnicianAccess.GetUserName(user), "Assignment accepted by technician");
                workOrder.AddActivityLog(log);
                db.WorkOrderActivityLogs.Add(log);

                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Assignment accepted", Status = workOrder.Status.ToString() });
            }
            catch (InvalidOperationException)
            {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        });

        // Decline assignment - technician only.
        group.MapPut("/work-orders/{id:guid}/decline", async (Guid id, [FromBody] DeclineReasonDto dto, RepairDbContext db, ClaimsPrincipal user) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            var technician = await TechnicianAccess.ResolveTechnicianAsync(db, userId);
            if (technician == null || workOrder.TechnicianId != technician.Id)
                return Results.Forbid();

            try
            {
                var previousStatus = workOrder.Status;
                workOrder.DeclineAssignment();

                var log = WorkOrderActivityLog.CreateStatusChange(
                    workOrder.Id, previousStatus, workOrder.Status,
                    userId, TechnicianAccess.GetUserName(user), $"Assignment declined: {dto.Reason}");
                workOrder.AddActivityLog(log);
                db.WorkOrderActivityLogs.Add(log);

                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Assignment declined", Status = workOrder.Status.ToString() });
            }
            catch (InvalidOperationException)
            {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        });

        // Update status - technician (own work order) or Manager/Admin.
        group.MapPut("/work-orders/{id:guid}/status", async (Guid id, [FromBody] UpdateStatusDto dto, RepairDbContext db, ClaimsPrincipal user) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            var isManager = TechnicianAccess.IsManager(user);
            if (!isManager)
            {
                var technician = await TechnicianAccess.ResolveTechnicianAsync(db, userId);
                if (technician == null || workOrder.TechnicianId != technician.Id)
                    return Results.Forbid();
            }

            try
            {
                var previousStatus = workOrder.Status;

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

                var log = WorkOrderActivityLog.CreateStatusChange(
                    workOrder.Id, previousStatus, workOrder.Status,
                    userId, TechnicianAccess.GetUserName(user), dto.Notes);
                workOrder.AddActivityLog(log);
                db.WorkOrderActivityLogs.Add(log);

                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Status updated", Status = workOrder.Status.ToString() });
            }
            catch (InvalidOperationException)
            {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        });
    }
}

// DTOs shared by the technician action endpoints.
public record DeclineReasonDto(string Reason);
public record UpdateStatusDto(WorkOrderStatus Status, string? Notes);
