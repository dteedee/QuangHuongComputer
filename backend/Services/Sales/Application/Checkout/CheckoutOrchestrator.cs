using BuildingBlocks.Messaging.IntegrationEvents;
using Catalog.Infrastructure;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Sales.Application.Pricing;
using Sales.Domain;
using Sales.Infrastructure;
using System.Text.Json;

namespace Sales.Application.Checkout;

/// <summary>
/// Phase 04 — Hợp nhất 2 đường checkout (SalesEndpoints:/checkout + SalesEndpointsFastCheckout).
/// - Dùng InventoryItem.ReserveStock/ConfirmReservedStock qua domain method (bỏ ExecuteSqlAsync UPDATE thô).
/// - Giữ tối ưu tốc độ: AsNoTracking cho Catalog, truy vấn gộp.
/// - Nếu có CheckoutSessionId → tồn đã giữ trước; nếu không → tạo reservation tại chỗ.
/// - COD → OrderStatus=Pending; Online → OrderStatus=Pending + PaymentStatus=Pending (chờ webhook).
/// </summary>
public class CheckoutOrchestrator
{
    private readonly SalesDbContext _salesDb;
    private readonly InventoryDbContext _inventoryDb;
    private readonly CatalogDbContext _catalogDb;
    private readonly IPricingEngine _pricingEngine;
    private readonly IPublishEndpoint _bus;
    private readonly ILogger<CheckoutOrchestrator> _logger;

    public CheckoutOrchestrator(
        SalesDbContext salesDb,
        InventoryDbContext inventoryDb,
        CatalogDbContext catalogDb,
        IPricingEngine pricingEngine,
        IPublishEndpoint bus,
        ILogger<CheckoutOrchestrator> logger)
    {
        _salesDb = salesDb;
        _inventoryDb = inventoryDb;
        _catalogDb = catalogDb;
        _pricingEngine = pricingEngine;
        _bus = bus;
        _logger = logger;
    }

    public async Task<CheckoutResult> ExecuteAsync(CheckoutRequest req, CancellationToken ct)
    {
        // 1. Load cart
        var cart = await _salesDb.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == req.CartId, ct);
        if (cart == null)
            return CheckoutResult.Failure("Giỏ hàng không tồn tại");
        if (cart.Items.Count == 0)
            return CheckoutResult.Failure("Giỏ hàng trống");

        // 2. Load session (nếu có) — validate chưa hết hạn.
        CheckoutSession? session = null;
        if (req.CheckoutSessionId.HasValue)
        {
            session = await _salesDb.CheckoutSessions
                .FirstOrDefaultAsync(s => s.Id == req.CheckoutSessionId.Value, ct);
            if (session == null)
                return CheckoutResult.Failure("Phiên checkout không tồn tại");
            if (session.IsExpired())
                return CheckoutResult.Failure("Phiên checkout đã hết hạn, vui lòng tạo phiên mới");
            if (session.Status != CheckoutSessionStatus.Active)
                return CheckoutResult.Failure($"Phiên checkout ở trạng thái {session.Status}, không thể tiếp tục");
        }

        // 3. Fetch products + inventory + variant snapshots (parallel, AsNoTracking cho read-only Catalog).
        var productIds = cart.Items.Select(i => i.ProductId).Distinct().ToList();
        var variantIds = cart.Items.Where(i => i.VariantId.HasValue)
            .Select(i => i.VariantId!.Value).Distinct().ToList();

