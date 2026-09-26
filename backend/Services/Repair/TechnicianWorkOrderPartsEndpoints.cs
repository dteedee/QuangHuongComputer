using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;
using Repair.Services;

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
        // Add parts - technician (own work order) or Manager/Admin. W2-13: reserves
        // real stock via IStockLedger BEFORE the part is persisted - a reservation
        // failure (item missing / insufficient available quantity) must leave the
        // work order untouched, so the ledger call runs first and any exception
        // aborts before AddPart/SaveChanges.
        group.MapPost("/work-orders/{id:guid}/parts", async (Guid id, [FromBody] AddPartsDto dto, RepairDbContext db, IRepairStockService stock, ClaimsPrincipal user) =>
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
                var performedBy = TechnicianAccess.GetUserName(user);
                // Tạo part TRƯỚC (validate đầu vào), giữ hàng SAU — lỗi validate không để lại giữ hàng.
                var part = new WorkOrderPart(
                    workOrder.Id,
                    dto.InventoryItemId,
                    dto.PartName,
                    dto.Quantity,
                    dto.UnitPrice,
                    dto.PartNumber,
                    dto.SerialNumber,
                    dto.UnitCost);

                // Linh kiện mua ngoài (không có InventoryItemId) KHÔNG giữ hàng trong kho.
                if (dto.InventoryItemId is Guid inventoryItemId)
                    await stock.ReserveAsync(inventoryItemId, dto.Quantity, workOrder.Id, performedBy);

                workOrder.AddPart(part);
                db.WorkOrderParts.Add(part); // stage tường minh — khoá Guid sinh sẵn (xem WorkOrder.AddActivityLog)

                var log = WorkOrderActivityLog.CreatePartAdded(
                    workOrder.Id, dto.PartName, dto.Quantity, userId, performedBy);
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
            catch (InvalidOperationException)
            {
                // Not enough available stock, or the item does not exist - nothing
                // was reserved (IStockLedger only mutates on success), nothing to roll back.
                return Results.BadRequest(new { error = "Không đủ hàng tồn kho cho linh kiện này." });
            }
            catch (ArgumentException)
            {
                return Results.BadRequest(new { error = "Số lượng phải lớn hơn 0 và đơn giá không được âm." });
            }
        });

        // Remove part - technician (own work order) or Manager/Admin. W2-13: releases
        // the matching reservation before the row disappears, so a removed part
        // never leaves stock reserved forever.
        group.MapDelete("/work-orders/{id:guid}/parts/{partId:guid}", async (Guid id, Guid partId, RepairDbContext db, IRepairStockService stock, ClaimsPrincipal user) =>
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

            var removedPart = workOrder.Parts.FirstOrDefault(p => p.Id == partId);
            if (removedPart == null)
                return Results.NotFound(new { Error = "Part not found" });

            // Only reserved (not yet committed at Completed) - a part on a Completed
            // work order is already a real stock-out and must not be released here.
            if (workOrder.Status != WorkOrderStatus.Completed && removedPart.InventoryItemId is Guid inventoryItemId)
            {
                await stock.ReleaseAsync(inventoryItemId, removedPart.Quantity, workOrder.Id, TechnicianAccess.GetUserName(user));
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
/// <summary><see cref="InventoryItemId"/> = null ⇒ linh kiện mua ngoài: bắt buộc <see cref="UnitCost"/>, không chạm kho.</summary>
public record AddPartsDto(
    Guid? InventoryItemId,
    string PartName,
    int Quantity,
    decimal UnitPrice,
    string? PartNumber,
    string? SerialNumber = null,
    decimal? UnitCost = null
);
public record AddLogDto(string Note);
