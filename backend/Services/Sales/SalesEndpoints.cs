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
                // Optimize performance by disabling change tracking for read-only operations
                catalogDb.ChangeTracker.QueryTrackingBehavior = Microsoft.EntityFrameworkCore.QueryTrackingBehavior.NoTracking;
                inventoryDb.ChangeTracker.QueryTrackingBehavior = Microsoft.EntityFrameworkCore.QueryTrackingBehavior.NoTracking;
                salesDb.ChangeTracker.QueryTrackingBehavior = Microsoft.EntityFrameworkCore.QueryTrackingBehavior.NoTracking;
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
            
            // Execute reservation updates in parallel if possible
            if (reservationUpdates.Any())
            {
                await Task.WhenAll(reservationUpdates.Select(update => update()));
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

                // 5. Save Changes - batch save for better performance
                try 
                {
                    await Task.WhenAll(
                        inventoryDb.SaveChangesAsync(cts.Token),
                        catalogDb.SaveChangesAsync(cts.Token),
                        salesDb.SaveChangesAsync(cts.Token)
                    );
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