        var productsTask = _catalogDb.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Name, p.Price, p.Sku })
            .ToListAsync(ct);
        var inventoryTask = _inventoryDb.InventoryItems
            .Where(i => productIds.Contains(i.ProductId))
            .ToListAsync(ct);
        var variantTask = variantIds.Any()
            ? _catalogDb.ProductVariants.AsNoTracking()
                .Where(v => variantIds.Contains(v.Id))
                .Select(v => new { v.Id, v.Name, v.Sku })
                .ToListAsync(ct)
            : Task.FromResult(new List<dynamic>().Select(x => new { Id = Guid.Empty, Name = "", Sku = "" }).ToList());

        await Task.WhenAll(productsTask, inventoryTask, variantTask);
        var products = await productsTask;
        var inventoryItems = await inventoryTask;
        var variantSnapshots = (await variantTask).ToDictionary(v => v.Id, v => (v.Name, v.Sku));

        // 4. Kiểm tra stock — nếu KHÔNG có session, phải reserve tại chỗ.
        //    Nếu có session, reservation đã tạo lúc CreateSession → chỉ verify Confirm được.
        foreach (var cartItem in cart.Items.Where(i => !i.IsGift))
        {
            var invItem = inventoryItems.FirstOrDefault(i =>
                i.ProductId == cartItem.ProductId && i.VariantId == cartItem.VariantId);
            if (invItem == null)
                return CheckoutResult.Failure($"Sản phẩm không có trong kho: {cartItem.ProductName}");

            if (session == null)
            {
                // Chưa reserve — reserve luôn.
                if (invItem.AvailableQuantity < cartItem.Quantity)
                    return CheckoutResult.Failure($"Không đủ hàng: {cartItem.ProductName} (còn {invItem.AvailableQuantity})");
                try
                {
                    invItem.ReserveStock(cartItem.Quantity);
                }
                catch (InvalidOperationException ex)
                {
                    return CheckoutResult.Failure(ex.Message);
                }
            }
            else
            {
                // Đã reserve — cần đủ ReservedQuantity.
                if (invItem.ReservedQuantity < cartItem.Quantity)
                    return CheckoutResult.Failure($"Reservation không đủ cho {cartItem.ProductName}");
            }
        }

        // 5. Gọi PricingEngine — snapshot promotions đã áp.
        var customerContext = req.CustomerId.HasValue
            ? new CustomerContext(req.CustomerId.Value, CustomerGroup: null,
                PreviousOrderCount: 0, IsFirstOrder: false)
            : null;
        var pricing = await _pricingEngine.CalculateAsync(cart, customerContext, req.PromotionCodes, ct);

        // 6. Build OrderItems (bao gồm gift items từ pricing.FreeGifts).
        var orderItems = new List<OrderItem>();
        foreach (var cartItem in cart.Items.Where(i => !i.IsGift))
        {
            var product = products.First(p => p.Id == cartItem.ProductId);
            string? vName = null, vSku = null;
            if (cartItem.VariantId.HasValue && variantSnapshots.TryGetValue(cartItem.VariantId.Value, out var vs))
            {
                vName = vs.Name; vSku = vs.Sku;
            }
            orderItems.Add(new OrderItem(
                product.Id, product.Name, product.Price, cartItem.Quantity,
                productSku: product.Sku, originalPrice: null,
                variantId: cartItem.VariantId, variantName: vName, variantSku: vSku));
        }
        // Thêm hàng tặng từ PricingResult.
        foreach (var gift in pricing.FreeGifts)
        {
            var giftProduct = products.FirstOrDefault(p => p.Id == gift.ProductId);
            if (giftProduct == null) continue; // Bỏ qua nếu sản phẩm gift không có trong Catalog (an toàn).
            string? gvName = null, gvSku = null;
            if (gift.VariantId.HasValue && variantSnapshots.TryGetValue(gift.VariantId.Value, out var gvs))
            {
                gvName = gvs.Name; gvSku = gvs.Sku;
            }
            orderItems.Add(new OrderItem(
                giftProduct.Id, giftProduct.Name, 0m, gift.Quantity,
                productSku: giftProduct.Sku, originalPrice: null,
                variantId: gift.VariantId, variantName: gvName, variantSku: gvSku,
                isGift: true, appliedPromotionCode: gift.PromotionCode));
        }

        // 7. Tạo Order (snapshot toàn bộ).
        var order = new Order(
            customerId: req.CustomerId ?? Guid.NewGuid(), // Guest → sinh mới
            shippingAddress: req.Shipping.FormatFull(),
            items: orderItems,
            taxRate: cart.TaxRate,
            notes: req.Shipping.Notes,
            customerIp: null,
            customerUserAgent: null,
            sourceId: null,
            paymentMethod: req.PaymentMethod.ToString(),
            isPickup: req.Shipping.IsPickup,
            pickupStoreId: req.Shipping.PickupStoreId,
            pickupStoreName: req.Shipping.PickupStoreName,
            customerName: req.Shipping.RecipientName,
            customerEmail: req.GuestEmail,
            customerPhone: req.Shipping.Phone);

        order.SetShippingAmount(req.Shipping.ShippingFee);
        var appliedPromoJson = JsonSerializer.Serialize(pricing.AppliedPromotions);
        order.ApplyPricingResult(
            discountAmount: pricing.TotalDiscount,
            shippingDiscount: pricing.ShippingDiscount,
            appliedPromotionsJson: appliedPromoJson,
            couponCode: req.PromotionCodes?.FirstOrDefault());

        _salesDb.Orders.Add(order);

        // 8. Confirm reservation → trừ tồn thật (qua domain method, KHÔNG SQL UPDATE thô).
        foreach (var item in orderItems.Where(i => !i.IsGift))
        {
            var invItem = inventoryItems.First(i =>
                i.ProductId == item.ProductId && i.VariantId == item.VariantId);
            try
            {
                invItem.ConfirmReservedStock(item.Quantity);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "ConfirmReservedStock thất bại cho product {ProductId}", item.ProductId);
                return CheckoutResult.Failure($"Không thể xác nhận tồn: {item.ProductName}");
            }
        }

        // 9. Fulfill reservations liên kết Session/Cart.
        if (session != null)
        {
            session.Complete();
            var reservationIds = session.ReservationIds.ToList();
            if (reservationIds.Any())
            {
                var reservations = await _inventoryDb.StockReservations
                    .Where(r => reservationIds.Contains(r.Id) && r.Status == ReservationStatus.Active)
                    .ToListAsync(ct);
                foreach (var r in reservations) r.Fulfill();
            }
        }
        else
        {
            // Fulfill reservation cấp Cart (nếu Cart đã tạo trước đó qua /cart/items).
            var cartReservations = await _inventoryDb.StockReservations
                .Where(r => r.ReferenceId == cart.Id.ToString()
                            && r.Status == ReservationStatus.Active)
                .ToListAsync(ct);
            foreach (var r in cartReservations) r.Fulfill();
        }

        // 10. Clear cart.
        cart.Clear();
        cart.RemoveCoupon();

        // 11. Set OrderStatus theo phương thức thanh toán.
        //     COD → Pending (chờ shop xác nhận), Online → Pending + đợi webhook đổi PaymentStatus.
        //     KHÔNG SetStatus Confirmed ở đây — để flow xác nhận qua admin/hoặc payment.
        // (Order khởi tạo Status=Pending mặc định)

        // 12. Save changes tuần tự (tránh race giữa 3 DbContext).
        try
        {
            await _inventoryDb.SaveChangesAsync(ct);
            await _salesDb.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Save changes thất bại cho cart {CartId}", cart.Id);
            return CheckoutResult.Failure("Không thể lưu đơn hàng. Vui lòng thử lại.");
        }

        // 13. Publish integration event (non-blocking) — email/notification consumer sẽ xử lý.
        var customerEmail = req.GuestEmail ?? "customer@api.com";
        _ = _bus.Publish(new OrderCreatedIntegrationEvent(
            order.Id, order.CustomerId, customerEmail,
            order.TotalAmount, order.OrderNumber), ct);

        return CheckoutResult.SuccessResult(
            orderId: order.Id,
            orderNumber: order.OrderNumber,
            totalAmount: order.TotalAmount,
            orderStatus: order.Status.ToString(),
            requiresPaymentGateway: req.PaymentMethod != PaymentMethodChoice.COD);
    }
}

