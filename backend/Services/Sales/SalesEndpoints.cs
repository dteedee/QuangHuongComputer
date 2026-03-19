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

        // ==================== GUEST CHECKOUT (PUBLIC) ====================
        var publicGroup = app.MapGroup("/api/sales/public");

        publicGroup.MapPost("/guest-checkout", async (
            GuestCheckoutDto model,
            SalesDbContext salesDb,
            CatalogDbContext catalogDb,
            InventoryDbContext inventoryDb,
            ContentDbContext contentDb,
            IPublishEndpoint publishEndpoint) =>
        {
            var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            try
            {
                // Validate required fields
                if (string.IsNullOrEmpty(model.CustomerEmail))
                    return Results.BadRequest(new { Error = "Email là bắt buộc" });

                if (string.IsNullOrEmpty(model.CustomerPhone))
                    return Results.BadRequest(new { Error = "Số điện thoại là bắt buộc" });

                if (string.IsNullOrEmpty(model.CustomerName))
                    return Results.BadRequest(new { Error = "Họ tên là bắt buộc" });

                if (model.Items == null || !model.Items.Any())
                    return Results.BadRequest(new { Error = "Giỏ hàng trống" });

                // Generate anonymous customer ID
                var guestCustomerId = Guid.NewGuid();

                var orderItems = new List<OrderItem>();
                var productIds = model.Items.Select(i => i.ProductId).Distinct().ToList();

                // Fetch products
                var products = await catalogDb.Products
                    .AsNoTracking()
                    .Where(p => productIds.Contains(p.Id) && p.IsActive)
                    .ToListAsync(cts.Token);

                // Fetch inventory
                var inventoryItems = await inventoryDb.InventoryItems
                    .Where(i => productIds.Contains(i.ProductId))
                    .ToListAsync(cts.Token);

                foreach (var cartItem in model.Items)
                {
                    var product = products.FirstOrDefault(p => p.Id == cartItem.ProductId);
                    if (product == null)
                        return Results.BadRequest(new { Error = $"Sản phẩm không tồn tại: {cartItem.ProductId}" });

                    var inventoryItem = inventoryItems.FirstOrDefault(i => i.ProductId == cartItem.ProductId);
                    var availableStock = inventoryItem?.AvailableQuantity ?? product.StockQuantity;

                    if (availableStock < cartItem.Quantity)
                        return Results.BadRequest(new { Error = $"Không đủ hàng: {product.Name}" });

                    // Reserve stock
                    if (inventoryItem != null)
                    {
                        inventoryItem.ReserveStock(cartItem.Quantity);
                    }

                    var orderItem = new OrderItem(
                        cartItem.ProductId,
                        product.Name,
                        product.Price,
                        cartItem.Quantity,
                        product.Sku,
                        product.OldPrice ?? product.Price
                    );

                    orderItems.Add(orderItem);
                }

                var subtotal = orderItems.Sum(i => i.LineTotal);
                var taxRate = 0.1m;
                var taxAmount = subtotal * taxRate;

                // Apply coupon if provided
                decimal discountAmount = 0;
                if (!string.IsNullOrEmpty(model.CouponCode))
                {
                    var coupon = await contentDb.Coupons
                        .FirstOrDefaultAsync(c => c.Code == model.CouponCode.ToUpper() && c.IsActive, cts.Token);

                    if (coupon != null && coupon.IsValid(subtotal))
                    {
                        discountAmount = coupon.CalculateDiscount(subtotal);
                        coupon.Apply();
                    }
                }

                var shippingAmount = subtotal >= 5000000 ? 0 : 50000; // Free shipping over 5M

                // Build shipping address with guest info
                var shippingInfo = new
                {
                    name = model.CustomerName,
                    phone = model.CustomerPhone,
                    email = model.CustomerEmail,
                    address = model.ShippingAddress
                };

                var order = new Order(
                    guestCustomerId,
                    model.ShippingAddress ?? "Guest Checkout",
                    orderItems,
                    taxRate,
                    model.Notes
                );

                if (discountAmount > 0)
                {
                    order.ApplyCoupon(model.CouponCode ?? "GUEST", discountAmount, "{}", "Guest Checkout Discount");
                }

                if (shippingAmount > 0)
                {
                    order.SetShippingAmount(shippingAmount);
                }

                salesDb.Orders.Add(order);
                await inventoryDb.SaveChangesAsync(cts.Token);
                await salesDb.SaveChangesAsync(cts.Token);

                // Publish order created event
                await publishEndpoint.Publish(new OrderCreatedIntegrationEvent(
                    order.Id,
                    guestCustomerId,
                    model.CustomerEmail,
                    order.TotalAmount,
                    order.OrderNumber
                ), cts.Token);

                return Results.Ok(new
                {
                    orderId = order.Id,
                    orderNumber = order.OrderNumber,
                    totalAmount = order.TotalAmount,
                    status = order.Status.ToString(),
                    message = "Đặt hàng thành công! Chúng tôi sẽ liên hệ xác nhận đơn hàng."
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Guest checkout error: {ex.Message}");
                return Results.Problem("Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.");
            }
        });

        // ==================== CART ENDPOINTS ====================

        group.MapGet("/cart", async (SalesDbContext db, CatalogDbContext catalogDb, ClaimsPrincipal user) =>
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

            // Fetch product images
            var productIds = cart.Items.Select(i => i.ProductId).ToList();
            var products = await catalogDb.Products
                .Where(p => productIds.Contains(p.Id))
                .Select(p => new { p.Id, p.ImageUrl })
                .ToDictionaryAsync(p => p.Id, p => p.ImageUrl);

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
                cart.Items.Select(i => new CartItemDto(
                    i.ProductId, 
                    i.ProductName, 
                    i.Price, 
                    i.Quantity, 
                    i.Subtotal,
                    products.TryGetValue(i.ProductId, out var img) ? img : null
                )).ToList()
            ));
        });

        group.MapPost("/cart/items", async ([FromBody] AddToCartDto dto, SalesDbContext db, InventoryDbContext inventoryDb, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            // 1. Kiểm tra tồn kho
            var inventoryItem = await inventoryDb.InventoryItems
                .FirstOrDefaultAsync(i => i.ProductId == dto.ProductId);

            if (inventoryItem == null)
            {
                try
                {
                    // Auto-create inventory item for development convenience
                    inventoryItem = new InventoryModule.Domain.InventoryItem(dto.ProductId, 100);
                    inventoryDb.InventoryItems.Add(inventoryItem);
                    await inventoryDb.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error auto-creating inventory item: {ex}");
                    // Fallback or return error? Let's return error to debug
                    return Results.Content($"Error creating inventory for product {dto.ProductId}: {ex.Message}", "text/plain", System.Text.Encoding.UTF8, 500);
                }
            }

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
            {
                cart = new Cart(userId);
                db.Carts.Add(cart);
            }

            // Kiểm tra nếu sản phẩm đã có trong giỏ hàng
            var existingItem = cart.Items.FirstOrDefault(i => i.ProductId == dto.ProductId);
            var totalQuantity = dto.Quantity + (existingItem?.Quantity ?? 0);

            if (inventoryItem.AvailableQuantity < totalQuantity)
                return Results.BadRequest(new { Error = $"Không đủ hàng trong kho. Còn lại: {inventoryItem.AvailableQuantity}" });

            // Reserve stock
            try
            {
                inventoryItem.ReserveStock(dto.Quantity);
                
                var reservation = new InventoryModule.Domain.StockReservation(
                    inventoryItem.Id,
                    dto.ProductId,
                    dto.Quantity,
                    cart.Id.ToString(),
                    "Cart",
                    24,
                    $"Reserved for cart {cart.Id}"
                );
                
                inventoryDb.StockReservations.Add(reservation);
                await inventoryDb.SaveChangesAsync();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = $"Không thể đặt trước hàng: {ex.Message}" });
            }

            cart.AddItem(dto.ProductId, dto.ProductName, dto.Price, dto.Quantity);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Item added to cart" });
        });

        group.MapPut("/cart/items/{productId:guid}", async (Guid productId, [FromBody] UpdateQuantityDto dto, SalesDbContext db, InventoryDbContext inventoryDb, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            var existingItem = cart.Items.FirstOrDefault(i => i.ProductId == productId);
            if (existingItem == null)
                return Results.NotFound(new { Error = "Item not found in cart" });

            var oldQuantity = existingItem.Quantity;
            var quantityDiff = dto.Quantity - oldQuantity;

            // Nếu tăng số lượng, cần reserve thêm
            if (quantityDiff > 0)
            {
                var inventoryItem = await inventoryDb.InventoryItems
                    .FirstOrDefaultAsync(i => i.ProductId == productId);

                if (inventoryItem == null)
                    return Results.BadRequest(new { Error = "Sản phẩm không tồn tại trong kho" });

                if (inventoryItem.AvailableQuantity < quantityDiff)
                    return Results.BadRequest(new { Error = $"Không đủ hàng trong kho. Còn lại: {inventoryItem.AvailableQuantity}" });

                inventoryItem.ReserveStock(quantityDiff);
                
                var reservation = new InventoryModule.Domain.StockReservation(
                    inventoryItem.Id,
                    productId,
                    quantityDiff,
                    cart.Id.ToString(),
                    "Cart",
                    24,
                    $"Additional reservation for cart {cart.Id}"
                );
                
                inventoryDb.StockReservations.Add(reservation);
                await inventoryDb.SaveChangesAsync();
            }
            // Nếu giảm số lượng, release stock
            else if (quantityDiff < 0)
            {
                var inventoryItem = await inventoryDb.InventoryItems
                    .FirstOrDefaultAsync(i => i.ProductId == productId);

                if (inventoryItem != null)
                {
                    inventoryItem.ReleaseReservedStock(Math.Abs(quantityDiff));
                    
                    // Tìm và release reservation
                    var activeReservations = await inventoryDb.StockReservations
                        .Where(r => r.ReferenceId == cart.Id.ToString() 
                                 && r.ProductId == productId 
                                 && r.Status == InventoryModule.Domain.ReservationStatus.Active)
                        .OrderByDescending(r => r.ReservedAt)
                        .ToListAsync();

                    var remainingToRelease = Math.Abs(quantityDiff);
                    foreach (var reservation in activeReservations)
                    {
                        if (remainingToRelease <= 0) break;
                        
                        if (reservation.Quantity <= remainingToRelease)
                        {
                            reservation.Release("Quantity reduced in cart");
                            remainingToRelease -= reservation.Quantity;
                        }
                        else
                        {
                            // Partial release - cần tạo reservation mới với số lượng còn lại
                            reservation.Release("Quantity reduced in cart");
                            
                            var newReservation = new InventoryModule.Domain.StockReservation(
                                inventoryItem.Id,
                                productId,
                                reservation.Quantity - remainingToRelease,
                                cart.Id.ToString(),
                                "Cart",
                                24,
                                $"Adjusted reservation for cart {cart.Id}"
                            );
                            inventoryDb.StockReservations.Add(newReservation);
                            remainingToRelease = 0;
                        }
                    }
                    
                    await inventoryDb.SaveChangesAsync();
                }
            }

            cart.UpdateItemQuantity(productId, dto.Quantity);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Quantity updated" });
        });

        group.MapDelete("/cart/items/{productId:guid}", async (Guid productId, SalesDbContext db, InventoryDbContext inventoryDb, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            var item = cart.Items.FirstOrDefault(i => i.ProductId == productId);
            if (item != null)
            {
                // Release reserved stock
                var inventoryItem = await inventoryDb.InventoryItems
                    .FirstOrDefaultAsync(i => i.ProductId == productId);

                if (inventoryItem != null)
                {
                    inventoryItem.ReleaseReservedStock(item.Quantity);
                    
                    // Release all active reservations for this product in this cart
                    var activeReservations = await inventoryDb.StockReservations
                        .Where(r => r.ReferenceId == cart.Id.ToString() 
                                 && r.ProductId == productId 
                                 && r.Status == InventoryModule.Domain.ReservationStatus.Active)
                        .ToListAsync();

                    foreach (var reservation in activeReservations)
                    {
                        reservation.Release("Item removed from cart");
                    }
                    
                    await inventoryDb.SaveChangesAsync();
                }
            }

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

        group.MapDelete("/cart/clear", async (SalesDbContext db, InventoryDbContext inventoryDb, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            // Release all reserved stock for this cart
            foreach (var item in cart.Items)
            {
                var inventoryItem = await inventoryDb.InventoryItems
                    .FirstOrDefaultAsync(i => i.ProductId == item.ProductId);

                if (inventoryItem != null)
                {
                    inventoryItem.ReleaseReservedStock(item.Quantity);
                }
            }

            // Release all active reservations for this cart
            var activeReservations = await inventoryDb.StockReservations
                .Where(r => r.ReferenceId == cart.Id.ToString() 
                         && r.Status == InventoryModule.Domain.ReservationStatus.Active)
                .ToListAsync();

            foreach (var reservation in activeReservations)
            {
                reservation.Release("Cart cleared");
            }
            
            await inventoryDb.SaveChangesAsync();

            cart.Clear();
            cart.RemoveCoupon();
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Giỏ hàng đã được xóa" });
        });

        // ==================== CHECKOUT ENDPOINT ====================

        group.MapPost("/checkout", async (CheckoutDto model, SalesDbContext salesDb, CatalogDbContext catalogDb, InventoryDbContext inventoryDb, ClaimsPrincipal user, IPublishEndpoint publishEndpoint) =>
        {
            var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30)); // 30 second timeout
            try
            {
                // Note: All contexts need tracking because we modify entities in all of them
                // - salesDb: save Order, clear Cart
                // - inventoryDb: update inventory
                // - catalogDb: update product stock

                var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            // Try get Email
            var email = user.FindFirstValue(ClaimTypes.Email) ?? user.FindFirstValue("email") ?? "customer@api.com";

            if (model.Items == null || !model.Items.Any())
            {
                Console.WriteLine("Checkout Error: Cart is empty");
                return Results.BadRequest(new { Error = "Cart is empty" });
            }

            // POS Support: Allow overriding CustomerId (e.g., for walk-in customers)
            var customerId = model.CustomerId ?? userId;

            var orderItems = new List<OrderItem>();

            // 1. Fetch products and inventory in parallel for better performance
            var productIds = model.Items.Select(i => i.ProductId).Distinct().ToList();
            
            // Fetch products and inventory in parallel
            var productsTask = catalogDb.Products.Where(p => productIds.Contains(p.Id)).ToListAsync(cts.Token);
            var inventoryTask = inventoryDb.InventoryItems.Where(i => productIds.Contains(i.ProductId)).ToListAsync(cts.Token);
            
            await Task.WhenAll(productsTask, inventoryTask);
            
            var products = await productsTask;
            var inventoryItems = await inventoryTask;
            
            Console.WriteLine($"[DEBUG] Fetched {products.Count} products and {inventoryItems.Count} inventory items");

            // Get cart to find reservations
            var cart = await salesDb.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == customerId, cts.Token);

            foreach (var cartItem in model.Items)
            {
                var product = products.FirstOrDefault(p => p.Id == cartItem.ProductId);
                if (product == null)
                {
                    Console.WriteLine($"Checkout Error: Product not found {cartItem.ProductId}");
                    return Results.BadRequest(new { Error = $"Product not found: {cartItem.ProductId}" });
                }

                // Validate Stock - kiểm tra reserved quantity
                var inventoryItem = inventoryItems.FirstOrDefault(i => i.ProductId == cartItem.ProductId);
                if (inventoryItem == null)
                {
                    Console.WriteLine($"Inventory missing for {product.Name}, auto-creating...");
                    // Auto-create inventory for demo/development if missing
                    inventoryItem = new InventoryModule.Domain.InventoryItem(cartItem.ProductId, 100);
                    inventoryDb.InventoryItems.Add(inventoryItem);
                    
                    // Reserve stock before saving
                    inventoryItem.ReserveStock(cartItem.Quantity);
                    
                    // Save immediately to get the ID
                    await inventoryDb.SaveChangesAsync(cts.Token);
                }

                // Kiểm tra xem có đủ reserved stock không
                if (cart != null)
                {
                    var cartItemInDb = cart.Items.FirstOrDefault(ci => ci.ProductId == cartItem.ProductId);
                    if (cartItemInDb == null || cartItemInDb.Quantity < cartItem.Quantity)
                    {
                        // Minor mismatch: just use what's in the checkout model but log it
                        Console.WriteLine($"Warning: Cart quantity mismatch for {product.Name}");
                    }
                }

                // Kiểm tra reserved quantity - ensure we have enough reserved
                if (inventoryItem.ReservedQuantity < cartItem.Quantity)
                {
                    Console.WriteLine($"Not enough reserved for {product.Name}. Reserved: {inventoryItem.ReservedQuantity}, Requested: {cartItem.Quantity}. Available: {inventoryItem.AvailableQuantity}");
                    // If not enough reserved, try to reserve more now if available
                    if (inventoryItem.AvailableQuantity >= (cartItem.Quantity - inventoryItem.ReservedQuantity))
                    {
                        inventoryItem.ReserveStock(cartItem.Quantity - inventoryItem.ReservedQuantity);
                    }
                    else
                    {
                        Console.WriteLine($"Checkout Error: Not enough stock for {product.Name}");
                        return Results.BadRequest(new { Error = $"Không đủ hàng cho sản phẩm: {product.Name}. Yêu cầu: {cartItem.Quantity}, Khả dụng: {inventoryItem.AvailableQuantity + inventoryItem.ReservedQuantity}" });
                    }
                }

                orderItems.Add(new OrderItem(product.Id, product.Name, product.Price, cartItem.Quantity));
            }

            // 2. Fulfill reservations và trừ stock thật - batch process for better performance
            var stockUpdates = new List<Action>();
            var reservationUpdates = new List<Func<Task>>();
            
            foreach (var item in orderItems)
            {
                var invItem = inventoryItems.First(i => i.ProductId == item.ProductId);
                
                // Check if we have enough stock (including reserved)
                if (invItem.AvailableQuantity + invItem.ReservedQuantity < item.Quantity)
                {
                    return Results.BadRequest(new { Error = $"Không đủ hàng cho {item.ProductName}. Yêu cầu: {item.Quantity}, Có sẵn: {invItem.AvailableQuantity}, Đã đặt: {invItem.ReservedQuantity}" });
                }
                
                // Confirm reserved stock - trừ cả reserved và quantity on hand
                try
                {
                    invItem.ConfirmReservedStock(item.Quantity);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error confirming stock for {item.ProductName}: {ex.Message}");
                    return Results.BadRequest(new { Error = $"Lỗi xác nhận kho cho {item.ProductName}: {ex.Message}" });
                }

                // Prepare catalog stock update
                var catProduct = products.First(p => p.Id == item.ProductId);
                stockUpdates.Add(() => catProduct.UpdateStock(-item.Quantity));
                
                // Fulfill reservations if cart exists
                if (cart != null)
                {
                    reservationUpdates.Add(async () => {
                        var activeReservations = await inventoryDb.StockReservations
                            .Where(r => r.ReferenceId == cart.Id.ToString() 
                                     && r.ProductId == item.ProductId 
                                     && r.Status == InventoryModule.Domain.ReservationStatus.Active)
                            .ToListAsync();

                        var remainingToFulfill = item.Quantity;
                        foreach (var reservation in activeReservations)
                        {
                            if (remainingToFulfill <= 0) break;
                            
                            if (reservation.Quantity <= remainingToFulfill)
                            {
                                reservation.Fulfill();
                                remainingToFulfill -= reservation.Quantity;
                            }
                            else
                            {
                                // Partial fulfill
                                var newReservation = new InventoryModule.Domain.StockReservation(
                                    invItem.Id,
                                    item.ProductId,
                                    reservation.Quantity - remainingToFulfill,
                                    cart.Id.ToString(),
                                    "Cart",
                                    24,
                                    $"Remaining after partial fulfill"
                                );
                                inventoryDb.StockReservations.Add(newReservation);
                                
                                reservation.Fulfill();
                                remainingToFulfill = 0;
                            }
                        }
                    });
                }
            }
            
            // Execute all stock updates
            stockUpdates.ForEach(update => update());
            
            // Execute reservation updates sequentially to avoid DbContext concurrency issues
            foreach (var update in reservationUpdates)
            {
                await update();
            }

                // 3. Create Order
                var order = new Order(
                    customerId: customerId, 
                    shippingAddress: model.IsPickup ? (model.PickupStoreName ?? "Nhận tại cửa hàng") : (model.ShippingAddress ?? ""), 
                    items: orderItems, 
                    taxRate: 0.1m, 
                    notes: model.Notes ?? "", 
                    customerIp: "127.0.0.1", // TODO: Get from actual request
                    customerUserAgent: "Web App", // TODO: Get from actual request
                    sourceId: Guid.Parse("00000000-0000-0000-0000-000000000001") // Default web source
                );
                
                if (model.IsPickup)
                {
                    order.SetShippingAmount(0);
                }
                else
                {
                    // Set default shipping if not provided
                    if (!model.ShippingAddress?.Contains("Miễn phí vận chuyển") ?? true)
                    {
                        order.SetShippingAmount(30000); // Default shipping fee
                    }
                }
                
                salesDb.Orders.Add(order);

                // Apply manual discount if provided (e.g., POS)
                if (model.ManualDiscount.HasValue && model.ManualDiscount.Value > 0)
                {
                    order.ApplyCoupon("POS-MANUAL", model.ManualDiscount.Value, "{}", "POS Manual Discount");
                }
                
                // Apply coupon: from request or from cart
                var couponToApply = !string.IsNullOrEmpty(model.CouponCode) ? model.CouponCode : cart?.CouponCode;
                if (!string.IsNullOrEmpty(couponToApply) && order.DiscountAmount == 0)
                {
                    // Calculate discount based on coupon code
                    var discountAmount = cart?.DiscountAmount ?? 0;

                    // If no cart discount, calculate a default discount (10% for common codes)
                    if (discountAmount == 0 && !string.IsNullOrEmpty(model.CouponCode))
                    {
                        // Simple discount calculation for direct checkout
                        var subtotal = order.Items.Sum(i => i.UnitPrice * i.Quantity);
                        discountAmount = couponToApply.ToUpper() switch
                        {
                            "SAVE10" => subtotal * 0.1m,
                            "SAVE20" => subtotal * 0.2m,
                            "SAVE15" => subtotal * 0.15m,
                            "FREESHIP" => order.ShippingAmount,
                            _ => subtotal * 0.05m // Default 5% for unknown codes
                        };
                    }

                    if (discountAmount > 0)
                    {
                        order.ApplyCoupon(
                            couponToApply.ToUpper(),
                            discountAmount,
                            $"{{\"code\":\"{couponToApply}\",\"discount\":{discountAmount}}}",
                            "Checkout Coupon"
                        );
                    }
                }

                // 4. Clear cart after successful checkout
                if (cart != null)
                {
                    cart.Clear();
                    cart.RemoveCoupon();
                }

                // 5. Save Changes - execute sequentially to avoid connection conflicts
                try 
                {
                    await inventoryDb.SaveChangesAsync(cts.Token);
                    await catalogDb.SaveChangesAsync(cts.Token);
                    await salesDb.SaveChangesAsync(cts.Token);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error during batch save: {ex.Message}");
                    // If batch save fails, try saving individually
                    await inventoryDb.SaveChangesAsync(cts.Token);
                    await catalogDb.SaveChangesAsync(cts.Token);
                    await salesDb.SaveChangesAsync(cts.Token);
                }

                // 6. Publish Event (non-blocking)
                _ = publishEndpoint.Publish(new OrderCreatedIntegrationEvent(order.Id, order.CustomerId, email, order.TotalAmount, order.OrderNumber));

                Console.WriteLine($"Order created successfully: {order.OrderNumber}");

                return Results.Ok(new
                {
                    OrderId = order.Id,
                    OrderNumber = order.OrderNumber,
                    TotalAmount = order.TotalAmount,
                    Status = order.Status.ToString()
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Checkout Exception: {ex.Message}");
                if (ex is OperationCanceledException)
                {
                    Console.WriteLine("Checkout operation timed out");
                    return Results.BadRequest(new { Error = "Đặt hàng thất bại do timeout. Vui lòng thử lại." });
                }
                
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                    if (ex.InnerException.InnerException != null)
                        Console.WriteLine($"Inner Inner Exception: {ex.InnerException.InnerException.Message}");
                }
                Console.WriteLine(ex.StackTrace);
                return Results.BadRequest(new { Error = $"Đặt hàng thất bại: {ex.Message}" + (ex.InnerException != null ? " | " + ex.InnerException.Message : "") });
            }
            finally
            {
                cts.Dispose();
            }
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

        // GET /api/sales/my-stats - Customer's purchase statistics
        group.MapGet("/my-stats", async (SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var orders = await db.Orders
                .Where(o => o.CustomerId == userId)
                .ToListAsync();

            var completedOrders = orders.Where(o => o.Status == OrderStatus.Completed || o.Status == OrderStatus.Delivered).ToList();
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
            var thisYearStart = new DateTime(DateTime.UtcNow.Year, 1, 1);

            var stats = new
            {
                totalOrders = orders.Count,
                completedOrders = completedOrders.Count,
                pendingOrders = orders.Count(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.Confirmed),
                cancelledOrders = orders.Count(o => o.Status == OrderStatus.Cancelled),

                totalSpent = completedOrders.Sum(o => o.TotalAmount),
                monthlySpent = completedOrders.Where(o => o.OrderDate >= thirtyDaysAgo).Sum(o => o.TotalAmount),
                yearlySpent = completedOrders.Where(o => o.OrderDate >= thisYearStart).Sum(o => o.TotalAmount),
                averageOrderValue = completedOrders.Any() ? completedOrders.Average(o => o.TotalAmount) : 0,

                lastOrderDate = orders.OrderByDescending(o => o.OrderDate).FirstOrDefault()?.OrderDate,
                firstOrderDate = orders.OrderBy(o => o.OrderDate).FirstOrDefault()?.OrderDate,

                // Customer tier calculation based on total spent
                customerTier = completedOrders.Sum(o => o.TotalAmount) switch
                {
                    >= 50000000 => "VIP",      // >= 50M VND
                    >= 20000000 => "Gold",     // >= 20M VND
                    >= 10000000 => "Silver",   // >= 10M VND
                    >= 5000000 => "Bronze",    // >= 5M VND
                    _ => "Member"
                },

                // Loyalty points estimation (1000 VND = 1 point)
                loyaltyPoints = (int)(completedOrders.Sum(o => o.TotalAmount) / 1000)
            };

            return Results.Ok(stats);
        });

        // Cancel Order (Customer)
        group.MapPost("/orders/{id:guid}/cancel", async (Guid id, CancelOrderDto dto, SalesDbContext db, CatalogDbContext catalogDb, InventoryDbContext inventoryDb, ClaimsPrincipal user) =>
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
            if (order.Status != OrderStatus.Draft && order.Status != OrderStatus.Confirmed && order.Status != OrderStatus.Pending)
            {
                return Results.BadRequest(new { Error = "Order cannot be cancelled in current status" });
            }

            // 1. Restock items - trả lại số lượng đã trừ
            var productIds = order.Items.Select(i => i.ProductId).ToList();
            var products = await catalogDb.Products.Where(p => productIds.Contains(p.Id)).ToListAsync();
            var inventoryItems = await inventoryDb.InventoryItems.Where(i => productIds.Contains(i.ProductId)).ToListAsync();

            foreach (var item in order.Items)
            {
                // Restock in Inventory
                var invItem = inventoryItems.FirstOrDefault(i => i.ProductId == item.ProductId);
                if (invItem != null)
                {
                    invItem.AdjustStock(item.Quantity, $"Restocked from cancelled order {order.OrderNumber}");
                }

                // Restock in Catalog for display
                var catProduct = products.FirstOrDefault(p => p.Id == item.ProductId);
                if (catProduct != null)
                {
                    catProduct.UpdateStock(item.Quantity);
                }
            }

            // 2. Release any remaining reservations for this order
            var orderReservations = await inventoryDb.StockReservations
                .Where(r => r.ReferenceId == id.ToString() 
                         && r.Status == InventoryModule.Domain.ReservationStatus.Active)
                .ToListAsync();

            foreach (var reservation in orderReservations)
            {
                var invItem = inventoryItems.FirstOrDefault(i => i.Id == reservation.InventoryItemId);
                if (invItem != null)
                {
                    invItem.ReleaseReservedStock(reservation.Quantity);
                }
                reservation.Release($"Order cancelled: {dto.Reason}");
            }

            // 3. Cancel order
            order.Cancel(dto.Reason);

            // 4. Save changes
            await inventoryDb.SaveChangesAsync();
            await catalogDb.SaveChangesAsync();
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Order cancelled and items restocked successfully", Status = order.Status.ToString() });
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

        // ==================== VERIFIED PURCHASE CHECK ====================

        // Check if user has purchased a specific product
        group.MapGet("/verify-purchase/{productId:guid}", async (Guid productId, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            // Check if user has any completed/delivered order containing this product
            var hasPurchased = await db.Orders
                .Include(o => o.Items)
                .AnyAsync(o => o.CustomerId == userId
                    && (o.Status == OrderStatus.Completed || o.Status == OrderStatus.Delivered || o.Status == OrderStatus.Fulfilled)
                    && o.Items.Any(i => i.ProductId == productId));

            return Results.Ok(new {
                productId,
                hasPurchased,
                message = hasPurchased ? "Bạn đã mua sản phẩm này" : "Bạn chưa mua sản phẩm này"
            });
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

        // Admin Endpoints - Allow Admin, Manager, and Sale roles for order management
        var adminGroup = group.MapGroup("/admin").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "Sale"));

        adminGroup.MapGet("/orders", async (SalesDbContext db, int page = 1, int pageSize = 20, string? search = null, string? status = null) =>
        {
            var query = db.Orders
                .Include(o => o.Items)
                .AsQueryable();

            // Search by order number or shipping address
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(o =>
                    o.OrderNumber.ToLower().Contains(searchLower) ||
                    (o.ShippingAddress != null && o.ShippingAddress.ToLower().Contains(searchLower)));
            }

            // Filter by status
            if (!string.IsNullOrWhiteSpace(status) && status != "all")
            {
                if (Enum.TryParse<OrderStatus>(status, true, out var orderStatus))
                {
                    query = query.Where(o => o.Status == orderStatus);
                }
            }

            var total = await query.CountAsync();
            var orders = await query
                .OrderByDescending(o => o.OrderDate)
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

        // Confirm Order - Sale confirms the order after verifying details
        adminGroup.MapPost("/orders/{id:guid}/confirm", async (Guid id, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var order = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
            if (order == null)
                return Results.NotFound(new { Error = "Đơn hàng không tồn tại" });

            if (order.Status != OrderStatus.Pending && order.Status != OrderStatus.Draft)
                return Results.BadRequest(new { Error = $"Không thể xác nhận đơn hàng ở trạng thái {order.Status}" });

            try
            {
                // Set status to Draft first if Pending (to allow Confirm transition)
                if (order.Status == OrderStatus.Pending)
                {
                    order.SetStatus(OrderStatus.Draft);
                }
                order.Confirm();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }

            // Log history
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "System";
            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "System";
            db.OrderHistories.Add(new OrderHistory(
                order.Id,
                OrderStatus.Pending,
                OrderStatus.Confirmed,
                userId,
                $"Đơn hàng được xác nhận bởi {userName}"
            ));

            await db.SaveChangesAsync();

            return Results.Ok(new {
                Message = "Đơn hàng đã được xác nhận",
                Status = order.Status.ToString(),
                OrderNumber = order.OrderNumber
            });
        });

        // Fulfill Order - Prepare for shipping
        adminGroup.MapPost("/orders/{id:guid}/fulfill", async (Guid id, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id);
            if (order == null)
                return Results.NotFound(new { Error = "Đơn hàng không tồn tại" });

            if (order.Status != OrderStatus.Confirmed && order.Status != OrderStatus.Paid)
                return Results.BadRequest(new { Error = $"Không thể xuất kho đơn hàng ở trạng thái {order.Status}" });

            var previousStatus = order.Status;
            order.MarkAsFulfilled();

            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "System";
            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "System";
            db.OrderHistories.Add(new OrderHistory(
                order.Id,
                previousStatus,
                order.Status,
                userId,
                $"Đơn hàng đã xuất kho bởi {userName}"
            ));

            await db.SaveChangesAsync();

            return Results.Ok(new {
                Message = "Đơn hàng đã xuất kho",
                Status = order.Status.ToString()
            });
        });

        // Ship Order
        adminGroup.MapPost("/orders/{id:guid}/ship", async (Guid id, ShipOrderDto dto, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id);
            if (order == null)
                return Results.NotFound(new { Error = "Đơn hàng không tồn tại" });

            if (order.Status != OrderStatus.Fulfilled && order.Status != OrderStatus.Confirmed && order.Status != OrderStatus.Paid)
                return Results.BadRequest(new { Error = $"Không thể giao hàng đơn ở trạng thái {order.Status}" });

            var previousStatus = order.Status;
            order.MarkAsShipped(dto.TrackingNumber ?? "", dto.Carrier ?? "");

            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "System";
            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "System";
            db.OrderHistories.Add(new OrderHistory(
                order.Id,
                previousStatus,
                OrderStatus.Shipped,
                userId,
                $"Đơn hàng đang giao bởi {userName}. Mã vận đơn: {dto.TrackingNumber ?? "N/A"}"
            ));

            await db.SaveChangesAsync();

            return Results.Ok(new {
                Message = "Đơn hàng đang được giao",
                Status = order.Status.ToString(),
                TrackingNumber = dto.TrackingNumber
            });
        });

        // Mark as Delivered
        adminGroup.MapPost("/orders/{id:guid}/deliver", async (Guid id, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id);
            if (order == null)
                return Results.NotFound(new { Error = "Đơn hàng không tồn tại" });

            if (order.Status != OrderStatus.Shipped)
                return Results.BadRequest(new { Error = $"Không thể xác nhận giao hàng ở trạng thái {order.Status}" });

            order.MarkAsDelivered();

            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "System";
            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "System";
            db.OrderHistories.Add(new OrderHistory(
                order.Id,
                OrderStatus.Shipped,
                OrderStatus.Delivered,
                userId,
                $"Đơn hàng đã giao thành công. Xác nhận bởi {userName}"
            ));

            await db.SaveChangesAsync();

            return Results.Ok(new {
                Message = "Đơn hàng đã giao thành công",
                Status = order.Status.ToString()
            });
        });

        // Complete Order - Final step (manual complete for orders that need explicit completion)
        adminGroup.MapPost("/orders/{id:guid}/complete", async (Guid id, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id);
            if (order == null)
                return Results.NotFound(new { Error = "Đơn hàng không tồn tại" });

            if (order.Status != OrderStatus.Delivered)
                return Results.BadRequest(new { Error = $"Chỉ có thể hoàn thành đơn hàng đã giao thành công" });

            order.SetStatus(OrderStatus.Completed);

            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "System";
            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "System";
            db.OrderHistories.Add(new OrderHistory(
                order.Id,
                OrderStatus.Delivered,
                OrderStatus.Completed,
                userId,
                $"Đơn hàng hoàn thành bởi {userName}"
            ));

            await db.SaveChangesAsync();

            return Results.Ok(new {
                Message = "Đơn hàng đã hoàn thành",
                Status = order.Status.ToString()
            });
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

        adminGroup.MapGet("/stats/revenue-chart", async (SalesDbContext db, int year = 0) =>
        {
            var targetYear = year == 0 ? DateTime.UtcNow.Year : year;
            var startDate = new DateTime(targetYear, 1, 1);
            var endDate = new DateTime(targetYear, 12, 31, 23, 59, 59);

            var monthlyRevenue = await db.Orders
                .Where(o => o.OrderDate >= startDate && o.OrderDate <= endDate)
                .GroupBy(o => o.OrderDate.Month)
                .Select(g => new
                {
                    Month = g.Key,
                    Revenue = g.Sum(o => o.TotalAmount),
                    OrderCount = g.Count()
                })
                .OrderBy(x => x.Month)
                .ToListAsync();

            // Fill missing months with 0
            var allMonths = Enumerable.Range(1, 12)
                .Select(month => {
                    var data = monthlyRevenue.FirstOrDefault(m => m.Month == month);
                    return new
                    {
                        Month = month,
                        Revenue = data?.Revenue ?? 0,
                        OrderCount = data?.OrderCount ?? 0
                    };
                })
                .ToList();

            return Results.Ok(new
            {
                Year = targetYear,
                MonthlyData = allMonths
            });
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

        adminGroup.MapPost("/returns/{id:guid}/approve", async (Guid id, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var returnRequest = await db.ReturnRequests.FindAsync(id);
            if (returnRequest == null)
                return Results.NotFound(new { Error = "Return request not found" });

            if (returnRequest.Status != ReturnStatus.Pending)
                return Results.BadRequest(new { Error = "Only pending returns can be approved" });

            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var userId = !string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out var uid) ? uid.ToString() : "System";

            returnRequest.Approve(userId);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Return request approved", Status = returnRequest.Status.ToString() });
        });

        adminGroup.MapPost("/returns/{id:guid}/reject", async (Guid id, RejectReturnDto dto, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var returnRequest = await db.ReturnRequests.FindAsync(id);
            if (returnRequest == null)
                return Results.NotFound(new { Error = "Return request not found" });

            if (returnRequest.Status != ReturnStatus.Pending)
                return Results.BadRequest(new { Error = "Only pending returns can be rejected" });

            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var userId = !string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out var uid) ? uid.ToString() : "System";

            returnRequest.Reject(dto.Reason, userId);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Return request rejected", Status = returnRequest.Status.ToString() });
        });

        adminGroup.MapPost("/returns/{id:guid}/refund", async (Guid id, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var returnRequest = await db.ReturnRequests.FindAsync(id);
            if (returnRequest == null)
                return Results.NotFound(new { Error = "Return request not found" });

            if (returnRequest.Status != ReturnStatus.Approved)
                return Results.BadRequest(new { Error = "Only approved returns can be refunded" });

            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var userId = !string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out var uid) ? uid.ToString() : "System";

            returnRequest.ProcessRefund(userId);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Return request refunded", Status = returnRequest.Status.ToString() });
        });

        // ==================== WISHLIST ENDPOINTS ====================

        group.MapGet("/wishlist", async (SalesDbContext db, CatalogDbContext catalogDb, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var wishlistItems = await db.WishlistItems
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.AddedAt)
                .ToListAsync();

            if (wishlistItems.Count == 0)
                return Results.Ok(new { items = new List<object>() });

            var productIds = wishlistItems.Select(w => w.ProductId).ToList();
            var products = await catalogDb.Products
                .Where(p => productIds.Contains(p.Id) && p.IsActive)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Price,
                    p.OldPrice,
                    p.ImageUrl,
                    p.StockQuantity,
                    p.Sku
                })
                .ToDictionaryAsync(p => p.Id);

            var result = wishlistItems
                .Where(w => products.ContainsKey(w.ProductId))
                .Select(w => new
                {
                    id = w.Id,
                    productId = w.ProductId,
                    addedAt = w.AddedAt,
                    product = products.TryGetValue(w.ProductId, out var p) ? p : null
                })
                .ToList();

            return Results.Ok(new { items = result });
        });

        group.MapPost("/wishlist/{productId:guid}", async (Guid productId, SalesDbContext db, CatalogDbContext catalogDb, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // Check if product exists
            var productExists = await catalogDb.Products.AnyAsync(p => p.Id == productId && p.IsActive);
            if (!productExists)
                return Results.NotFound(new { message = "Sản phẩm không tồn tại" });

            // Check if already in wishlist
            var existing = await db.WishlistItems
                .FirstOrDefaultAsync(w => w.UserId == userId && w.ProductId == productId);

            if (existing != null)
                return Results.Ok(new { message = "Sản phẩm đã có trong danh sách yêu thích", id = existing.Id });

            var wishlistItem = new WishlistItem(userId, productId);
            db.WishlistItems.Add(wishlistItem);
            await db.SaveChangesAsync();

            return Results.Created($"/api/sales/wishlist/{wishlistItem.Id}", new
            {
                message = "Đã thêm vào danh sách yêu thích",
                id = wishlistItem.Id
            });
        });

        group.MapDelete("/wishlist/{productId:guid}", async (Guid productId, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var wishlistItem = await db.WishlistItems
                .FirstOrDefaultAsync(w => w.UserId == userId && w.ProductId == productId);

            if (wishlistItem == null)
                return Results.NotFound(new { message = "Sản phẩm không có trong danh sách yêu thích" });

            db.WishlistItems.Remove(wishlistItem);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã xóa khỏi danh sách yêu thích" });
        });

        group.MapGet("/wishlist/check/{productId:guid}", async (Guid productId, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Ok(new { inWishlist = false });

            var exists = await db.WishlistItems
                .AnyAsync(w => w.UserId == userId && w.ProductId == productId);

            return Results.Ok(new { inWishlist = exists });
        });

        // ==================== LOYALTY POINTS ENDPOINTS ====================

        // Get user's loyalty account
        group.MapGet("/loyalty", async (SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var account = await db.LoyaltyAccounts
                .FirstOrDefaultAsync(l => l.UserId == userId);

            if (account == null)
            {
                // Auto-create account for new users
                account = new LoyaltyAccount(userId);
                db.LoyaltyAccounts.Add(account);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new
            {
                account.Id,
                account.UserId,
                account.TotalPoints,
                account.AvailablePoints,
                account.LifetimePoints,
                Tier = account.Tier.ToString(),
                TierLevel = (int)account.Tier,
                PointsMultiplier = account.GetPointsMultiplier(),
                account.LastActivityAt,
                account.TierExpiresAt,
                NextTierPoints = GetNextTierPoints(account.Tier, account.LifetimePoints),
                RedemptionValue = LoyaltyAccount.CalculateRedemptionValue(account.AvailablePoints)
            });
        });

        // Get loyalty transactions history
        group.MapGet("/loyalty/transactions", async (
            SalesDbContext db,
            ClaimsPrincipal user,
            int page = 1,
            int pageSize = 20,
            string? type = null) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var account = await db.LoyaltyAccounts
                .FirstOrDefaultAsync(l => l.UserId == userId);

            if (account == null)
                return Results.Ok(new { Total = 0, Transactions = new List<object>() });

            var query = db.LoyaltyTransactions
                .Where(t => t.AccountId == account.Id);

            if (!string.IsNullOrEmpty(type) && Enum.TryParse<LoyaltyTransactionType>(type, true, out var transType))
            {
                query = query.Where(t => t.Type == transType);
            }

            var total = await query.CountAsync();
            var transactions = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    t.Id,
                    Type = t.Type.ToString(),
                    t.Points,
                    t.Description,
                    t.OrderId,
                    t.ReferenceCode,
                    t.BalanceAfter,
                    t.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(new { Total = total, Transactions = transactions });
        });

        // Redeem points
        group.MapPost("/loyalty/redeem", async (
            RedeemPointsDto dto,
            SalesDbContext db,
            ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var account = await db.LoyaltyAccounts
                .FirstOrDefaultAsync(l => l.UserId == userId);

            if (account == null)
                return Results.NotFound(new { message = "Tài khoản loyalty không tồn tại" });

            if (dto.Points <= 0)
                return Results.BadRequest(new { message = "Số điểm phải lớn hơn 0" });

            if (dto.Points > account.AvailablePoints)
                return Results.BadRequest(new { message = $"Không đủ điểm. Hiện có: {account.AvailablePoints} điểm" });

            try
            {
                var redemptionValue = LoyaltyAccount.CalculateRedemptionValue(dto.Points);
                account.RedeemPoints(dto.Points, dto.Description ?? "Đổi điểm lấy giảm giá", dto.OrderId);

                // Create transaction record
                var transaction = new LoyaltyTransaction(
                    account.Id,
                    LoyaltyTransactionType.Redeem,
                    -dto.Points,
                    dto.Description ?? "Đổi điểm lấy giảm giá",
                    dto.OrderId
                );
                transaction.SetBalanceAfter(account.AvailablePoints);
                db.LoyaltyTransactions.Add(transaction);

                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    message = "Đổi điểm thành công",
                    pointsRedeemed = dto.Points,
                    redemptionValue,
                    remainingPoints = account.AvailablePoints
                });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        });

        // Calculate points for order (preview)
        group.MapGet("/loyalty/calculate/{orderAmount:decimal}", async (
            decimal orderAmount,
            SalesDbContext db,
            ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var multiplier = 1.0m;

            if (!string.IsNullOrEmpty(userId))
            {
                var account = await db.LoyaltyAccounts
                    .FirstOrDefaultAsync(l => l.UserId == userId);

                if (account != null)
                {
                    multiplier = account.GetPointsMultiplier();
                }
            }

            var points = LoyaltyAccount.CalculatePointsForOrder(orderAmount, multiplier);

            return Results.Ok(new
            {
                orderAmount,
                multiplier,
                pointsToEarn = points,
                message = $"Bạn sẽ nhận được {points} điểm cho đơn hàng này"
            });
        });

        // Admin: Adjust points
        adminGroup.MapPost("/loyalty/{userId}/adjust", async (
            string userId,
            AdjustPointsDto dto,
            SalesDbContext db,
            ClaimsPrincipal user) =>
        {
            var account = await db.LoyaltyAccounts
                .FirstOrDefaultAsync(l => l.UserId == userId);

            if (account == null)
                return Results.NotFound(new { message = "Tài khoản loyalty không tồn tại" });

            var adminId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "System";

            account.AdjustPoints(dto.Points, dto.Reason, adminId);

            var transaction = new LoyaltyTransaction(
                account.Id,
                LoyaltyTransactionType.Adjustment,
                dto.Points,
                $"{dto.Reason} (by {adminId})"
            );
            transaction.SetBalanceAfter(account.AvailablePoints);
            db.LoyaltyTransactions.Add(transaction);

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Điều chỉnh điểm thành công",
                newBalance = account.AvailablePoints,
                totalPoints = account.TotalPoints
            });
        });

        // Admin: Get all loyalty accounts
        adminGroup.MapGet("/loyalty", async (
            SalesDbContext db,
            int page = 1,
            int pageSize = 20,
            string? tier = null) =>
        {
            var query = db.LoyaltyAccounts.AsQueryable();

            if (!string.IsNullOrEmpty(tier) && Enum.TryParse<LoyaltyTier>(tier, true, out var tierValue))
            {
                query = query.Where(l => l.Tier == tierValue);
            }

            var total = await query.CountAsync();
            var accounts = await query
                .OrderByDescending(l => l.LifetimePoints)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new
                {
                    l.Id,
                    l.UserId,
                    l.TotalPoints,
                    l.AvailablePoints,
                    l.LifetimePoints,
                    Tier = l.Tier.ToString(),
                    l.LastActivityAt,
                    l.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(new { Total = total, Accounts = accounts });
        });

        // Admin: Loyalty stats
        adminGroup.MapGet("/loyalty/stats", async (SalesDbContext db) =>
        {
            var stats = new
            {
                TotalAccounts = await db.LoyaltyAccounts.CountAsync(),
                TotalPointsIssued = await db.LoyaltyAccounts.SumAsync(l => l.LifetimePoints),
                TotalPointsAvailable = await db.LoyaltyAccounts.SumAsync(l => l.AvailablePoints),
                TierBreakdown = new
                {
                    Bronze = await db.LoyaltyAccounts.CountAsync(l => l.Tier == LoyaltyTier.Bronze),
                    Silver = await db.LoyaltyAccounts.CountAsync(l => l.Tier == LoyaltyTier.Silver),
                    Gold = await db.LoyaltyAccounts.CountAsync(l => l.Tier == LoyaltyTier.Gold),
                    Platinum = await db.LoyaltyAccounts.CountAsync(l => l.Tier == LoyaltyTier.Platinum),
                    Diamond = await db.LoyaltyAccounts.CountAsync(l => l.Tier == LoyaltyTier.Diamond)
                }
            };

            return Results.Ok(stats);
        });
    }

    private static object? GetNextTierPoints(LoyaltyTier currentTier, int lifetimePoints)
    {
        return currentTier switch
        {
            LoyaltyTier.Bronze => new { nextTier = "Silver", pointsNeeded = 5000 - lifetimePoints },
            LoyaltyTier.Silver => new { nextTier = "Gold", pointsNeeded = 20000 - lifetimePoints },
            LoyaltyTier.Gold => new { nextTier = "Platinum", pointsNeeded = 50000 - lifetimePoints },
            LoyaltyTier.Platinum => new { nextTier = "Diamond", pointsNeeded = 100000 - lifetimePoints },
            _ => null // Diamond is max
        };
    }
}

