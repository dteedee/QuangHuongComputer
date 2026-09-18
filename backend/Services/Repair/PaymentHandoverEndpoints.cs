using System.Security.Claims;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair;

/// <summary>
/// W2-13: the tail of the repair lifecycle that used to stop at Completed -
/// ReadyForPickup -> Paid -> Delivered. Payment here just records that money
/// changed hands (POS/cashier collects and calls this); it is not a payment
/// gateway integration.
/// </summary>
public static class PaymentHandoverEndpoints
{
    public static void MapPaymentHandoverEndpoints(this IEndpointRouteBuilder app)
    {
        var adminGroup = app.MapGroup("/api/repair/admin").RequireModulePermissions(PermissionModules.Repair);

        adminGroup.MapPut("/work-orders/{id:guid}/ready-for-pickup", async (Guid id, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            try
            {
                workOrder.MarkReadyForPickup();
                var log = workOrder.AddNote("Marked ready for pickup", null, TechnicianAccess.GetUserName(user));
                db.WorkOrderActivityLogs.Add(log);
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Ready for pickup", Status = workOrder.Status.ToString() });
            }
            catch (InvalidOperationException)
            {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        });

        adminGroup.MapPut("/work-orders/{id:guid}/pay", async (Guid id, RecordPaymentDto dto, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            try
            {
                workOrder.RecordPayment(dto.PaymentReference);
                var log = workOrder.AddNote(
                    $"Payment recorded" + (string.IsNullOrWhiteSpace(dto.PaymentReference) ? "" : $" ({dto.PaymentReference})"),
                    null, TechnicianAccess.GetUserName(user));
                db.WorkOrderActivityLogs.Add(log);
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Payment recorded", Status = workOrder.Status.ToString(), workOrder.TotalCost });
            }
            catch (InvalidOperationException)
            {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        });

        adminGroup.MapPut("/work-orders/{id:guid}/handover", async (Guid id, HandoverDto dto, RepairDbContext db, ClaimsPrincipal user) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var staffId))
                return Results.Unauthorized();

            var workOrder = await db.WorkOrders.FindAsync(id);
            if (workOrder == null)
                return Results.NotFound(new { Error = "Work order not found" });

            try
            {
                workOrder.RecordHandover(dto.ReceivedByName, staffId);
                var log = workOrder.AddNote($"Handed over to {dto.ReceivedByName}", staffId, TechnicianAccess.GetUserName(user));
                db.WorkOrderActivityLogs.Add(log);
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Handover recorded", Status = workOrder.Status.ToString() });
            }
            catch (InvalidOperationException)
            {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
            catch (ArgumentException)
            {
                return Results.BadRequest(new { error = "Tên người nhận là bắt buộc." });
            }
        });
    }
}

public record RecordPaymentDto(string? PaymentReference);
public record HandoverDto(string ReceivedByName);
