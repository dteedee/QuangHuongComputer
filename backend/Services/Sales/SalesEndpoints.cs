using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using MassTransit;

namespace Sales;

public static class SalesEndpoints
{
    public static void MapSalesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sales").RequireAuthorization();

        group.MapPost("/checkout", async (CheckoutDto model, SalesDbContext salesDb, CatalogDbContext catalogDb, InventoryDbContext inventoryDb, ClaimsPrincipal user, IPublishEndpoint publishEndpoint) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Results.Unauthorized();

            if (model.Items == null || !model.Items.Any())
                return Results.BadRequest(new { Error = "Cart is empty" });

            // Validate Data & Check Stock (Transactional-like in Monolith)
            // Note: Ideally use a distributed transaction or Saga, but for Monolith, we can try to orchestrate checks.
            
            var orderItems = new List<OrderItem>();
            
            // 1. Fetch all products to validate prices
            var productIds = model.Items.Select(i => i.ProductId).ToList();
            var products = await catalogDb.Products.Where(p => productIds.Contains(p.Id)).ToListAsync();
            var inventoryItems = await inventoryDb.InventoryItems.Where(i => productIds.Contains(i.ProductId)).ToListAsync();

            foreach (var cartItem in model.Items)
            {
                var product = products.FirstOrDefault(p => p.Id == cartItem.ProductId);
                if (product == null)
                    return Results.BadRequest(new { Error = $"Product not found: {cartItem.ProductId}" });

                // Validate Price (Security fix: Don't trust frontend price)
                // Note: You might want to allow some tolerance or explicit overrides, but for now strict check.
                // We use the current database price.
                
                // Validate Stock
                var inventoryItem = inventoryItems.FirstOrDefault(i => i.ProductId == cartItem.ProductId);
                if (inventoryItem == null || inventoryItem.QuantityOnHand < cartItem.Quantity)
                {
                    return Results.BadRequest(new { Error = $"Insufficient stock for product: {product.Name}" });
                }

                orderItems.Add(new OrderItem(product.Id, product.Name, product.Price, cartItem.Quantity));
            }

            // 2. Reduce Stock (Synchronous for now)
            foreach (var item in orderItems)
            {
                var invItem = inventoryItems.First(i => i.ProductId == item.ProductId);
                invItem.AdjustStock(-item.Quantity);
                
                // Also update Catalog stock for display purposes if needed
                var catProduct = products.First(p => p.Id == item.ProductId);
                catProduct.UpdateStock(-item.Quantity);
            }
            
            // 3. Create Order
            var order = new Order(userId, model.ShippingAddress ?? "", orderItems, 0.1m, model.Notes);
            salesDb.Orders.Add(order);

            // 4. Save Changes
            // In a real monolith, we might wrap this in a customized TransactionScope or ensure idempotency.
            // Here we just save all.
            await inventoryDb.SaveChangesAsync();
            await catalogDb.SaveChangesAsync();
            await salesDb.SaveChangesAsync();

            // 5. Publish Event
            // await publishEndpoint.Publish(new OrderCreatedIntegrationEvent(order.Id, order.CustomerId));

            return Results.Ok(new 
            { 
                OrderId = order.Id, 
                OrderNumber = order.OrderNumber,
                TotalAmount = order.TotalAmount,
                Status = order.Status.ToString()
            });
        });

        group.MapGet("/orders", async (SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Results.Unauthorized();

            var orders = await db.Orders
                .Include(o => o.Items)
                .Where(o => o.CustomerId == userId)
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.Status,
                    o.TotalAmount,
                    o.OrderDate,
                    o.ShippingAddress,
                    ItemCount = o.Items.Count,
                    Items = o.Items.Select(i => new
                    {
                        i.ProductId,
                        i.ProductName,
                        i.UnitPrice,
                        i.Quantity
                    })
                })
                .ToListAsync();

            return Results.Ok(orders);
        });

        group.MapGet("/orders/{id:guid}", async (Guid id, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Results.Unauthorized();

            var order = await db.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id && o.CustomerId == userId);

            if (order == null)
                return Results.NotFound(new { Error = "Order not found" });

            return Results.Ok(new
            {
                order.Id,
                order.OrderNumber,
                order.Status,
                order.SubtotalAmount,
                order.TaxAmount,
                order.TotalAmount,
                order.OrderDate,
                order.ShippingAddress,
                order.Notes,
                order.ConfirmedAt,
                order.FulfilledAt,
                order.CompletedAt,
                Items = order.Items.Select(i => new
                {
                    i.ProductId,
                    i.ProductName,
                    i.UnitPrice,
                    i.Quantity,
                    Subtotal = i.UnitPrice * i.Quantity
                })
            });
        });

        // Admin Endpoints
        var adminGroup = group.MapGroup("/admin").RequireAuthorization(policy => policy.RequireRole("Admin"));

        adminGroup.MapGet("/orders", async (SalesDbContext db, int page = 1, int pageSize = 20) =>
        {
            var query = db.Orders
                .Include(o => o.Items)
                .OrderByDescending(o => o.OrderDate);

            var total = await query.CountAsync();
            var orders = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.CustomerId,
                    o.Status,
                    o.TotalAmount,
                    o.OrderDate,
                    o.ShippingAddress,
                    ItemCount = o.Items.Count
                })
                .ToListAsync();

            return Results.Ok(new
            {
                Total = total,
                Page = page,
                PageSize = pageSize,
                Orders = orders
            });
        });

        adminGroup.MapGet("/orders/{id:guid}", async (Guid id, SalesDbContext db) =>
        {
            var order = await db.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
                return Results.NotFound(new { Error = "Order not found" });

            return Results.Ok(order);
        });

        adminGroup.MapPut("/orders/{id:guid}/status", async (Guid id, UpdateOrderStatusDto dto, SalesDbContext db) =>
        {
            var order = await db.Orders.FindAsync(id);
            if (order == null)
                return Results.NotFound(new { Error = "Order not found" });

            if (!Enum.TryParse<OrderStatus>(dto.Status, true, out var status))
                return Results.BadRequest(new { Error = "Invalid status" });

            order.SetStatus(status);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Order status updated", Status = order.Status.ToString() });
        });

        adminGroup.MapGet("/stats", async (SalesDbContext db) =>
        {
            var today = DateTime.UtcNow.Date;
            var thisMonth = new DateTime(today.Year, today.Month, 1);

            var stats = new
            {
                TotalOrders = await db.Orders.CountAsync(),
                TodayOrders = await db.Orders.CountAsync(o => o.OrderDate >= today),
                MonthOrders = await db.Orders.CountAsync(o => o.OrderDate >= thisMonth),
                TotalRevenue = await db.Orders.SumAsync(o => (decimal?)o.TotalAmount) ?? 0,
                MonthRevenue = await db.Orders
                    .Where(o => o.OrderDate >= thisMonth)
                    .SumAsync(o => (decimal?)o.TotalAmount) ?? 0,
                PendingOrders = await db.Orders.CountAsync(o => o.Status == OrderStatus.Pending),
                CompletedOrders = await db.Orders.CountAsync(o => o.Status == OrderStatus.Delivered)
            };

            return Results.Ok(stats);
        });
    }
}

public record CheckoutDto(List<CheckoutItemDto> Items, string? ShippingAddress, string? Notes);
public record CheckoutItemDto(Guid ProductId, string ProductName, decimal UnitPrice, int Quantity);
public record UpdateOrderStatusDto(string Status);
