using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;
using InventoryModule.Domain;

namespace InventoryModule;

public static class InventoryEndpoints
{
    public static void MapInventoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "Supplier"));


        // Stock Management
        group.MapGet("/stock", async (InventoryDbContext db) =>
        {
            return await db.InventoryItems.ToListAsync();
        });

        group.MapGet("/stock/{productId:guid}", async (Guid productId, InventoryDbContext db) =>
        {
            var item = await db.InventoryItems.FirstOrDefaultAsync(i => i.ProductId == productId);
            return item != null ? Results.Ok(item) : Results.NotFound();
        });

        group.MapPut("/stock/{id:guid}/adjust", async (Guid id, int amount, string reason, InventoryDbContext db) =>
        {
            var item = await db.InventoryItems.FindAsync(id);
            if (item == null) return Results.NotFound();

            item.AdjustStock(amount);
            // In a real app, we'd log the reason to a StockMovement table
            await db.SaveChangesAsync();
            return Results.Ok(item);
        });

        // Purchase Orders
        group.MapGet("/po", async (InventoryDbContext db) =>
        {
            return await db.PurchaseOrders.Include(p => p.Items).OrderByDescending(p => p.PONumber).ToListAsync();
        });

        group.MapPost("/po", async (CreatePurchaseOrderDto dto, InventoryDbContext db) =>
        {
            var items = dto.Items.Select(i => new PurchaseOrderItem(i.ProductId, i.Quantity, i.UnitPrice)).ToList();
            var po = new PurchaseOrder(dto.SupplierId, items);
            
            db.PurchaseOrders.Add(po);
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory/po/{po.Id}", po);
        });

        group.MapPut("/po/{id:guid}/receive", async (Guid id, InventoryDbContext db) =>
        {
            var po = await db.PurchaseOrders.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (po == null) return Results.NotFound();

            if (po.Status == POStatus.Received) return Results.BadRequest("Already received");

            foreach (var item in po.Items)
            {
                var invItem = await db.InventoryItems.FirstOrDefaultAsync(i => i.ProductId == item.ProductId);
                if (invItem != null)
                {
                    invItem.AdjustStock(item.Quantity);
                }
                else
                {
                    db.InventoryItems.Add(new InventoryItem(item.ProductId, item.Quantity));
                }
            }

            po.ReceiveAll();
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Items received and stock updated" });
        });

        // Suppliers
        group.MapGet("/suppliers", async (InventoryDbContext db) =>
        {
            return await db.Suppliers.ToListAsync();
        });

        group.MapPost("/suppliers", async (Supplier supplier, InventoryDbContext db) =>
        {
            // Assuming Supplier has accessible constructor/setters or using DTO
            // For now, assuming basic binding works if class allows
             db.Suppliers.Add(supplier);
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory/suppliers/{supplier.Id}", supplier);
        });
    }
}

public record CreatePurchaseOrderDto(Guid SupplierId, List<CreatePOItemDto> Items);
public record CreatePOItemDto(Guid ProductId, int Quantity, decimal UnitPrice);