// ===== Request/Result DTOs (nằm chung file — <200 dòng, cùng nghiệp vụ Checkout) =====

public record CheckoutRequest(
    Guid CartId,
    Guid? CustomerId,
    string? GuestPhone,
    string? GuestEmail,
    ShippingInfo Shipping,
    PaymentMethodChoice PaymentMethod,
    string[]? PromotionCodes,
    Guid? CheckoutSessionId);

public record ShippingInfo(
    string RecipientName,
    string Phone,
    string? StreetAddress,
    string? Ward,
    string? District,
    string? Province,
    decimal ShippingFee,
    bool IsPickup = false,
    string? PickupStoreId = null,
    string? PickupStoreName = null,
    string? Notes = null)
{
    public string FormatFull()
    {
        if (IsPickup) return PickupStoreName ?? "Nhận tại cửa hàng";
        return string.Join(", ", new[] { StreetAddress, Ward, District, Province }
            .Where(x => !string.IsNullOrWhiteSpace(x)));
    }
}

public enum PaymentMethodChoice
{
    COD = 0,
    VNPay = 1,
    MoMo = 2,
    ZaloPay = 3,
    SePay = 4,
    Installment = 5
}

public class CheckoutResult
{
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public Guid? OrderId { get; init; }
    public string? OrderNumber { get; init; }
    public decimal? TotalAmount { get; init; }
    public string? OrderStatus { get; init; }
    public bool RequiresPaymentGateway { get; init; }

    public static CheckoutResult Failure(string reason) => new() { Success = false, ErrorMessage = reason };

    public static CheckoutResult SuccessResult(
        Guid orderId, string orderNumber, decimal totalAmount,
        string orderStatus, bool requiresPaymentGateway) => new()
    {
        Success = true,
        OrderId = orderId,
        OrderNumber = orderNumber,
        TotalAmount = totalAmount,
        OrderStatus = orderStatus,
        RequiresPaymentGateway = requiresPaymentGateway
    };
}
