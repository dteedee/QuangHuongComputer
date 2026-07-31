using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;

namespace InventoryModule;

/// <summary>
/// Endpoint phiếu trả hàng NCC.
/// Phần lớn được sinh tự động khi GRN kiểm hàng thấy lỗi;
/// có thể tạo tay khi phát hiện lỗi sau khi đã nhập kho.
/// </summary>
public static class PurchaseReturnEndpoints
{
    public static void MapPurchaseReturnEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/purchase-returns").RequireAuthorization();

        group.MapGet("", async (string? status, InventoryDbContext db) =>
        {
            var query = db.PurchaseReturns.Include(p => p.Items).AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PurchaseReturnStatus>(status, true, out var s))
                query = query.Where(p => p.Status == s);
            var items = await query.OrderByDescending(p => p.CreatedAt).Take(500).ToListAsync();
            return Results.Ok(items);
        });

        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var pr = await db.PurchaseReturns.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            return pr != null ? Results.Ok(pr) : Results.NotFound();
        });

        group.MapPost("", async (CreatePurchaseReturnDto dto, InventoryDbContext db) =>
        {
            try
            {
                var items = dto.Items.Select(i => new PurchaseReturnItem(
                    i.ProductId, i.ProductName, i.Quantity, i.UnitCost, i.Reason, i.SerialNumbers)).ToList();
                var ret = new PurchaseReturn(dto.SupplierId, items, dto.GRNId, dto.PurchaseOrderId, dto.Notes);
                db.PurchaseReturns.Add(ret);
                await db.SaveChangesAsync();
                return Results.Created($"/api/inventory/purchase-returns/{ret.Id}", ret);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("{id:guid}/confirm", async (Guid id, InventoryDbContext db) =>
        {
            var ret = await db.PurchaseReturns.FindAsync(id);
            if (ret == null) return Results.NotFound();
            try { ret.Confirm(); await db.SaveChangesAsync(); return Results.Ok(ret); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("{id:guid}/accept", async (Guid id, InventoryDbContext db) =>
        {
            var ret = await db.PurchaseReturns.FindAsync(id);
            if (ret == null) return Results.NotFound();
            try { ret.Accept(); await db.SaveChangesAsync(); return Results.Ok(ret); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("{id:guid}/accept-refund", async (Guid id, AcceptRefundDto dto, InventoryDbContext db) =>
        {
            var ret = await db.PurchaseReturns.FindAsync(id);
            if (ret == null) return Results.NotFound();
            try { ret.MarkRefunded(dto.RefundAmount); await db.SaveChangesAsync(); return Results.Ok(ret); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("{id:guid}/cancel", async (Guid id, InventoryDbContext db) =>
        {
            var ret = await db.PurchaseReturns.FindAsync(id);
            if (ret == null) return Results.NotFound();
            try { ret.Cancel(); await db.SaveChangesAsync(); return Results.Ok(ret); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });
    }
}

public record CreatePurchaseReturnDto(
    Guid SupplierId,
    Guid? GRNId,
    Guid? PurchaseOrderId,
    string? Notes,
    List<CreatePurchaseReturnItemDto> Items);

public record CreatePurchaseReturnItemDto(
    Guid ProductId,
    string ProductName,
    int Quantity,
    decimal UnitCost,
    string? Reason,
    string? SerialNumbers);

public record AcceptRefundDto(decimal RefundAmount);
