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

            item.Quantity += amount;
            // In a real app, we'd log the reason to a StockMovement table
            await db.SaveChangesAsync();
            return Results.Ok(item);
        });

        // Purchase Orders
        group.MapGet("/po", async (InventoryDbContext db) =>
        {
            return await db.PurchaseOrders.Include(p => p.Items).OrderByDescending(p => p.OrderDate).ToListAsync();
        });

        group.MapPost("/po", async (PurchaseOrder po, InventoryDbContext db) =>
        {
            po.Id = Guid.NewGuid();
            po.OrderDate = DateTime.UtcNow;
            po.Status = POStatus.Draft;
            db.PurchaseOrders.Add(po);
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory/po/{po.Id}", po);
        });

        group.MapPut("/po/{id:guid}/submit", async (Guid id, InventoryDbContext db) =>
        {
            var po = await db.PurchaseOrders.FindAsync(id);
            if (po == null) return Results.NotFound();

            po.Status = POStatus.Submitted;
            await db.SaveChangesAsync();
            return Results.Ok(po);
        });

        group.MapPost("/po/{id:guid}/receive", async (Guid id, InventoryDbContext db) =>
        {
            var po = await db.PurchaseOrders.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (po == null) return Results.NotFound();

            foreach (var item in po.Items)
            {
                var invItem = await db.InventoryItems.FirstOrDefaultAsync(i => i.ProductId == item.ProductId);
                if (invItem != null)
                {
                    invItem.Quantity += item.Quantity;
                }
                else
                {
                    db.InventoryItems.Add(new InventoryItem 
                    { 
                        Id = Guid.NewGuid(), 
                        ProductId = item.ProductId, 
                        Quantity = item.Quantity, 
                        Sku = "AUTO-" + Guid.NewGuid().ToString().Substring(0,8) 
                    });
                }
            }

            po.Status = POStatus.Received;
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
            supplier.Id = Guid.NewGuid();
            db.Suppliers.Add(supplier);
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory/suppliers/{supplier.Id}", supplier);
        });
    }
}
