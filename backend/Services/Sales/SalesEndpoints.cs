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
                if (DateTime.UtcNow > coupon.ValidTo)
                    return Results.BadRequest(new { Error = "Mã giảm giá đã hết hạn" });
                if (coupon.UsageLimit.HasValue && coupon.UsedCount >= coupon.UsageLimit)
                    return Results.BadRequest(new { Error = "Mã giảm giá đã hết lượt sử dụng" });
                if (cart.SubtotalAmount < coupon.MinOrderAmount)
                    return Results.BadRequest(new { Error = $"Đơn hàng tối thiểu {coupon.MinOrderAmount:N0}đ để sử dụng mã này" });
            }

            // Calculate discount
            decimal discountAmount = 0;
            if (coupon.DiscountType == DiscountType.Percentage)
            {
                discountAmount = cart.SubtotalAmount * (coupon.DiscountValue / 100);
                if (coupon.MaxDiscount.HasValue && discountAmount > coupon.MaxDiscount.Value)
                    discountAmount = coupon.MaxDiscount.Value;
            }
            else // FixedAmount
            {
                discountAmount = coupon.DiscountValue;
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

        // Cancel Order (Customer)
        group.MapPost("/orders/{id:guid}/cancel", async (Guid id, CancelOrderDto dto, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var order = await db.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id && o.CustomerId == userId);

            if (order == null)
                return Results.NotFound(new { Error = "Order not found" });

            // Only allow cancellation for certain statuses
            if (order.Status != OrderStatus.Draft && order.Status != OrderStatus.Confirmed)
            {
                return Results.BadRequest(new { Error = "Order cannot be cancelled in current status" });
            }

            order.Cancel(dto.Reason);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Order cancelled successfully", Status = order.Status.ToString() });
        });

        // Get Order History
        group.MapGet("/orders/{id:guid}/history", async (Guid id, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.CustomerId == userId);
            if (order == null)
                return Results.NotFound(new { Error = "Order not found" });

            var history = await db.OrderHistories
                .Where(h => h.OrderId == id)
                .OrderByDescending(h => h.ChangedAt)
                .Select(h => new
                {
                    h.Id,
                    h.FromStatus,
                    h.ToStatus,
                    h.Notes,
                    h.ChangedBy,
                    h.ChangedAt
                })
                .ToListAsync();

            return Results.Ok(history);
        });

        // ==================== RETURN REQUESTS ENDPOINTS ====================

        // Create Return Request
        group.MapPost("/returns", async (CreateReturnRequestDto dto, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            // Verify order exists and belongs to user
            var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == dto.OrderId && o.CustomerId == userId);
            if (order == null)
                return Results.NotFound(new { Error = "Order not found" });

            // Verify order item exists
            var orderItem = order.Items.FirstOrDefault(i => i.Id == dto.OrderItemId);
            if (orderItem == null)
                return Results.NotFound(new { Error = "Order item not found" });

            // Create return request
            var returnRequest = new ReturnRequest(
                dto.OrderId,
                dto.OrderItemId,
                dto.Reason,
                orderItem.UnitPrice * orderItem.Quantity,
                dto.Description);

            db.ReturnRequests.Add(returnRequest);
            await db.SaveChangesAsync();

            return Results.Created($"/api/sales/returns/{returnRequest.Id}", new
            {
                returnRequest.Id,
                returnRequest.OrderId,
                returnRequest.Status,
                Message = "Return request submitted successfully"
            });
        });

        // Get My Return Requests
        group.MapGet("/returns", async (SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            // Get user's orders first
            var userOrderIds = await db.Orders
                .Where(o => o.CustomerId == userId)
                .Select(o => o.Id)
                .ToListAsync();

            var returnRequests = await db.ReturnRequests
                .Where(r => userOrderIds.Contains(r.OrderId))
                .OrderByDescending(r => r.RequestedAt)
                .Select(r => new
                {
                    r.Id,
                    r.OrderId,
                    r.OrderItemId,
                    r.Reason,
                    r.Description,
                    r.Status,
                    r.RefundAmount,
                    r.RequestedAt
                })
                .ToListAsync();

            return Results.Ok(returnRequests);
        });

        // Get Return Request by ID
        group.MapGet("/returns/{id:guid}", async (Guid id, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var returnRequest = await db.ReturnRequests.FindAsync(id);
            if (returnRequest == null)
                return Results.NotFound(new { Error = "Return request not found" });

            // Verify order belongs to user
            var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == returnRequest.OrderId && o.CustomerId == userId);
            if (order == null)
                return Results.Forbid();

            return Results.Ok(new
            {
                returnRequest.Id,
                returnRequest.OrderId,
                returnRequest.OrderItemId,
                returnRequest.Reason,
                returnRequest.Description,
                returnRequest.Status,
                returnRequest.RefundAmount,
                returnRequest.RequestedAt,
                returnRequest.ApprovedAt,
                returnRequest.RejectedAt,
                returnRequest.RejectionReason,
                returnRequest.RefundedAt,
                returnRequest.ProcessedBy
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

        // ==================== RETURN REQUESTS ADMIN ENDPOINTS ====================

        adminGroup.MapGet("/returns", async (SalesDbContext db, int page = 1, int pageSize = 20, string? status = null) =>
        {
            var query = db.ReturnRequests.AsQueryable();

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<ReturnStatus>(status, true, out var statusEnum))
            {
                query = query.Where(r => r.Status == statusEnum);
            }

            var total = await query.CountAsync();
            var returns = await query
                .OrderByDescending(r => r.RequestedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new
                {
                    r.Id,
                    r.OrderId,
                    r.OrderItemId,
                    r.Reason,
                    r.Description,
                    r.Status,
                    r.RefundAmount,
                    r.RequestedAt
                })
                .ToListAsync();

            return Results.Ok(new { Total = total, Page = page, PageSize = pageSize, Returns = returns });
        });

        adminGroup.MapGet("/returns/{id:guid}", async (Guid id, SalesDbContext db) =>
        {
            var returnRequest = await db.ReturnRequests.FindAsync(id);
            if (returnRequest == null)
                return Results.NotFound(new { Error = "Return request not found" });

            return Results.Ok(returnRequest);
        });

        adminGroup.MapPost("/returns/{id:guid}/approve", async (Guid id, SalesDbContext db) =>
        {
            var returnRequest = await db.ReturnRequests.FindAsync(id);
            if (returnRequest == null)
                return Results.NotFound(new { Error = "Return request not found" });

            if (returnRequest.Status != ReturnStatus.Pending)
                return Results.BadRequest(new { Error = "Only pending returns can be approved" });

            returnRequest.Approve("Admin"); // TODO: Get actual user ID from auth context
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Return request approved", Status = returnRequest.Status.ToString() });
        });

        adminGroup.MapPost("/returns/{id:guid}/reject", async (Guid id, RejectReturnDto dto, SalesDbContext db) =>
        {
            var returnRequest = await db.ReturnRequests.FindAsync(id);
            if (returnRequest == null)
                return Results.NotFound(new { Error = "Return request not found" });

            if (returnRequest.Status != ReturnStatus.Pending)
                return Results.BadRequest(new { Error = "Only pending returns can be rejected" });

            returnRequest.Reject(dto.Reason, "Admin"); // TODO: Get actual user ID from auth context
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Return request rejected", Status = returnRequest.Status.ToString() });
        });

        adminGroup.MapPost("/returns/{id:guid}/refund", async (Guid id, SalesDbContext db) =>
        {
            var returnRequest = await db.ReturnRequests.FindAsync(id);
            if (returnRequest == null)
                return Results.NotFound(new { Error = "Return request not found" });

            if (returnRequest.Status != ReturnStatus.Approved)
                return Results.BadRequest(new { Error = "Only approved returns can be refunded" });

            returnRequest.ProcessRefund("Admin"); // TODO: Get actual user ID from auth context
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Return request refunded", Status = returnRequest.Status.ToString() });
        });
    }
}

public record CheckoutDto(List<CheckoutItemDto> Items, string? ShippingAddress, string? Notes);
public record CheckoutItemDto(Guid ProductId, string ProductName, decimal UnitPrice, int Quantity);
public record UpdateOrderStatusDto(string Status);
public record CancelOrderDto(string Reason);
public record CreateReturnRequestDto(Guid OrderId, Guid OrderItemId, string Reason, string? Description);
public record RejectReturnDto(string Reason);