public record CheckoutDto(
    List<CheckoutItemDto> Items,
    string? ShippingAddress,
    string? Notes,
    Guid? CustomerId = null,
    decimal? ManualDiscount = null,
    string? PaymentMethod = "COD",
    bool IsPickup = false,
    string? PickupStoreId = null,
    string? PickupStoreName = null,
    string? CouponCode = null
);
public record CheckoutItemDto(Guid ProductId, string ProductName, decimal UnitPrice, int Quantity);
public record UpdateOrderStatusDto(string Status);
public record CancelOrderDto(string Reason);
public record CreateReturnRequestDto(Guid OrderId, Guid OrderItemId, string Reason, string? Description);
public record RejectReturnDto(string Reason);
public record ShipOrderDto(string? TrackingNumber, string? Carrier);

public record CartDto(
    Guid Id,
    Guid CustomerId,
    decimal SubtotalAmount,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal ShippingAmount,
    decimal TotalAmount,
    decimal TaxRate,
    string? CouponCode,
    List<CartItemDto> Items
);

public record CartItemDto(
    Guid ProductId,
    string ProductName,
    decimal Price,
    int Quantity,
    decimal Subtotal,
    string? ImageUrl = null
);

public record AddToCartDto(Guid ProductId, string ProductName, decimal Price, int Quantity);
public record UpdateQuantityDto(int Quantity);
public record ApplyCouponDto(string CouponCode);
public record SetShippingDto(decimal ShippingAmount);

public record GuestCheckoutDto(
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    string ShippingAddress,
    List<GuestCheckoutItemDto> Items,
    string? CouponCode = null,
    string? Notes = null,
    string? PaymentMethod = null
);

public record GuestCheckoutItemDto(
    Guid ProductId,
    string ProductName,
    decimal Price,
    int Quantity
);

// Loyalty Points DTOs
public record RedeemPointsDto(int Points, Guid? OrderId = null, string? Description = null);
public record AdjustPointsDto(int Points, string Reason);