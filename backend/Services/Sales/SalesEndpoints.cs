using System.Security.Claims;
using System.Text.Json;
using BuildingBlocks.Security;
using BuildingBlocks.SharedKernel;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Sales.Domain;
using Sales.Infrastructure;
using Sales.Contracts;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using Content.Infrastructure;
using Content.Domain;
using Sales.Application.Pricing;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace Sales;

public static class SalesEndpoints
{
    /// <summary>W0-4: trần số lượng mỗi dòng giỏ hàng — chặn đơn 2 tỷ cái do lỗi/khai thác.</summary>
    private const int MaxQuantityPerCartLine = 99;

    public static void MapSalesEndpoints(this IEndpointRouteBuilder app)
    {
        // Nhánh "của chính tôi" (giỏ hàng, đơn của tôi, wishlist, điểm thưởng): mọi handler
        // đều lọc theo userId từ ClaimsPrincipal -> chỉ cần đăng nhập (W1-10 self-service).
        // Nhánh /admin bên dưới tự khai báo policy permission tường minh và thắng convention này.
        var group = app.MapGroup("/api/sales").RequireAuthorization(SecurityPolicies.Authenticated);

        // ==================== GUEST CHECKOUT (PUBLIC) ====================
        var publicGroup = app.MapGroup("/api/sales/public");

        publicGroup.MapPost("/guest-checkout", async (
            GuestCheckoutDto model,
            SalesDbContext salesDb,
            CatalogDbContext catalogDb,
            InventoryDbContext inventoryDb,
            ContentDbContext contentDb,
            IPublishEndpoint publishEndpoint,
            IConfiguration config) =>
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

                var subtotal = orderItems.Sum(i => i.UnitPrice * i.Quantity);
                // VAT VN hiện hành 8%. W0-4/D01: giá ĐÃ bao gồm VAT → Order tự tách thuế,
                // KHÔNG tính taxAmount cộng thêm ở đây nữa.
                var taxRate = TaxRates.VatStandard;

                // Apply coupon if provided — nguồn duy nhất: CouponValidator (Content.Coupons).
                decimal discountAmount = 0;
                if (!string.IsNullOrEmpty(model.CouponCode))
                {
                    var couponResult = await CouponValidator.ValidateAsync(contentDb, model.CouponCode, subtotal, cts.Token);
                    if (couponResult.Success)
                    {
                        discountAmount = couponResult.DiscountAmount;
                        couponResult.Coupon!.Apply();
                    }
                }

                // W0-4: phí ship do SERVER quyết định, một nguồn duy nhất (ShippingFeePolicy).
                // TRƯỚC: công thức 500K/30K được chép tay ở đây + ở /checkout + ở CartContext.tsx.
                var shippingAmount = ShippingFeePolicy.Calculate(subtotal - discountAmount, isPickup: false, config);

                var order = new Order(
                    guestCustomerId,
                    model.ShippingAddress ?? "Guest Checkout",
                    orderItems,
                    taxRate,
                    model.Notes,
                    customerName: model.CustomerName,
                    customerEmail: model.CustomerEmail,
                    customerPhone: model.CustomerPhone
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
                if (discountAmount > 0)
                {
                    await contentDb.SaveChangesAsync(cts.Token); // persist Coupon.UsedCount++
                }

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
                return Results.Problem("Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.");
            }
        }).WithValidation<GuestCheckoutDto>();

        // ==================== CART ENDPOINTS ====================

