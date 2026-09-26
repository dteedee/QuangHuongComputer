using BuildingBlocks.Security;
using BuildingBlocks.Configuration;
using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;
using Repair.Services;
using Microsoft.AspNetCore.Authorization;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace Repair;

public static class RepairEndpoints
{
    public static void MapRepairEndpoints(this IEndpointRouteBuilder app)
    {
        // Map all repair-related endpoints
        app.MapBookingEndpoints();
        app.MapTechnicianEndpoints();
        app.MapQuoteEndpoints();
        app.MapPaymentHandoverEndpoints();
        app.MapPublicTrackingEndpoints();
        app.MapServiceTypeEndpoints();
        app.MapWorkOrderIntakeEndpoints();

        // W1-10: nhánh khách hàng ("đơn sửa chữa của tôi") -> chỉ cần đăng nhập;
        // handler lọc theo userId. Nhóm /admin và các endpoint kỹ thuật viên có quyền riêng.
        var group = app.MapGroup("/api/repair").RequireAuthorization(SecurityPolicies.Authenticated);

        // Customer Endpoints
        group.MapPost("/work-orders", async ([FromBody] CreateWorkOrderDto model, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Results.Unauthorized();

            // Basic validation
            if (string.IsNullOrEmpty(model.DeviceModel) || string.IsNullOrEmpty(model.SerialNumber) || string.IsNullOrEmpty(model.Description))
                return Results.BadRequest(new { Error = "All fields are required" });

            var workOrder = new WorkOrder(userId, model.DeviceModel, model.SerialNumber, model.Description);
            
            db.WorkOrders.Add(workOrder);
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                workOrder.Id,
                workOrder.TicketNumber,
                workOrder.Status,
                workOrder.Description,
                Message = "Work order created successfully"
            });
        });

        group.MapGet("/work-orders", async (RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Results.Unauthorized();

            var workOrders = await db.WorkOrders
                .Where(w => w.CustomerId == userId)
                .OrderByDescending(w => w.CreatedAt)
                .Select(w => new
                {
                    w.Id,
                    w.TicketNumber,
                    w.DeviceModel,
                    w.SerialNumber,
                    w.Description,
                    w.Status,
                    w.EstimatedCost,
                    TotalCost = w.PartsCost + w.LaborCost,
                    w.CreatedAt,
                    w.StartedAt,
                    w.FinishedAt
                })
                .ToListAsync();

            return Results.Ok(workOrders);
        });

        group.MapGet("/work-orders/{id:guid}", async (Guid id, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.FindAsync(id);

            if (workOrder == null) 
                return Results.NotFound(new { Error = "Work order not found" });
            
            if (workOrder.CustomerId != userId) 
                return Results.Forbid();

            return Results.Ok(new
            {
                workOrder.Id,
                workOrder.TicketNumber,
                workOrder.DeviceModel,
                workOrder.SerialNumber,
                workOrder.Description,
                workOrder.Status,
                workOrder.TechnicianId,
                workOrder.EstimatedCost,
                workOrder.ActualCost,
                workOrder.PartsCost,
                workOrder.LaborCost,
                workOrder.TotalCost,
                workOrder.TechnicalNotes,
                workOrder.CreatedAt,
                workOrder.StartedAt,
                workOrder.FinishedAt
            });
        });

        // Legacy repair requests endpoints (for backward compatibility)
        group.MapPost("/requests", async ([FromBody] CreateRepairDto model, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Results.Unauthorized();

            var repair = new RepairRequest(
                userId,
                model.DeviceModel,
                model.SerialNumber,
                model.IssueDescription
            );

            db.RepairRequests.Add(repair);
            await db.SaveChangesAsync();

            return Results.Ok(repair);
        });

        group.MapGet("/requests", async (RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Results.Unauthorized();

            var repairs = await db.RepairRequests
                .Where(r => r.CustomerId == userId)
                .OrderByDescending(r => r.RequestDate)
                .ToListAsync();

            return Results.Ok(repairs);
        });

        // Admin Endpoints (Admin and Manager can access)
        // W1-10: tạo từ `app` chứ không từ `group` — group cha đã mang policy tường minh
        // (Policy.Authenticated), mà RequireModulePermissions bỏ qua endpoint đã có policy.
        // Route sinh ra vẫn là /api/repair/admin/...
        var adminGroup = app.MapGroup("/api/repair/admin").RequireModulePermissions(PermissionModules.Repair);

        adminGroup.MapGet("/work-orders", async (RepairDbContext db, int page = 1, int pageSize = 20, string? status = null, string? priority = null) =>
        {
            var query = db.WorkOrders.AsQueryable();

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<WorkOrderStatus>(status, true, out var statusEnum))
            {
                query = query.Where(w => w.Status == statusEnum);
            }

            if (!string.IsNullOrEmpty(priority) && Enum.TryParse<WorkOrderPriority>(priority, true, out var priorityEnum))
            {
                query = query.Where(w => w.Priority == priorityEnum);
            }

            var total = await query.CountAsync();
            var workOrders = await query
                .OrderByDescending(w => w.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(w => new
                {
                    w.Id,
                    w.TicketNumber,
                    w.CustomerId,
                    w.DeviceModel,
                    w.Description,
                    w.Status,
                    w.Priority,
                    w.TechnicianId,
                    w.EstimatedCost,
                    TotalCost = w.PartsCost + w.LaborCost,
                    w.CreatedAt,
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

        adminGroup.MapGet("/work-orders/{id:guid}", async (Guid id, RepairDbContext db) =>
        {
            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            return Results.Ok(workOrder);
        });

        // W0-11: also handles RE-assignment (workOrder already Assigned to someone
        // else - domain guard in WorkOrder.AssignTechnician now allows it) and
        // logs the change. The log must be staged explicitly on the DbSet - see
        // the concurrency note on WorkOrder.AddActivityLog.
        adminGroup.MapPut("/work-orders/{id:guid}/assign", async (Guid id, AssignTechnicianDto dto, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            var technician = await db.Technicians.FindAsync(dto.TechnicianId);
            if (technician == null)
                return Results.BadRequest(new { Error = "Technician not found" });

            try
            {
                var previousStatus = workOrder.Status;
                var previousTechnicianId = workOrder.TechnicianId;
                workOrder.AssignTechnician(dto.TechnicianId);

                var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
                Guid.TryParse(userIdStr, out var performedBy);
                var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
                var description = previousTechnicianId.HasValue && previousTechnicianId != dto.TechnicianId
                    ? $"Re-assigned to {technician.Name}"
                    : $"Assigned to {technician.Name}";
                var log = WorkOrderActivityLog.CreateStatusChange(
                    workOrder.Id, previousStatus, workOrder.Status, performedBy, userName, description);
                workOrder.AddActivityLog(log);
                db.WorkOrderActivityLogs.Add(log);

                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Technician assigned successfully", Status = workOrder.Status.ToString() });
            }
            catch (InvalidOperationException)
            {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        });

        adminGroup.MapPut("/work-orders/{id:guid}/start", async (Guid id, RepairDbContext db) =>
        {
            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            try
            {
                workOrder.StartRepair();
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Repair started", Status = workOrder.Status.ToString() });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        });

        // W2-13: completing a repair commits every reserved part to a real stock-out
        // (StockMovementReason.RepairPart) BEFORE the work order flips to Completed,
        // so a ledger failure (e.g. concurrent over-commit) blocks completion instead
        // of leaving the work order Completed with stock still only reserved.
        adminGroup.MapPut("/work-orders/{id:guid}/complete", async (Guid id, CompleteRepairDto dto, RepairDbContext db, IRepairStockService stock, IPublishEndpoint bus, ClaimsPrincipal user) =>
        {
            var workOrder = await db.WorkOrders.Include(w => w.Parts).FirstOrDefaultAsync(w => w.Id == id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            try
            {
                var performedBy = TechnicianAccess.GetUserName(user);
                // Linh kiện mua ngoài (InventoryItemId = null) không bao giờ chạm sổ kho.
                foreach (var part in workOrder.Parts.Where(p => p.InventoryItemId.HasValue))
                {
                    await stock.CommitAsync(part.InventoryItemId!.Value, part.Quantity, workOrder.Id, performedBy);
                }

                workOrder.CompleteRepair(dto.PartsCost, dto.LaborCost, dto.Notes);
                await db.SaveChangesAsync();

                // docs/integration-events.md: RepairCompletedEvent was "contract only" -
                // wave 2 wires the publish. BookingId falls back to the work order's own
                // id for walk-in intake (no ServiceBooking behind it).
                await bus.Publish(new RepairCompletedEvent(
                    workOrder.ServiceBookingId ?? workOrder.Id,
                    workOrder.CustomerId,
                    workOrder.DeviceModel,
                    workOrder.TotalCost,
                    DateTime.UtcNow));

                return Results.Ok(new
                {
                    Message = "Repair completed",
                    Status = workOrder.Status.ToString(),
                    TotalCost = workOrder.TotalCost
                });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        });

        // W2-13: cancelling releases every part still only reserved. A part on an
        // already-Completed work order was committed (real stock-out), not reserved,
        // so cancelling a Completed order never touches the ledger here.
        adminGroup.MapPut("/work-orders/{id:guid}/cancel", async (Guid id, CancelWorkOrderDto dto, RepairDbContext db, IRepairStockService stock, IPublishEndpoint bus, ClaimsPrincipal user) =>
        {
            var workOrder = await db.WorkOrders.Include(w => w.Parts).FirstOrDefaultAsync(w => w.Id == id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            if (workOrder.Status != WorkOrderStatus.Completed)
            {
                var performedBy = TechnicianAccess.GetUserName(user);
                foreach (var part in workOrder.Parts.Where(p => p.InventoryItemId.HasValue))
                {
                    await stock.ReleaseAsync(part.InventoryItemId!.Value, part.Quantity, workOrder.Id, performedBy);
                }
            }

            workOrder.Cancel(dto.Reason);
            await db.SaveChangesAsync();

            // Huỷ SAU khi đã thu tiền -> HR huỷ/thu hồi hoa hồng kỹ thuật của phiếu này.
            if (workOrder.PaidAt.HasValue)
                await bus.Publish(new RepairWorkOrderSettlementChangedEvent(workOrder.Id, DateTime.UtcNow));

            return Results.Ok(new { Message = "Work order cancelled", Status = workOrder.Status.ToString() });
        });

        adminGroup.MapGet("/stats", async (RepairDbContext db) =>
        {
            var today = DateTime.UtcNow.Date;
            var thisMonth = new DateTime(today.Year, today.Month, 1);

            var stats = new
            {
                TotalWorkOrders = await db.WorkOrders.CountAsync(),
                TodayWorkOrders = await db.WorkOrders.CountAsync(w => w.CreatedAt >= today),
                MonthWorkOrders = await db.WorkOrders.CountAsync(w => w.CreatedAt >= thisMonth),
                PendingWorkOrders = await db.WorkOrders.CountAsync(w => w.Status == WorkOrderStatus.Pending),
                InProgressWorkOrders = await db.WorkOrders.CountAsync(w => w.Status == WorkOrderStatus.InProgress),
                CompletedWorkOrders = await db.WorkOrders.CountAsync(w => w.Status == WorkOrderStatus.Completed),
                TotalRevenue = await db.WorkOrders
                    .Where(w => w.Status == WorkOrderStatus.Completed)
                    .SumAsync(w => (decimal?)(w.PartsCost + w.LaborCost)) ?? 0
            };

            return Results.Ok(stats);
        });

        // Technician management
        adminGroup.MapGet("/technicians", async (RepairDbContext db) =>
        {
            var technicians = await db.Technicians
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    t.Specialty,
                    t.HourlyRate,
                    t.IsAvailable,
                    ActiveWorkOrders = db.WorkOrders.Count(w => w.TechnicianId == t.Id && w.Status == WorkOrderStatus.InProgress)
                })
                .ToListAsync();

            return Results.Ok(technicians);
        });

        adminGroup.MapPost("/technicians", async (CreateTechnicianDto dto, RepairDbContext db, IAppSettings settings) =>
        {
            // D08/IR#54: falls back to the configured default labour rate (VND/hour),
            // never a hardcoded 50.0m, when the caller does not specify one.
            var hourlyRate = dto.HourlyRate ?? settings.GetDecimal("Repair.DefaultLaborRateVnd", 100000m);
            var technician = new Technician(dto.Name, dto.Specialty, hourlyRate);
            db.Technicians.Add(technician);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Technician created", TechnicianId = technician.Id });
        });

        // W2-13: technician CRUD - update skills/rate/active + deactivate.
        adminGroup.MapPut("/technicians/{id:guid}", async (Guid id, UpdateTechnicianDto dto, RepairDbContext db) =>
        {
            var technician = await db.Technicians.FindAsync(id);
            if (technician == null)
                return Results.NotFound(new { Error = "Technician not found" });

            technician.UpdateProfile(dto.Name, dto.Specialty, dto.HourlyRate);
            if (dto.IsAvailable.HasValue)
                technician.UpdateAvailability(dto.IsAvailable.Value);

            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Technician updated" });
        });
    }
}

// DTOs
public record CreateWorkOrderDto(string DeviceModel, string SerialNumber, string Description);
public record CreateRepairDto(string DeviceModel, string SerialNumber, string IssueDescription);
public record AssignTechnicianDto(Guid TechnicianId);
public record CompleteRepairDto(decimal PartsCost, decimal LaborCost, string? Notes);
public record CancelWorkOrderDto(string Reason);
public record CreateTechnicianDto(string Name, string Specialty, decimal? HourlyRate = null);
public record UpdateTechnicianDto(string Name, string Specialty, decimal HourlyRate, bool? IsAvailable = null);
