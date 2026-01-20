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

public static class QuoteEndpoints
{
    public static void MapQuoteEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/repair").RequireAuthorization();

        // Technician: Create quote for work order
        group.MapPost("/work-orders/{id:guid}/quote", async (
            Guid id,
            [FromBody] CreateQuoteDto dto,
            RepairDbContext db,
            ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders
                .Include(w => w.Quotes)
                .Include(w => w.Parts)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            // Check authorization
            var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
            var isManager = roles.Contains("Manager") || roles.Contains("Admin");
            var isTechnician = roles.Contains("TechnicianInShop") || roles.Contains("TechnicianOnSite");

            if (!isManager && (!isTechnician || workOrder.TechnicianId != userId))
                return Results.Forbid();

            try
            {
                var quote = new RepairQuote(
                    workOrder.Id,
                    dto.PartsCost,
                    dto.LaborCost,
                    dto.ServiceFee,
                    dto.EstimatedHours,
                    dto.HourlyRate,
                    dto.Description,
                    dto.Notes
                );

                workOrder.CreateQuote(quote);

                var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
                var log = WorkOrderActivityLog.CreateQuoteGenerated(
                    workOrder.Id,
                    quote.QuoteNumber,
                    quote.TotalCost,
                    userId,
                    userName);
                workOrder.AddActivityLog(log);

                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    Message = "Quote created",
                    QuoteId = quote.Id,
                    QuoteNumber = quote.QuoteNumber,
                    TotalCost = quote.TotalCost,
                    ValidUntil = quote.ValidUntil
                });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        })
        .RequireAuthorization(policy => policy.RequireRole("TechnicianInShop", "TechnicianOnSite", "Admin", "Manager"));

        // Customer: Get quote details
        group.MapGet("/quotes/{id:guid}", async (Guid id, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var quote = await db.RepairQuotes
                .Include(q => q.WorkOrder)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quote == null)
                return Results.NotFound(new { Error = "Quote not found" });

            // Check if user is customer or staff
            var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
            var isStaff = roles.Contains("Admin") || roles.Contains("Manager") ||
                         roles.Contains("TechnicianInShop") || roles.Contains("TechnicianOnSite");

            if (!isStaff && quote.WorkOrder!.CustomerId != userId)
                return Results.Forbid();

            // Check if quote is expired and mark it
            if (quote.IsExpired() && quote.Status == QuoteStatus.Pending)
            {
                quote.MarkAsExpired();
                await db.SaveChangesAsync();
            }

            return Results.Ok(new
            {
                quote.Id,
                quote.QuoteNumber,
                quote.WorkOrderId,
                quote.PartsCost,
                quote.LaborCost,
                quote.ServiceFee,
                quote.TotalCost,
                quote.EstimatedHours,
                quote.HourlyRate,
                quote.Description,
                quote.Notes,
                quote.Status,
                quote.ValidUntil,
                quote.ApprovedAt,
                quote.RejectedAt,
                quote.RejectionReason,
                quote.CreatedAt,
                IsExpired = quote.IsExpired()
            });
        });

        // Customer: Approve quote
        group.MapPut("/quotes/{id:guid}/approve", async (Guid id, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var quote = await db.RepairQuotes
                .Include(q => q.WorkOrder)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quote == null)
                return Results.NotFound(new { Error = "Quote not found" });

            // Check if user is the customer
            if (quote.WorkOrder!.CustomerId != userId)
                return Results.Forbid();

            try
            {
                quote.Approve();
                quote.WorkOrder.ApproveQuote();

                var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Customer";
                var log = WorkOrderActivityLog.CreateStatusChange(
                    quote.WorkOrder.Id,
                    WorkOrderStatus.AwaitingApproval,
                    WorkOrderStatus.Approved,
                    userId,
                    userName,
                    $"Quote {quote.QuoteNumber} approved by customer");
                quote.WorkOrder.AddActivityLog(log);

                await db.SaveChangesAsync();
                return Results.Ok(new
                {
                    Message = "Quote approved",
                    QuoteStatus = quote.Status.ToString(),
                    WorkOrderStatus = quote.WorkOrder.Status.ToString()
                });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        });

        // Customer: Reject quote
        group.MapPut("/quotes/{id:guid}/reject", async (
            Guid id,
            [FromBody] RejectQuoteDto dto,
            RepairDbContext db,
            ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var quote = await db.RepairQuotes
                .Include(q => q.WorkOrder)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quote == null)
                return Results.NotFound(new { Error = "Quote not found" });

            // Check if user is the customer
            if (quote.WorkOrder!.CustomerId != userId)
                return Results.Forbid();

            try
            {
                quote.Reject(dto.Reason);
                quote.WorkOrder.RejectQuote();

                var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Customer";
                var log = WorkOrderActivityLog.CreateStatusChange(
                    quote.WorkOrder.Id,
                    WorkOrderStatus.AwaitingApproval,
                    WorkOrderStatus.Rejected,
                    userId,
                    userName,
                    $"Quote {quote.QuoteNumber} rejected: {dto.Reason}");
                quote.WorkOrder.AddActivityLog(log);

                await db.SaveChangesAsync();
                return Results.Ok(new
                {
                    Message = "Quote rejected",
                    QuoteStatus = quote.Status.ToString(),
                    WorkOrderStatus = quote.WorkOrder.Status.ToString()
                });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        });

        // Technician: Update quote (only if pending)
        group.MapPut("/quotes/{id:guid}", async (
            Guid id,
            [FromBody] UpdateQuoteDto dto,
            RepairDbContext db,
            ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var quote = await db.RepairQuotes
                .Include(q => q.WorkOrder)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quote == null)
                return Results.NotFound(new { Error = "Quote not found" });

            // Check authorization
            var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
            var isManager = roles.Contains("Manager") || roles.Contains("Admin");
            var isTechnician = roles.Contains("TechnicianInShop") || roles.Contains("TechnicianOnSite");

            if (!isManager && (!isTechnician || quote.WorkOrder!.TechnicianId != userId))
                return Results.Forbid();

            try
            {
                quote.UpdateCosts(dto.PartsCost, dto.LaborCost, dto.ServiceFee);
                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    Message = "Quote updated",
                    TotalCost = quote.TotalCost
                });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        })
        .RequireAuthorization(policy => policy.RequireRole("TechnicianInShop", "TechnicianOnSite", "Admin", "Manager"));

        // Mark quote as awaiting approval
        group.MapPut("/quotes/{id:guid}/await-approval", async (Guid id, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var quote = await db.RepairQuotes
                .Include(q => q.WorkOrder)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quote == null)
                return Results.NotFound(new { Error = "Quote not found" });

            // Check authorization
            var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
            var isManager = roles.Contains("Manager") || roles.Contains("Admin");
            var isTechnician = roles.Contains("TechnicianInShop") || roles.Contains("TechnicianOnSite");

            if (!isManager && (!isTechnician || quote.WorkOrder!.TechnicianId != userId))
                return Results.Forbid();

            try
            {
                quote.WorkOrder!.MarkAwaitingApproval();

                var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
                var log = WorkOrderActivityLog.CreateStatusChange(
                    quote.WorkOrder.Id,
                    WorkOrderStatus.Quoted,
                    WorkOrderStatus.AwaitingApproval,
                    userId,
                    userName,
                    "Quote sent to customer for approval");
                quote.WorkOrder.AddActivityLog(log);

                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    Message = "Quote sent for customer approval",
                    WorkOrderStatus = quote.WorkOrder.Status.ToString()
                });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        })
        .RequireAuthorization(policy => policy.RequireRole("TechnicianInShop", "TechnicianOnSite", "Admin", "Manager"));
    }
}

// DTOs
public record CreateQuoteDto(
    decimal PartsCost,
    decimal LaborCost,
    decimal ServiceFee,
    decimal EstimatedHours,
    decimal HourlyRate,
    string? Description,
    string? Notes
);

public record UpdateQuoteDto(
    decimal? PartsCost,
    decimal? LaborCost,
    decimal? ServiceFee
);

public record RejectQuoteDto(string Reason);
