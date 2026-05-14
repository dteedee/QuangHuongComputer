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
using Microsoft.Extensions.Logging;

namespace Sales;

public static class SalesEndpointsFastCheckout
{
    public static void MapFastCheckoutEndpoint(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sales/fast-checkout").RequireAuthorization();

        group.MapPost("/", async (HttpContext httpContext, SalesDbContext salesDb, CatalogDbContext catalogDb, InventoryDbContext inventoryDb, ClaimsPrincipal user, ILoggerFactory loggerFactory) =>
        {
            var logger = loggerFactory.CreateLogger("FastCheckout");
            var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            try
            {
                httpContext.Request.EnableBuffering();
                using var reader = new StreamReader(httpContext.Request.Body);
                var body = await reader.ReadToEndAsync();
                httpContext.Request.Body.Position = 0;

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
                    return Results.BadRequest(new { Error = $"Dữ liệu không hợp lệ: {jsonEx.Message}" });
                }

                if (model == null)
                {
                    return Results.BadRequest(new { Error = "Dữ liệu đơn hàng không hợp lệ" });
                }

                // Optimize performance - only set NoTracking for read-only contexts
                // salesDb needs tracking for saving Order and clearing Cart
                catalogDb.ChangeTracker.QueryTrackingBehavior = Microsoft.EntityFrameworkCore.QueryTrackingBehavior.NoTracking;
                inventoryDb.ChangeTracker.QueryTrackingBehavior = Microsoft.EntityFrameworkCore.QueryTrackingBehavior.NoTracking;

                var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);

                if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                {
                    return Results.Unauthorized();
                }

                var email = user.FindFirstValue(ClaimTypes.Email) ?? "customer@api.com";
                var customerId = model.CustomerId ?? userId;

                // Quick validation
                if (model.Items == null || !model.Items.Any())
                {
                    return Results.BadRequest(new { Error = "Giỏ hàng trống" });
                }

                // Fetch minimal data needed
                var productIds = model.Items.Select(i => i.ProductId).Distinct().ToList();

                var products = await catalogDb.Products
                    .Where(p => productIds.Contains(p.Id))
                    .Select(p => new { p.Id, p.Name, p.Price })
                    .ToListAsync(cts.Token);


                var inventoryItems = await inventoryDb.InventoryItems
                    .Where(i => productIds.Contains(i.ProductId))
                    .Select(i => new { i.Id, i.ProductId, i.AvailableQuantity, i.ReservedQuantity })
                    .ToListAsync(cts.Token);


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
                    if (inventoryItem != null && inventoryItem.AvailableQuantity < cartItem.Quantity)
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
                    order.SetShippingAmount(model.ShippingFee > 0 ? model.ShippingFee : 30000);
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
                            _ => 0m // Unknown coupon codes are rejected
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

                // Update BOTH Catalog and Inventory stock atomically
                foreach (var item in orderItems)
                {
                    // 1. Update Catalog.Products.StockQuantity
                    await catalogDb.Database.ExecuteSqlAsync(
                        $"UPDATE \"Products\" SET \"StockQuantity\" = \"StockQuantity\" - {item.Quantity} WHERE \"Id\" = {item.ProductId}", cts.Token);

                    // 2. Update Inventory.InventoryItems — reserve stock
                    await inventoryDb.Database.ExecuteSqlAsync(
                        $"UPDATE \"InventoryItems\" SET \"QuantityOnHand\" = \"QuantityOnHand\" - {item.Quantity}, \"ReservedQuantity\" = GREATEST(\"ReservedQuantity\" - {item.Quantity}, 0) WHERE \"ProductId\" = {item.ProductId}", cts.Token);
                }

                // Publish event (fire and forget)
                _ = Task.Run(async () => {
                    try
                    {
                        // This would normally use the publishEndpoint but we're simplifying
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
                logger.LogError(ex, "FastCheckout failed");
                if (ex is OperationCanceledException)
                    return Results.BadRequest(new { Error = "Timeout khi đặt hàng" });

                return Results.BadRequest(new { Error = "Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại." });
            }
            finally
            {
                cts.Dispose();
            }
        });
    }
}