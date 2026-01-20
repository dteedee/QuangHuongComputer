using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;
using Sales.Contracts;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using Content.Infrastructure;
using Content.Domain;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace Sales;

public static class SalesEndpoints
{
    public static void MapSalesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sales").RequireAuthorization();

        // ==================== CART ENDPOINTS ====================

        group.MapGet("/cart", async (SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
            {
                cart = new Cart(userId);
                db.Carts.Add(cart);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new CartDto(
                cart.Id,
                cart.CustomerId,
                cart.SubtotalAmount,
                cart.DiscountAmount,
                cart.SubtotalAmount * cart.TaxRate,
                cart.ShippingAmount,
                cart.TotalAmount,
                cart.TaxRate,
                cart.CouponCode,
                cart.Items.Select(i => new CartItemDto(i.ProductId, i.ProductName, i.Price, i.Quantity, i.Subtotal)).ToList()
            ));
        });

        group.MapPost("/cart/items", async ([FromBody] AddToCartDto dto, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
            {
                cart = new Cart(userId);
                db.Carts.Add(cart);
            }

            cart.AddItem(dto.ProductId, dto.ProductName, dto.Price, dto.Quantity);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Item added to cart" });
        });

        group.MapPut("/cart/items/{productId:guid}", async (Guid productId, [FromBody] UpdateQuantityDto dto, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            cart.UpdateItemQuantity(productId, dto.Quantity);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Quantity updated" });
        });

        group.MapDelete("/cart/items/{productId:guid}", async (Guid productId, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            cart.RemoveItem(productId);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Item removed from cart" });
        });

        group.MapPost("/cart/apply-coupon", async ([FromBody] ApplyCouponDto dto, SalesDbContext salesDb, ContentDbContext contentDb, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await salesDb.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            // Validate coupon
            var coupon = await contentDb.Coupons
                .FirstOrDefaultAsync(c => c.Code == dto.CouponCode.ToUpper());

            if (coupon == null)
                return Results.BadRequest(new { Error = "Mã giảm giá không tồn tại" });

            if (!coupon.IsValid(cart.SubtotalAmount))
            {
                if (!coupon.IsActive)
                    return Results.BadRequest(new { Error = "Mã giảm giá không còn hiệu lực" });
                if (coupon.EndDate.HasValue && DateTime.UtcNow > coupon.EndDate)
                    return Results.BadRequest(new { Error = "Mã giảm giá đã hết hạn" });
                if (coupon.UsageLimit.HasValue && coupon.UsageCount >= coupon.UsageLimit)
                    return Results.BadRequest(new { Error = "Mã giảm giá đã hết lượt sử dụng" });
                if (coupon.MinOrderAmount.HasValue && cart.SubtotalAmount < coupon.MinOrderAmount)
                    return Results.BadRequest(new { Error = $"Đơn hàng tối thiểu {coupon.MinOrderAmount.Value:N0}₫ để sử dụng mã này" });
            }

            // Calculate discount
            decimal discountAmount = 0;
            if (coupon.Type == DiscountType.Percentage)
            {
                discountAmount = cart.SubtotalAmount * (coupon.Value / 100);
                if (coupon.MaxDiscountAmount.HasValue && discountAmount > coupon.MaxDiscountAmount.Value)
                    discountAmount = coupon.MaxDiscountAmount.Value;
            }
            else // FixedAmount
            {
                discountAmount = coupon.Value;
            }

            cart.ApplyCoupon(dto.CouponCode.ToUpper(), discountAmount);
            await salesDb.SaveChangesAsync();

            return Results.Ok(new
            {
                Message = "Áp dụng mã giảm giá thành công",
                DiscountAmount = discountAmount,
                TotalAmount = cart.TotalAmount
            });
        });

        group.MapDelete("/cart/remove-coupon", async (SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            cart.RemoveCoupon();
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Đã xóa mã giảm giá" });
        });

        group.MapPost("/cart/set-shipping", async ([FromBody] SetShippingDto dto, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            cart.SetShippingAmount(dto.ShippingAmount);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Phí ship đã được cập nhật", TotalAmount = cart.TotalAmount });
        });

        group.MapDelete("/cart/clear", async (SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            cart.Clear();
            cart.RemoveCoupon();
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Giỏ hàng đã được xóa" });
        });

        // ==================== CHECKOUT ENDPOINT ====================

        group.MapPost("/checkout", async (CheckoutDto model, SalesDbContext salesDb, CatalogDbContext catalogDb, InventoryDbContext inventoryDb, ClaimsPrincipal user, IPublishEndpoint publishEndpoint) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Results.Unauthorized();

            // Try get Email
            var email = user.FindFirstValue(ClaimTypes.Email) ?? user.FindFirstValue("email") ?? "customer@api.com";

            if (model.Items == null || !model.Items.Any())
                return Results.BadRequest(new { Error = "Cart is empty" });

            // Validate Data & Check Stock (Transactional-like in Monolith)
            
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
            await inventoryDb.SaveChangesAsync();
            await catalogDb.SaveChangesAsync();
            await salesDb.SaveChangesAsync();

            // 5. Publish Event
            await publishEndpoint.Publish(new OrderCreatedIntegrationEvent(order.Id, order.CustomerId, email, order.TotalAmount, order.OrderNumber));

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
