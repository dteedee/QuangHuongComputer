using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;

namespace InventoryModule;

/// <summary>
/// Endpoint đề nghị mua (Purchase Requisition).
/// Nhân viên tạo → quản lý duyệt → chuyển thành PO gán NCC cụ thể.
/// AutoReorderService sinh PR loại Source="AutoReorder".
/// </summary>
public static class PurchaseRequisitionEndpoints
{
    public static void MapPurchaseRequisitionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/purchase-requisitions").RequireAuthorization();

        group.MapGet("", async (string? status, InventoryDbContext db) =>
        {
            var query = db.PurchaseRequisitions.Include(p => p.Items).AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PurchaseRequisitionStatus>(status, true, out var s))
                query = query.Where(p => p.Status == s);
            var items = await query.OrderByDescending(p => p.CreatedAt).Take(500).ToListAsync();
            return Results.Ok(items);
        });

        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var pr = await db.PurchaseRequisitions
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == id);
            return pr != null ? Results.Ok(pr) : Results.NotFound();
        });

        group.MapPost("", async (CreatePurchaseRequisitionDto dto, ClaimsPrincipal user, InventoryDbContext db) =>
        {
            var userId = ResolveUserId(user);
            if (userId == null) return Results.Unauthorized();

            try
            {
                var items = dto.Items.Select(i => new PurchaseRequisitionItem(i.ProductId, i.ProductName, i.Quantity, i.Notes)).ToList();
                var name = user.Identity?.Name ?? user.FindFirstValue(ClaimTypes.Email);
                var pr = new PurchaseRequisition(userId.Value, name, items, dto.Urgency, dto.Reason);
                db.PurchaseRequisitions.Add(pr);
                await db.SaveChangesAsync();
                return Results.Created($"/api/inventory/purchase-requisitions/{pr.Id}", pr);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("{id:guid}/submit", async (Guid id, InventoryDbContext db) =>
        {
            var pr = await db.PurchaseRequisitions.FindAsync(id);
            if (pr == null) return Results.NotFound();
            try { pr.Submit(); await db.SaveChangesAsync(); return Results.Ok(pr); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("{id:guid}/approve", async (Guid id, ClaimsPrincipal user, InventoryDbContext db) =>
        {
            var userId = ResolveUserId(user);
            if (userId == null) return Results.Unauthorized();
            var pr = await db.PurchaseRequisitions.FindAsync(id);
            if (pr == null) return Results.NotFound();
            try { pr.Approve(userId.Value); await db.SaveChangesAsync(); return Results.Ok(pr); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("{id:guid}/reject", async (Guid id, RejectDto dto, ClaimsPrincipal user, InventoryDbContext db) =>
        {
            var userId = ResolveUserId(user);
            if (userId == null) return Results.Unauthorized();
            var pr = await db.PurchaseRequisitions.FindAsync(id);
            if (pr == null) return Results.NotFound();
            try { pr.Reject(userId.Value, dto.Reason); await db.SaveChangesAsync(); return Results.Ok(pr); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("{id:guid}/convert-to-po", async (Guid id, ConvertPrToPoDto dto, ClaimsPrincipal user, InventoryDbContext db) =>
        {
            var userId = ResolveUserId(user);
            if (userId == null) return Results.Unauthorized();

            var pr = await db.PurchaseRequisitions.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (pr == null) return Results.NotFound();

            try
            {
                var priceMap = dto.UnitPrices?.ToDictionary(p => p.ProductId, p => p.UnitPrice) ?? new();
                var po = pr.ConvertToPO(dto.SupplierId, userId.Value, priceMap);
                db.PurchaseOrders.Add(po);
                await db.SaveChangesAsync();
                return Results.Ok(new { poId = po.Id, poNumber = po.PONumber, totalAmount = po.TotalAmount });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("{id:guid}/cancel", async (Guid id, InventoryDbContext db) =>
        {
            var pr = await db.PurchaseRequisitions.FindAsync(id);
            if (pr == null) return Results.NotFound();
            try { pr.Cancel(); await db.SaveChangesAsync(); return Results.Ok(pr); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });
    }

    private static Guid? ResolveUserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}

public record CreatePurchaseRequisitionDto(
    List<CreatePurchaseRequisitionItemDto> Items,
    UrgencyLevel Urgency,
    string? Reason);

public record CreatePurchaseRequisitionItemDto(Guid ProductId, string ProductName, int Quantity, string? Notes);
public record ConvertPrToPoDto(Guid SupplierId, List<UnitPriceDto>? UnitPrices);
public record UnitPriceDto(Guid ProductId, decimal UnitPrice);
public record RejectDto(string Reason);
