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

public static class RepairEndpoints
{
    public static void MapRepairEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/repair").RequireAuthorization();

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

        // Admin Endpoints
        var adminGroup = group.MapGroup("/admin").RequireAuthorization(policy => policy.RequireRole("Admin"));

        adminGroup.MapGet("/work-orders", async (RepairDbContext db, int page = 1, int pageSize = 20, string? status = null) =>
        {
            var query = db.WorkOrders.AsQueryable();

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<WorkOrderStatus>(status, true, out var statusEnum))
            {
                query = query.Where(w => w.Status == statusEnum);
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
                    w.Description,
                    w.Status,
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

        adminGroup.MapPut("/work-orders/{id:guid}/assign", async (Guid id, AssignTechnicianDto dto, RepairDbContext db) =>
        {
            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            workOrder.AssignTechnician(dto.TechnicianId);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Technician assigned successfully", Status = workOrder.Status.ToString() });
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
                return Results.BadRequest(new { Error = ex.Message });
            }
        });

        adminGroup.MapPut("/work-orders/{id:guid}/complete", async (Guid id, CompleteRepairDto dto, RepairDbContext db) =>
        {
            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            try
            {
                workOrder.CompleteRepair(dto.PartsCost, dto.LaborCost, dto.Notes);
                await db.SaveChangesAsync();
                return Results.Ok(new 
                { 
                    Message = "Repair completed", 
                    Status = workOrder.Status.ToString(),
                    TotalCost = workOrder.TotalCost
                });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        });

        adminGroup.MapPut("/work-orders/{id:guid}/cancel", async (Guid id, CancelWorkOrderDto dto, RepairDbContext db) =>
        {
            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            workOrder.Cancel(dto.Reason);
            await db.SaveChangesAsync();

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

        adminGroup.MapPost("/technicians", async (CreateTechnicianDto dto, RepairDbContext db) =>
        {
            var technician = new Technician(dto.Name, dto.Specialty, dto.HourlyRate);
            db.Technicians.Add(technician);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Technician created", TechnicianId = technician.Id });
        });
    }
}

// DTOs
public record CreateWorkOrderDto(string DeviceModel, string SerialNumber, string Description);
public record CreateRepairDto(string DeviceModel, string SerialNumber, string IssueDescription);
public record AssignTechnicianDto(Guid TechnicianId);
public record CompleteRepairDto(decimal PartsCost, decimal LaborCost, string? Notes);
public record CancelWorkOrderDto(string Reason);
public record CreateTechnicianDto(string Name, string Specialty, decimal HourlyRate = 50.0m);