        group.MapGet("/cart", async (SalesDbContext db, CatalogDbContext catalogDb, InventoryDbContext inventoryDb, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            try
            {
                var cart = await db.Carts
                    .Include(c => c.Items)
                    .FirstOrDefaultAsync(c => c.CustomerId == userId);

                if (cart == null)
                {
                    cart = new Cart(userId);
                    db.Carts.Add(cart);
                    await db.SaveChangesAsync();
                }

                var productIds = cart.Items.Select(i => i.ProductId).Distinct().ToList();

                var products = await catalogDb.Products
                    .AsNoTracking()
                    .Where(p => productIds.Contains(p.Id))
                    .Select(p => new { p.Id, p.ImageUrl })
                    .ToDictionaryAsync(p => p.Id, p => p.ImageUrl);

                // W0-4 FIX: TRƯỚC là `.ToDictionaryAsync(i => i.ProductId, ...)` → một sản phẩm
                // nằm ở 2 kho = 2 dòng InventoryItems = duplicate key → ArgumentException →
                // GET /api/sales/cart trả 400, giỏ hàng trông như rỗng, khách không checkout được.
                // Giờ GOM theo (ProductId, VariantId) và CỘNG AvailableQuantity của mọi kho.
                var inventoryRows = await inventoryDb.InventoryItems
                    .AsNoTracking()
                    .Where(i => productIds.Contains(i.ProductId))
                    .Select(i => new { i.ProductId, i.VariantId, i.AvailableQuantity })
                    .ToListAsync();

                var stockByKey = inventoryRows
                    .GroupBy(i => (i.ProductId, i.VariantId))
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.AvailableQuantity));
                // Dự phòng: dòng giỏ không có VariantId nhưng kho lại tách theo biến thể.
                var stockByProduct = inventoryRows
                    .GroupBy(i => i.ProductId)
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.AvailableQuantity));

                return Results.Ok(new CartDto(
                    cart.Id,
                    cart.CustomerId,
                    cart.SubtotalAmount,
                    cart.EffectiveDiscountAmount,
                    // D01: VAT nằm TRONG giá → đây là phần thuế TÁCH RA, không cộng thêm vào Total.
                    cart.TaxAmount,
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
                        products.TryGetValue(i.ProductId, out var img) ? img : null,
                        // Không còn "999" bịa ra khi thiếu dòng kho — 0 nghĩa là hết hàng thật.
                        stockByKey.TryGetValue((i.ProductId, i.VariantId), out var stock)
                            ? stock
                            : (stockByProduct.TryGetValue(i.ProductId, out var pStock) ? pStock : 0),
                        // Snapshot biến thể trong giỏ hàng — không đổi khi admin sửa tên biến thể sau.
                        i.VariantId,
                        i.VariantName,
                        i.VariantSku
                    )).ToList()
                ));
            }
            catch (Exception)
            {
                // KHÔNG trả chi tiết exception ra client (trước đây lộ stack/thông điệp EF).
                return Results.Problem("Không tải được giỏ hàng. Vui lòng thử lại.");
            }
        });

        group.MapPost("/cart/items", async ([FromBody] AddToCartDto dto, SalesDbContext db, InventoryDbContext inventoryDb, CatalogDbContext catalogDb, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            if (dto.Quantity <= 0)
                return Results.BadRequest(new { Error = "Số lượng phải lớn hơn 0" });

            if (dto.Quantity > MaxQuantityPerCartLine)
                return Results.BadRequest(new { Error = $"Số lượng tối đa mỗi sản phẩm là {MaxQuantityPerCartLine}" });

            // 1. W0-4: TÊN và GIÁ lấy từ Catalog, KHÔNG tin dto.ProductName/dto.Price.
            //    TRƯỚC: client gửi price tuỳ ý → giỏ hàng (và đơn) mang giá do khách tự đặt.
            var productSnapshot = await catalogDb.Products
                .AsNoTracking()
                .Where(p => p.Id == dto.ProductId)
                .Select(p => new { p.Name, p.Price, p.IsActive })
                .FirstOrDefaultAsync();

            if (productSnapshot == null || !productSnapshot.IsActive)
                return Results.BadRequest(new { Error = "Sản phẩm không tồn tại hoặc đã ngừng kinh doanh" });

            var productName = productSnapshot.Name;
            var unitPrice = productSnapshot.Price;

            // Nếu sản phẩm có biến thể → snapshot Name/Sku/Price của biến thể (vẫn từ Catalog).
            string? variantName = null;
            string? variantSku = null;
            if (dto.VariantId.HasValue)
            {
                var variantSnapshot = await catalogDb.ProductVariants
                    .AsNoTracking()
                    .Where(v => v.Id == dto.VariantId.Value && v.ProductId == dto.ProductId)
                    .Select(v => new { v.Name, v.Sku, v.Price })
                    .FirstOrDefaultAsync();

                if (variantSnapshot == null)
                    return Results.BadRequest(new { Error = "Biến thể không tồn tại" });

                variantName = variantSnapshot.Name;
                variantSku = variantSnapshot.Sku;
                if (variantSnapshot.Price > 0) unitPrice = variantSnapshot.Price;
            }

            // 2. Tồn kho — theo (ProductId, VariantId). W0-4: KHÔNG còn tự tạo InventoryItem qty=100.
            //    Tự tạo tồn ảo khiến mọi GUID đều "còn 100 cái" → bán hàng không có thật.
            var inventoryItem = await inventoryDb.InventoryItems
                .FirstOrDefaultAsync(i => i.ProductId == dto.ProductId && i.VariantId == dto.VariantId);

            if (inventoryItem == null)
                return Results.BadRequest(new { Error = "Sản phẩm đã hết hàng" });

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
            {
                cart = new Cart(userId);
                db.Carts.Add(cart);
            }

            // 3. Dòng giỏ hàng unique theo (ProductId, VariantId) — không gộp khác biến thể.
            var existingItem = cart.Items.FirstOrDefault(i =>
                i.ProductId == dto.ProductId && i.VariantId == dto.VariantId);
            var totalQuantity = dto.Quantity + (existingItem?.Quantity ?? 0);

            if (totalQuantity > MaxQuantityPerCartLine)
                return Results.BadRequest(new { Error = $"Số lượng tối đa mỗi sản phẩm là {MaxQuantityPerCartLine}" });

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
                return Results.BadRequest(new { Error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }

            // 4. Thêm vào giỏ hàng — TÊN/GIÁ/biến thể đều là snapshot từ Catalog, không tin client.
            cart.AddItem(
                dto.ProductId,
                productName,
                unitPrice,
                dto.Quantity,
                dto.VariantId,
                variantName,
                variantSku);
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

            // Validate coupon — nguồn duy nhất: CouponValidator (Content.Coupons).
            var couponResult = await CouponValidator.ValidateAsync(contentDb, dto.CouponCode, cart.SubtotalAmount);
            if (!couponResult.Success)
                return Results.BadRequest(new { Error = couponResult.ErrorMessage ?? "Mã giảm giá không hợp lệ" });

            var discountAmount = couponResult.DiscountAmount;
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

        // W0-4: phí ship KHÔNG còn do client quyết định — server tính lại từ ShippingFeePolicy.
        // dto.ShippingAmount chỉ còn để tương thích payload cũ (giữ endpoint không 400).
        group.MapPost("/cart/set-shipping", async ([FromBody] SetShippingDto dto, SalesDbContext db, ClaimsPrincipal user, IConfiguration config) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            var fee = ShippingFeePolicy.Calculate(
                cart.SubtotalAmount - cart.EffectiveDiscountAmount, isPickup: false, config);
            cart.SetShippingAmount(fee);
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                Message = "Phí ship đã được cập nhật",
                ShippingAmount = fee,
                TotalAmount = cart.TotalAmount
            });
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

        // W0-4 — LUỒNG KHÁCH HÀNG. CheckoutDto KHÔNG còn CustomerId / ManualDiscount / ShippingFee:
        // khách từng POST `manualDiscount: 1290000` để mua sản phẩm 1.290.000đ với giá 0đ, và
        // `customerId` của người khác để cắm đơn vào tài khoản người ta. Field lạ trong JSON bị
        // System.Text.Json bỏ qua (không 500) — chúng chỉ đơn giản không còn tác dụng.
        group.MapPost("/checkout", async (CheckoutDto model, SalesDbContext salesDb, CatalogDbContext catalogDb, InventoryDbContext inventoryDb, ContentDbContext contentDb, ClaimsPrincipal user, IPublishEndpoint publishEndpoint, HttpContext httpContext, IConfiguration config) =>
            await ProcessCheckoutAsync(
                new LegacyCheckoutRequest(
                    model.Items, model.ShippingAddress, model.Notes, model.PaymentMethod,
                    model.IsPickup, model.PickupStoreId, model.PickupStoreName, model.CouponCode,
                    model.RecipientName, model.RecipientPhone,
                    StaffCustomerId: null, StaffManualDiscount: null, StaffShippingFee: null),
                salesDb, catalogDb, inventoryDb, contentDb, user, publishEndpoint, httpContext, config)
        ).WithValidation<CheckoutDto>();

        // W0-4 — LUỒNG NHÂN VIÊN (POS tạm thời). Chỉ Admin/Manager/Sale mới được đặt hộ khách
        // (CustomerId), giảm giá tay (bị cap ở tạm tính, ghi người duyệt vào OrderHistory) và
        // ghi đè phí ship (GHN). W2-3 thay endpoint này bằng POS thật.
        group.MapPost("/staff-checkout", async (StaffCheckoutDto model, SalesDbContext salesDb, CatalogDbContext catalogDb, InventoryDbContext inventoryDb, ContentDbContext contentDb, ClaimsPrincipal user, IPublishEndpoint publishEndpoint, HttpContext httpContext, IConfiguration config) =>
            await ProcessCheckoutAsync(
                new LegacyCheckoutRequest(
                    model.Items, model.ShippingAddress, model.Notes, model.PaymentMethod,
                    model.IsPickup, model.PickupStoreId, model.PickupStoreName, model.CouponCode,
                    model.RecipientName, model.RecipientPhone,
                    model.CustomerId, model.ManualDiscount, model.ShippingFee),
                salesDb, catalogDb, inventoryDb, contentDb, user, publishEndpoint, httpContext, config)
        // Nhân viên lập đơn tại quầy thay khách = nghiệp vụ POS -> Permissions.Sales.Pos
        // (Admin/Manager/Sale đều giữ quyền này trong ma trận W1-1 => giữ nguyên phạm vi cũ).
        ).RequireAuthorization(Permissions.Sales.Pos)
         .WithValidation<StaffCheckoutDto>();

        // W1-10: adminGroup được tạo từ `app` chứ KHÔNG phải `group.MapGroup("/admin")`.
        // Lý do: group cha đã gắn policy "Policy.Authenticated"; RequireModulePermissions bỏ qua
        // endpoint nào đã có policy tường minh, nên nếu kế thừa từ group thì quyền theo verb
        // sẽ không bao giờ được gắn và /api/sales/admin/** chỉ còn yêu cầu "đã đăng nhập".
        // Route pattern sinh ra vẫn y hệt: /api/sales/admin/...
        // GET -> Sales.ViewAll, POST -> Sales.ManageAll, PUT/PATCH -> Sales.UpdateStatus,
        // DELETE -> Sales.CancelOrder. Marketing có Sales.ViewAll nên /admin/stats hết 403 (IR W0 #56).
        var adminGroup = app.MapGroup("/api/sales/admin").RequireModulePermissions(PermissionModules.Sales);

        MapRemainingSalesEndpoints(group, adminGroup);
    }

    /// <summary>
    /// W0-4 — thân xử lý checkout dùng chung cho luồng khách và luồng nhân viên.
    /// Mọi con số ảnh hưởng tiền (giá, phí ship, giảm giá) đều được TÍNH LẠI ở server.
    /// </summary>
    private static async Task<IResult> ProcessCheckoutAsync(
        LegacyCheckoutRequest model,
        SalesDbContext salesDb,
        CatalogDbContext catalogDb,
        InventoryDbContext inventoryDb,
        ContentDbContext contentDb,
        ClaimsPrincipal user,
        IPublishEndpoint publishEndpoint,
        HttpContext httpContext,
        IConfiguration config)
    {
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
                return Results.BadRequest(new { Error = "Cart is empty" });
            }

            // W0-4: chỉ luồng /staff-checkout (Admin/Manager/Sale) mới được đặt hộ khách khác.
            // Luồng khách hàng LUÔN dùng userId từ JWT — không thể cắm đơn vào tài khoản người khác.
            var customerId = model.StaffCustomerId ?? userId;
            var isStaffOrder = model.StaffCustomerId.HasValue && model.StaffCustomerId.Value != userId;

            var orderItems = new List<OrderItem>();

            // 1. Fetch products and inventory in parallel for better performance
            var productIds = model.Items.Select(i => i.ProductId).Distinct().ToList();
            var variantIds = model.Items.Where(i => i.VariantId.HasValue)
                .Select(i => i.VariantId!.Value).Distinct().ToList();

            // Fetch products, inventory và snapshot biến thể song song
            var productsTask = catalogDb.Products.Where(p => productIds.Contains(p.Id)).ToListAsync(cts.Token);
            var inventoryTask = inventoryDb.InventoryItems.Where(i => productIds.Contains(i.ProductId)).ToListAsync(cts.Token);
            // Snapshot biến thể — anonymous projection để không phụ thuộc kiểu Catalog.Domain.
            var variantSnapshotsTask = variantIds.Any()
                ? catalogDb.ProductVariants.AsNoTracking()
                    .Where(v => variantIds.Contains(v.Id))
                    .Select(v => new { v.Id, v.Name, v.Sku })
                    .ToListAsync(cts.Token)
                : Task.FromResult(new List<dynamic>().Select(x => new { Id = Guid.Empty, Name = "", Sku = "" }).ToList());

            await Task.WhenAll(productsTask, inventoryTask, variantSnapshotsTask);

            var products = await productsTask;
            var inventoryItems = await inventoryTask;
            var variantSnapshots = (await variantSnapshotsTask).ToDictionary(v => v.Id, v => (v.Name, v.Sku));


            // Get cart to find reservations
            var cart = await salesDb.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == customerId, cts.Token);

            foreach (var cartItem in model.Items)
            {
                var product = products.FirstOrDefault(p => p.Id == cartItem.ProductId);
                if (product == null)
                {
                    return Results.BadRequest(new { Error = $"Product not found: {cartItem.ProductId}" });
                }

                // Validate Stock — ưu tiên match theo (ProductId, VariantId) để cùng sản phẩm khác biến thể tính riêng.
                var inventoryItem = inventoryItems.FirstOrDefault(i =>
                    i.ProductId == cartItem.ProductId && i.VariantId == cartItem.VariantId);
                // W0-4: XOÁ fallback "tự tạo InventoryItem qty=100".
                // Nó biến mọi GUID thành hàng có sẵn 100 cái → bán hàng không tồn tại trong kho.
                if (inventoryItem == null)
                {
                    return Results.BadRequest(new { Error = $"Sản phẩm đã hết hàng: {product.Name}" });
                }

                // Kiểm tra xem có đủ reserved stock không
                if (cart != null)
                {
                    var cartItemInDb = cart.Items.FirstOrDefault(ci =>
                        ci.ProductId == cartItem.ProductId && ci.VariantId == cartItem.VariantId);
                    if (cartItemInDb == null || cartItemInDb.Quantity < cartItem.Quantity)
                    {
                        // Minor mismatch: just use what's in the checkout model but log it
                    }
                }

                // Kiểm tra reserved quantity - ensure we have enough reserved
                if (inventoryItem.ReservedQuantity < cartItem.Quantity)
                {
                    // If not enough reserved, try to reserve more now if available
                    if (inventoryItem.AvailableQuantity >= (cartItem.Quantity - inventoryItem.ReservedQuantity))
                    {
                        inventoryItem.ReserveStock(cartItem.Quantity - inventoryItem.ReservedQuantity);
                    }
                    else
                    {
                        return Results.BadRequest(new { Error = $"Không đủ hàng cho sản phẩm: {product.Name}. Yêu cầu: {cartItem.Quantity}, Khả dụng: {inventoryItem.AvailableQuantity + inventoryItem.ReservedQuantity}" });
                    }
                }

                // Snapshot biến thể — tra từ Catalog, không tin client.
                string? vName = null;
                string? vSku = null;
                if (cartItem.VariantId.HasValue && variantSnapshots.TryGetValue(cartItem.VariantId.Value, out var vs))
                {
                    vName = vs.Name;
                    vSku = vs.Sku;
                }

                orderItems.Add(new OrderItem(
                    product.Id,
                    product.Name,
                    product.Price,
                    cartItem.Quantity,
                    productSku: product.Sku,
                    originalPrice: null,
                    variantId: cartItem.VariantId,
                    variantName: vName,
                    variantSku: vSku));
            }

            // 2. Fulfill reservations và trừ stock thật - batch process for better performance
            var stockUpdates = new List<Action>();
            var reservationUpdates = new List<Func<Task>>();

            foreach (var item in orderItems)
            {
                // Match theo (ProductId, VariantId) — cùng sản phẩm khác biến thể phải tính tồn riêng.
                var invItem = inventoryItems.First(i =>
                    i.ProductId == item.ProductId && i.VariantId == item.VariantId);
                
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
                    return Results.BadRequest(new { Error = "Có lỗi xảy ra. Vui lòng thử lại." });
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
                    taxRate: TaxRates.VatStandard, // BUG pháp lý: hardcode 0.1m thu dư 2% VAT so với 8% hiện hành.
                    notes: model.Notes ?? "",
                    customerIp: httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault() ?? httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    customerUserAgent: httpContext.Request.Headers.UserAgent.ToString().Length > 0 ? httpContext.Request.Headers.UserAgent.ToString() : "unknown",
                    sourceId: Guid.Parse("00000000-0000-0000-0000-000000000001"), // Default web source
                    // Snapshot người nhận. W0-4: tên/SĐT lấy từ form checkout (RecipientName/RecipientPhone),
                    // fallback về claims khi khách tự đặt — trước đây đơn của khách đã đăng nhập để trống
                    // CustomerPhone nên admin không biết gọi cho ai.
                    customerName: model.RecipientName ?? (isStaffOrder ? null : user.FindFirstValue("name")),
                    customerEmail: isStaffOrder ? null : email,
                    customerPhone: model.RecipientPhone ?? (isStaffOrder ? null : user.FindFirstValue(ClaimTypes.MobilePhone))
                );

                salesDb.Orders.Add(order);

                // W0-4 — giảm giá TAY chỉ dành cho nhân viên (/staff-checkout), luôn bị cap ở tạm tính
                // và ghi lại người duyệt vào OrderHistory. Khách hàng không còn gửi được field này.
                if (model.StaffManualDiscount.HasValue && model.StaffManualDiscount.Value > 0)
                {
                    var subtotalForDiscount = order.Items.Sum(i => i.UnitPrice * i.Quantity);
                    var cappedDiscount = Math.Min(model.StaffManualDiscount.Value, subtotalForDiscount);
                    order.ApplyCoupon("POS-MANUAL", cappedDiscount, "{}", "POS Manual Discount");

                    salesDb.OrderHistories.Add(new OrderHistory(
                        order.Id,
                        order.Status,
                        order.Status,
                        changedBy: userIdStr,
                        notes: $"Giảm giá thủ công {cappedDiscount:N0}đ (yêu cầu {model.StaffManualDiscount.Value:N0}đ) do user {userIdStr} duyệt"));
                }

                // Apply coupon: from request or from cart — nguồn duy nhất: CouponValidator (Content.Coupons).
                // XÓA fallback giả (5/10/15/20% hardcode theo pattern tên mã) — mã không hợp lệ = 0đ + lỗi.
                var couponToApply = !string.IsNullOrEmpty(model.CouponCode) ? model.CouponCode : cart?.CouponCode;
                if (!string.IsNullOrEmpty(couponToApply) && order.DiscountAmount == 0)
                {
                    // W0-4 — LUÔN tính lại giảm giá trên tạm tính THẬT của đơn, không bao giờ
                    // dùng lại cart.DiscountAmount.
                    // TRƯỚC: `var discountAmount = cart?.DiscountAmount ?? 0;` rồi chỉ validate khi
                    // nó bằng 0. Số đó được tính trên GIỎ HÀNG, còn các dòng của đơn đến từ body
                    // request — hai tập khác nhau. Khai thác đã tái hiện trên :5050 (2026-09-18):
                    // bỏ laptop 18.490.000đ vào giỏ → áp mã 50% (cart.DiscountAmount = 9.245.000đ)
                    // → checkout đúng 1 món 290.000đ ⇒ totalAmount = 30.000đ (chỉ còn phí ship).
                    // Đây là cùng lỗ hổng "mua 0đ" mà track này đóng cho manualDiscount, chỉ khác field.
                    // Nhánh cũ còn bỏ qua Coupon.Apply() khi giỏ đã áp mã ⇒ UsedCount không tăng,
                    // mã giới hạn 1 lượt dùng được vô hạn lần.
                    var subtotal = order.Items.Sum(i => i.UnitPrice * i.Quantity);
                    var couponResult = await CouponValidator.ValidateAsync(contentDb, couponToApply, subtotal, cts.Token);
                    if (!couponResult.Success)
                    {
                        return Results.BadRequest(new { Error = couponResult.ErrorMessage ?? "Mã giảm giá không hợp lệ" });
                    }
                    var discountAmount = couponResult.DiscountAmount;
                    couponResult.Coupon!.Apply();

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

                // W0-4 — PHÍ SHIP TÍNH SAU GIẢM GIÁ, do SERVER quyết định (ShippingFeePolicy = nguồn duy nhất).
                // TRƯỚC: `if (model.ShippingFee > 0) SetShippingAmount(model.ShippingFee)` → khách gửi
                // shippingFee tuỳ ý (kể cả 0) và công thức 500K/30K bị chép lại ở đây lần thứ hai.
                // Chỉ /staff-checkout (GHN/POS) mới được ghi đè.
                if (model.StaffShippingFee.HasValue && model.StaffShippingFee.Value >= 0 && !model.IsPickup)
                {
                    order.SetShippingAmount(model.StaffShippingFee.Value);
                }
                else
                {
                    order.SetShippingAmount(ShippingFeePolicy.Calculate(
                        order.SubtotalAmount - order.DiscountAmount, model.IsPickup, config));
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
                    await contentDb.SaveChangesAsync(cts.Token); // persist Coupon.UsedCount++ nếu có
                }
                catch (Exception ex)
                {
                    // If batch save fails, try saving individually
                    await inventoryDb.SaveChangesAsync(cts.Token);
                    await catalogDb.SaveChangesAsync(cts.Token);
                    await salesDb.SaveChangesAsync(cts.Token);
                    await contentDb.SaveChangesAsync(cts.Token);
                }

                // 6. Publish Event (non-blocking)
                _ = publishEndpoint.Publish(new OrderCreatedIntegrationEvent(order.Id, order.CustomerId, email, order.TotalAmount, order.OrderNumber));


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
                if (ex is OperationCanceledException)
                {
                    return Results.BadRequest(new { Error = "Đặt hàng thất bại do timeout. Vui lòng thử lại." });
                }
                
                return Results.BadRequest(new { Error = "Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại." });
            }
            finally
            {
                cts.Dispose();
            }
        }
    }

    /// <summary>Phần còn lại của Sales API — tách ra chỉ để ProcessCheckoutAsync dùng chung được.</summary>
    private static void MapRemainingSalesEndpoints(RouteGroupBuilder group, RouteGroupBuilder adminGroup)
    {
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
                    // W0-4: trả snapshot người nhận để FE/admin hiển thị đúng tên + SĐT.
                    o.CustomerName,
                    o.CustomerPhone,
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
                order.DiscountAmount,
                order.ShippingAmount,
                // D01: TaxAmount là phần VAT ĐÃ NẰM TRONG TotalAmount (tách ra để xuất hoá đơn),
                // KHÔNG phải khoản cộng thêm.
                order.TaxAmount,
                order.TaxRate,
                order.TotalAmount,
                order.OrderDate,
                order.ShippingAddress,
                // W0-4: snapshot người nhận.
                order.CustomerName,
                order.CustomerPhone,
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

        // Create Return Request (Phase 07: 3 luồng qua Orchestrator)
        group.MapPost("/returns", async (
            CreateReturnRequestDto dto,
            Sales.Application.Returns.ReturnOrchestrator orchestrator,
            ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            try
            {
                var type = dto.Type ?? Sales.Domain.ReturnType.Refund;
                var rr = await orchestrator.RequestAsync(new Sales.Application.Returns.CreateReturnRequestInput(
                    OrderId: dto.OrderId,
                    OrderItemId: dto.OrderItemId,
                    Type: type,
                    Reason: dto.Reason,
                    Description: dto.Description,
                    AttachmentUrls: dto.AttachmentUrls,
                    ExchangeProductId: dto.ExchangeProductId,
                    ExchangeVariantId: dto.ExchangeVariantId), userId);

                return Results.Created($"/api/sales/returns/{rr.Id}", new
                {
                    rr.Id, rr.OrderId, rr.Type, rr.Status,
                    Message = "Đã gửi yêu cầu đổi trả"
                });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        }).WithValidation<CreateReturnRequestDto>();

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
        // NOTE (D3): Không thêm POST /api/sales/admin/orders — admin tạo đơn dùng chung
        // POST /api/sales/checkout (qua promotion/inventory pipeline) để đảm bảo tính nhất quán
        // giá/khuyến mãi/tồn kho. Luồng POS riêng cho nhân viên tạo đơn tại quầy chưa cần thiết ở giai đoạn này.
        // adminGroup được truyền từ MapSalesEndpoints (xem ghi chú ở đó).

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
                    (o.ShippingAddress != null && o.ShippingAddress.ToLower().Contains(searchLower)) ||
                    (o.CustomerName != null && o.CustomerName.ToLower().Contains(searchLower)) ||
                    (o.CustomerEmail != null && o.CustomerEmail.ToLower().Contains(searchLower)) ||
                    (o.CustomerPhone != null && o.CustomerPhone.Contains(search)));
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
                    o.CustomerName,
                    o.CustomerEmail,
                    o.CustomerPhone,
                    Status = o.Status.ToString(),
                    o.TotalAmount,
                    o.OrderDate,
                    o.ShippingAddress,
                    o.PaymentStatus,
                    o.SubtotalAmount,
                    o.DiscountAmount,
                    o.TaxAmount,
                    o.ShippingAmount,
                    o.Notes,
                    ItemCount = o.Items.Count, // Keep this for backward compatibility if needed somewhere else
                    Items = o.Items.Select(i => new
                    {
                        i.Id,
                        i.OrderId,
                        i.ProductId,
                        i.ProductName,
                        i.ProductSku,
                        i.UnitPrice,
                        i.Quantity,
                        i.DiscountAmount,
                        i.LineTotal
                    }).ToList()
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
        }).WithValidation<UpdateOrderStatusDto>();

        // JSON extensibility: set/replace freeform attributes (validated against CustomFieldDefinition EntityType="Order")
        adminGroup.MapPut("/orders/{id:guid}/attributes", async (
            Guid id, SetOrderAttributesDto dto, SalesDbContext db,
            SystemConfig.Infrastructure.CustomFieldDbContext customFieldDb) =>
        {
            var order = await db.Orders.FindAsync(id);
            if (order == null)
                return Results.NotFound(new { Error = "Order not found" });

            var attributesError = await SystemConfig.CustomFieldAttributeValidator.ValidateAsync(customFieldDb, "Order", dto.Attributes);
            if (attributesError is not null)
                return Results.BadRequest(new { error = attributesError });

            order.SetAttributes(dto.Attributes);
            await db.SaveChangesAsync();

            return Results.Ok(new { order.Id, order.Attributes });
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
                order.Confirm();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
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
            var lastMonthStart = thisMonth.AddMonths(-1);
            var lastMonthEnd = thisMonth.AddTicks(-1);

            // W0-4: DOANH THU chỉ tính đơn ĐÃ THANH TOÁN và KHÔNG bị huỷ.
            // TRƯỚC: SUM toàn bộ Orders → đơn huỷ và đơn COD chưa thu tiền vẫn vào doanh thu.
            var revenueOrders = db.Orders
                .Where(o => o.Status != OrderStatus.Cancelled && o.PaymentStatus == PaymentStatus.Paid);

            var totalOrders = await db.Orders.CountAsync();
            var todayOrders = await db.Orders.CountAsync(o => o.OrderDate >= today);
            var monthOrders = await db.Orders.CountAsync(o => o.OrderDate >= thisMonth);
            var lastMonthOrders = await db.Orders.CountAsync(o => o.OrderDate >= lastMonthStart && o.OrderDate <= lastMonthEnd);
            var totalRevenue = await revenueOrders.SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var monthRevenue = await revenueOrders
                .Where(o => o.OrderDate >= thisMonth)
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var lastMonthRevenue = await revenueOrders
                .Where(o => o.OrderDate >= lastMonthStart && o.OrderDate <= lastMonthEnd)
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var todayRevenue = await revenueOrders
                .Where(o => o.OrderDate >= today)
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var pendingOrders = await db.Orders.CountAsync(o => o.Status == OrderStatus.Pending);
            // CompletedOrders = trạng thái Completed (đã thanh toán + đã giao xong), không phải Delivered.
            var completedOrders = await db.Orders.CountAsync(o => o.Status == OrderStatus.Completed);
            var paidOrderCount = await revenueOrders.CountAsync();
            var averageOrderValue = paidOrderCount > 0 ? totalRevenue / paidOrderCount : 0;

            // Growth calculations: compare current month vs previous month
            var orderGrowth = lastMonthOrders > 0
                ? Math.Round((decimal)(monthOrders - lastMonthOrders) / lastMonthOrders * 100, 1)
                : (monthOrders > 0 ? 100m : 0m);
            var revenueGrowth = lastMonthRevenue > 0
                ? Math.Round((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100, 1)
                : (monthRevenue > 0 ? 100m : 0m);

            var stats = new
            {
                TotalOrders = totalOrders,
                TodayOrders = todayOrders,
                MonthOrders = monthOrders,
                TotalRevenue = totalRevenue,
                MonthRevenue = monthRevenue,
                TodayRevenue = todayRevenue,
                PendingOrders = pendingOrders,
                CompletedOrders = completedOrders,
                AverageOrderValue = averageOrderValue,
                OrderGrowth = orderGrowth,
                RevenueGrowth = revenueGrowth
            };

            return Results.Ok(stats);
        });

        adminGroup.MapGet("/stats/revenue-chart", async (SalesDbContext db, int year = 0) =>
        {
            var targetYear = year == 0 ? DateTime.UtcNow.Year : year;
            var startDate = new DateTime(targetYear, 1, 1);
            var endDate = new DateTime(targetYear, 12, 31, 23, 59, 59);

            // W0-4: cùng bộ lọc doanh thu với /admin/stats — loại đơn huỷ và đơn chưa thanh toán.
            var monthlyRevenue = await db.Orders
                .Where(o => o.Status != OrderStatus.Cancelled && o.PaymentStatus == PaymentStatus.Paid)
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
            // W1-10: duyệt/từ chối/xử lý đổi-trả cần Sales.ManageReturns (Admin/Manager).
            // Ma trận W1-1 cố tình KHÔNG cấp quyền này cho Sale ("Sale không duyệt đổi/trả"),
            // nên không để rơi vào quyền Sales.ManageAll theo verb của group.
        }).RequireAuthorization(Permissions.Sales.ManageReturns);

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
        }).RequireAuthorization(Permissions.Sales.ManageReturns);

        // Phase 07: Inspect — nhân viên kiểm hàng nhận về, chọn kho nhập.
        adminGroup.MapPost("/returns/{id:guid}/inspect", async (
            Guid id,
            [FromBody] InspectReturnDto dto,
            SalesDbContext db,
            ClaimsPrincipal user) =>
        {
            var rr = await db.ReturnRequests.FindAsync(id);
            if (rr == null) return Results.NotFound(new { Error = "Return request not found" });

            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var uid)) uid = Guid.Empty;
            try
            {
                rr.RecordInspection(dto.Condition, dto.WarehouseId, uid, dto.Notes);
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Đã kiểm hàng", rr.Id, rr.Status, rr.ReceivedCondition, rr.RestockWarehouseId });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        }).RequireAuthorization(Permissions.Sales.ManageReturns);

        // Phase 07: Complete — chạy Orchestrator (Refund/Exchange/Replace), nhập kho, hoàn tiền/đơn mới.
        adminGroup.MapPost("/returns/{id:guid}/complete", async (
            Guid id,
            Sales.Application.Returns.ReturnOrchestrator orchestrator,
            ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var processedBy = !string.IsNullOrEmpty(userIdStr) ? userIdStr : "system";
            try
            {
                var result = await orchestrator.ProcessAfterInspectionAsync(id, processedBy);
                return Results.Ok(new { Message = "Đã hoàn tất yêu cầu", result });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        }).RequireAuthorization(Permissions.Sales.ManageReturns);

        // Legacy /refund alias — điều hướng qua Complete cho tương thích cũ.
        adminGroup.MapPost("/returns/{id:guid}/refund", async (
            Guid id,
            Sales.Application.Returns.ReturnOrchestrator orchestrator,
            ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var processedBy = !string.IsNullOrEmpty(userIdStr) ? userIdStr : "system";
            try
            {
                var result = await orchestrator.ProcessAfterInspectionAsync(id, processedBy);
                return Results.Ok(new { Message = "Return request refunded", Status = "Completed", result });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        }).RequireAuthorization(Permissions.Sales.ManageReturns);

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
                return Results.BadRequest(new { message = "Có lỗi xảy ra. Vui lòng thử lại." });
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

/// <summary>
/// W0-4 — DTO checkout của KHÁCH HÀNG. Đã gỡ <c>CustomerId</c>, <c>ManualDiscount</c>,
/// <c>ShippingFee</c>: đó là ba field cho phép khách tự giảm giá về 0đ, tự đặt phí ship
/// và cắm đơn vào tài khoản người khác. Client vẫn gửi lên cũng không sao — System.Text.Json
/// bỏ qua field lạ, endpoint không 500. Ba field đó nay nằm ở <see cref="StaffCheckoutDto"/>.
/// </summary>
public record CheckoutDto(
    List<CheckoutItemDto> Items,
    string? ShippingAddress,
    string? Notes,
    string? PaymentMethod = "COD",
    bool IsPickup = false,
    string? PickupStoreId = null,
    string? PickupStoreName = null,
    string? CouponCode = null,
    // Người nhận hàng — lưu snapshot vào Order.CustomerName/CustomerPhone (không thêm cột, không migration).
    string? RecipientName = null,
    string? RecipientPhone = null
);

/// <summary>
/// W0-4 — DTO checkout của NHÂN VIÊN (POS tạm thời, RequireRole Admin/Manager/Sale).
/// Giữ các field ảnh hưởng tiền mà khách không được phép dùng. W2-3 thay bằng POS thật.
/// </summary>
public record StaffCheckoutDto(
    List<CheckoutItemDto> Items,
    string? ShippingAddress,
    string? Notes,
    string? PaymentMethod = "COD",
    bool IsPickup = false,
    string? PickupStoreId = null,
    string? PickupStoreName = null,
    string? CouponCode = null,
    string? RecipientName = null,
    string? RecipientPhone = null,
    Guid? CustomerId = null,
    decimal? ManualDiscount = null,
    decimal? ShippingFee = null
);
/// <summary>
/// W0-4 — request đã chuẩn hoá dùng chung cho <c>/checkout</c> (khách) và <c>/staff-checkout</c>.
/// Các field <c>Staff*</c> LUÔN null ở luồng khách; chỉ endpoint có RequireRole mới điền.
/// </summary>
internal sealed record LegacyCheckoutRequest(
    List<CheckoutItemDto> Items,
    string? ShippingAddress,
    string? Notes,
    string? PaymentMethod,
    bool IsPickup,
    string? PickupStoreId,
    string? PickupStoreName,
    string? CouponCode,
    string? RecipientName,
    string? RecipientPhone,
    Guid? StaffCustomerId,
    decimal? StaffManualDiscount,
    decimal? StaffShippingFee);

public record CheckoutItemDto(
    Guid ProductId,
    string ProductName,
    decimal UnitPrice,
    int Quantity,
    // Optional — nếu sản phẩm có biến thể, truyền VariantId để order lưu snapshot đúng dòng biến thể.
    Guid? VariantId = null);
public record UpdateOrderStatusDto(string Status);
public record CancelOrderDto(string Reason);
public record CreateReturnRequestDto(
    Guid OrderId,
    Guid OrderItemId,
    string Reason,
    string? Description,
    // Phase 07
    Sales.Domain.ReturnType? Type = null,
    string? AttachmentUrls = null,
    Guid? ExchangeProductId = null,
    Guid? ExchangeVariantId = null);
public record RejectReturnDto(string Reason);
public record InspectReturnDto(
    Sales.Domain.ReceivedCondition Condition,
    Guid WarehouseId,
    string? Notes = null);
public record ShipOrderDto(string? TrackingNumber, string? Carrier);
public record SetOrderAttributesDto(string? Attributes);

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
    string? ImageUrl = null,
    int StockQuantity = 999,
    // Biến thể sản phẩm — snapshot lịch sử; null nếu sản phẩm không có biến thể.
    Guid? VariantId = null,
    string? VariantName = null,
    string? VariantSku = null
);

public record AddToCartDto(
    Guid ProductId,
    string ProductName,
    decimal Price,
    int Quantity,
    // Optional — nếu sản phẩm có biến thể (RAM/SSD/màu), truyền VariantId.
    // Endpoint tự fetch snapshot VariantName/Sku từ Catalog, không tin client.
    Guid? VariantId = null
);
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