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
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace Sales;

public static class SalesEndpointsFastCheckout
{
    public static void MapFastCheckoutEndpoint(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sales/fast-checkout").RequireAuthorization();

        group.MapPost("/", async (HttpContext httpContext, SalesDbContext salesDb, CatalogDbContext catalogDb, InventoryDbContext inventoryDb, ClaimsPrincipal user) =>
        {
            var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15)); // 15 second timeout for fast checkout
            try
            {
                // Read and parse request body manually for better error handling
                httpContext.Request.EnableBuffering();
                using var reader = new StreamReader(httpContext.Request.Body);
                var body = await reader.ReadToEndAsync();
                httpContext.Request.Body.Position = 0;

                Console.WriteLine($"[FastCheckout] Raw request body: {body}");

                CheckoutDto? model;
                try
                {
                    model = JsonSerializer.Deserialize<CheckoutDto>(body, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                }
                catch (JsonException jsonEx)
                {
                    Console.WriteLine($"[FastCheckout] JSON Parse Error: {jsonEx.Message}");
                    return Results.BadRequest(new { Error = $"Dữ liệu không hợp lệ: {jsonEx.Message}" });
                }

                if (model == null)
                {
                    Console.WriteLine("[FastCheckout] Model is null after parsing");
                    return Results.BadRequest(new { Error = "Dữ liệu đơn hàng không hợp lệ" });
                }

                // Log incoming request for debugging
                Console.WriteLine($"[FastCheckout] Received request with {model.Items?.Count ?? 0} items");

                // Optimize performance - only set NoTracking for read-only contexts
                // salesDb needs tracking for saving Order and clearing Cart
                catalogDb.ChangeTracker.QueryTrackingBehavior = Microsoft.EntityFrameworkCore.QueryTrackingBehavior.NoTracking;
                inventoryDb.ChangeTracker.QueryTrackingBehavior = Microsoft.EntityFrameworkCore.QueryTrackingBehavior.NoTracking;

                var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
                Console.WriteLine($"[FastCheckout] User ID: {userIdStr}");

                if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                {
                    Console.WriteLine("[FastCheckout] Unauthorized - Invalid user ID");
                    return Results.Unauthorized();
                }

                var email = user.FindFirstValue(ClaimTypes.Email) ?? "customer@api.com";
                var customerId = model.CustomerId ?? userId;
                Console.WriteLine($"[FastCheckout] Customer ID: {customerId}, Email: {email}");

                // Quick validation
                if (model.Items == null || !model.Items.Any())
                {
                    Console.WriteLine("[FastCheckout] Error: Cart is empty");
                    return Results.BadRequest(new { Error = "Giỏ hàng trống" });
                }

                // Log items for debugging
                foreach (var item in model.Items)
                {
                    Console.WriteLine($"[FastCheckout] Item: ProductId={item.ProductId}, Name={item.ProductName}, Qty={item.Quantity}, Price={item.UnitPrice}");
                }

                // Fetch minimal data needed
                var productIds = model.Items.Select(i => i.ProductId).Distinct().ToList();
                Console.WriteLine($"[FastCheckout] Looking for {productIds.Count} products: {string.Join(", ", productIds)}");

                var products = await catalogDb.Products
                    .Where(p => productIds.Contains(p.Id))
                    .Select(p => new { p.Id, p.Name, p.Price })
                    .ToListAsync(cts.Token);

                Console.WriteLine($"[FastCheckout] Found {products.Count} products in catalog");

                var inventoryItems = await inventoryDb.InventoryItems
                    .Where(i => productIds.Contains(i.ProductId))
                    .Select(i => new { i.Id, i.ProductId, i.AvailableQuantity, i.ReservedQuantity })
                    .ToListAsync(cts.Token);

                Console.WriteLine($"[FastCheckout] Found {inventoryItems.Count} inventory items");

                // Get cart
                var cart = await salesDb.Carts
                    .Include(c => c.Items)
                    .FirstOrDefaultAsync(c => c.CustomerId == customerId, cts.Token);

                // Create order items directly
                var orderItems = new List<OrderItem>();
                foreach (var cartItem in model.Items)
                {
                    var product = products.FirstOrDefault(p => p.Id == cartItem.ProductId);
                    if (product == null)
                        return Results.BadRequest(new { Error = $"Sản phẩm không tìm thấy: {cartItem.ProductId}" });

                    var inventoryItem = inventoryItems.FirstOrDefault(i => i.ProductId == cartItem.ProductId);
                    if (inventoryItem != null && inventoryItem.AvailableQuantity + inventoryItem.ReservedQuantity < cartItem.Quantity)
                        return Results.BadRequest(new { Error = $"Không đủ hàng cho {product.Name}" });

                    orderItems.Add(new OrderItem(product.Id, product.Name, product.Price, cartItem.Quantity));
                }

                // Create order with minimal processing
                var order = new Order(
                    customerId: customerId,
                    shippingAddress: model.IsPickup ? (model.PickupStoreName ?? "Nhận tại cửa hàng") : (model.ShippingAddress ?? ""),
                    items: orderItems,
                    taxRate: 0.1m,
                    notes: model.Notes ?? "",
                    customerIp: "127.0.0.1",
                    customerUserAgent: "Web App",
                    sourceId: Guid.Parse("00000000-0000-0000-0000-000000000001")
                );

                if (model.IsPickup)
                {
                    order.SetShippingAmount(0);
                }
                else
                {
                    order.SetShippingAmount(30000); // Default shipping
                }

                // Apply manual discount if any
                if (model.ManualDiscount.HasValue && model.ManualDiscount.Value > 0)
                {
                    order.ApplyCoupon("POS-MANUAL", model.ManualDiscount.Value, "{}", "POS Manual Discount");
                }

                // Apply coupon code if provided
                var couponToApply = !string.IsNullOrEmpty(model.CouponCode) ? model.CouponCode : cart?.CouponCode;
                if (!string.IsNullOrEmpty(couponToApply) && order.DiscountAmount == 0)
                {
                    var discountAmount = cart?.DiscountAmount ?? 0;

                    // Calculate discount if not from cart
                    if (discountAmount == 0)
                    {
                        var subtotal = order.Items.Sum(i => i.UnitPrice * i.Quantity);
                        discountAmount = couponToApply.ToUpper() switch
                        {
                            "SAVE10" => subtotal * 0.1m,
                            "SAVE20" => subtotal * 0.2m,
                            "SAVE15" => subtotal * 0.15m,
                            "FREESHIP" => order.ShippingAmount,
                            _ => subtotal * 0.05m
                        };
                    }

                    if (discountAmount > 0)
                    {
                        order.ApplyCoupon(couponToApply.ToUpper(), discountAmount,
                            $"{{\"code\":\"{couponToApply}\",\"discount\":{discountAmount}}}", "Checkout Coupon");
                    }
                }

                // Clear cart
                if (cart != null)
                {
                    cart.Clear();
                    cart.RemoveCoupon();
                }

                // Save all changes
                await salesDb.Orders.AddAsync(order, cts.Token);
                await salesDb.SaveChangesAsync(cts.Token);

                // Update product stock (simple update using raw SQL - no SaveChanges needed)
                foreach (var item in orderItems)
                {
                    // Use parameterized query to prevent SQL injection
                    await catalogDb.Database.ExecuteSqlAsync(
                        $"UPDATE \"Products\" SET \"StockQuantity\" = \"StockQuantity\" - {item.Quantity} WHERE \"Id\" = {item.ProductId}", cts.Token);
                }

                // Publish event (fire and forget)
                _ = Task.Run(async () => {
                    try
                    {
                        // This would normally use the publishEndpoint but we're simplifying
                        Console.WriteLine($"Order created: {order.OrderNumber}");
                    }
                    catch { /* Ignore errors for fire and forget */ }
                });

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
                Console.WriteLine($"[FastCheckout Error] {ex.GetType().Name}: {ex.Message}");
                Console.WriteLine($"[FastCheckout Stack] {ex.StackTrace}");

                if (ex is OperationCanceledException)
                    return Results.BadRequest(new { Error = "Timeout khi đặt hàng" });

                // Return more specific error for debugging
                var innerMessage = ex.InnerException?.Message;
                var errorMessage = !string.IsNullOrEmpty(innerMessage)
                    ? $"Lỗi: {ex.Message} - {innerMessage}"
                    : $"Lỗi: {ex.Message}";

                return Results.BadRequest(new { Error = errorMessage });
            }
            finally
            {
                cts.Dispose();
            }
        });
    }
}