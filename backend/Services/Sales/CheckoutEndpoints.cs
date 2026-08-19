using System.Security.Claims;
using BuildingBlocks.Validation;
using Catalog.Infrastructure;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Checkout;
using Sales.Application.Pricing;
using Sales.Domain;
using Sales.Infrastructure;
using System.Text.Json;

namespace Sales;

/// <summary>
/// Phase 04 — Endpoints cho luồng checkout hợp nhất:
/// - POST /api/sales/checkout/session      → giữ chỗ 15 phút
/// - POST /api/sales/checkout/session/{id}/extend → gia hạn 1 lần
/// - POST /api/sales/checkout/orchestrate    → orchestrator (chưa wire frontend, giữ cho luồng CartId+Shipping)
/// - POST /api/sales/fast-checkout          → alias tương thích, chuyển sang orchestrator
/// - POST /api/promotions/evaluate          → preview khuyến mãi cho CheckoutPage (bug fix: endpoint này
///   trước đây KHÔNG tồn tại — frontend gọi vào khoảng trống, luôn fallback im lặng, bước "Khuyến mãi"
///   ở checkout không bao giờ hiển thị ưu đãi tự động/preview giảm giá thật.)
/// </summary>
public static class CheckoutEndpoints
{
    public static void MapCheckoutEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sales/checkout");

        // ---- Preview khuyến mãi (Content.Promotions engine) cho CheckoutPage bước 2 ----
        app.MapPost("/api/promotions/evaluate", EvaluatePromotionsAsync);

        // ---- Session giữ chỗ tồn ----
        group.MapPost("/session", CreateSessionAsync).RequireAuthorization();
        group.MapPost("/session/{id:guid}/extend", ExtendSessionAsync).RequireAuthorization();
        group.MapPost("/session/{id:guid}/cancel", CancelSessionAsync).RequireAuthorization();
        group.MapGet("/session/{id:guid}", GetSessionAsync).RequireAuthorization();

        // ---- Checkout orchestrator ----
        // NOTE: route "/orchestrate" (không phải "/") để tránh AmbiguousMatchException với
        // POST /api/sales/checkout (SalesEndpoints.cs) — endpoint mà frontend thực sự gọi.
        // Orchestrator này hiện chưa được frontend wire (frontend dùng CheckoutDto cũ qua salesApi.orders.create).
        group.MapPost("/orchestrate", async (
            CheckoutOrchestratorRequestDto model,
            CheckoutOrchestrator orchestrator,
            ClaimsPrincipal user,
            HttpContext ctx,
            CancellationToken ct) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var isGuest = string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out _);
            var customerId = isGuest ? (Guid?)null : Guid.Parse(userIdStr!);
            var email = user.FindFirstValue(ClaimTypes.Email) ?? model.GuestEmail;

            var request = new CheckoutRequest(
                CartId: model.CartId,
                CustomerId: customerId,
                GuestPhone: model.GuestPhone,
                GuestEmail: email,
                Shipping: model.Shipping,
                PaymentMethod: Enum.TryParse<PaymentMethodChoice>(model.PaymentMethod, ignoreCase: true, out var pm)
                    ? pm : PaymentMethodChoice.COD,
                PromotionCodes: model.PromotionCodes,
                CheckoutSessionId: model.CheckoutSessionId);

            var result = await orchestrator.ExecuteAsync(request, ct);
            return result.Success
                ? Results.Ok(new
                {
                    result.OrderId,
                    result.OrderNumber,
                    result.TotalAmount,
                    result.OrderStatus,
                    result.RequiresPaymentGateway
                })
                : Results.BadRequest(new { Error = result.ErrorMessage });
        }).WithValidation<CheckoutOrchestratorRequestDto>();

        // ---- Legacy alias: /api/sales/fast-checkout → orchestrator ----
        app.MapPost("/api/sales/fast-checkout", async (
            CheckoutOrchestratorRequestDto model,
            CheckoutOrchestrator orchestrator,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var uid))
                return Results.Unauthorized();
            var email = user.FindFirstValue(ClaimTypes.Email);
            var request = new CheckoutRequest(
                CartId: model.CartId,
                CustomerId: uid,
                GuestPhone: model.GuestPhone,
                GuestEmail: email,
                Shipping: model.Shipping,
                PaymentMethod: Enum.TryParse<PaymentMethodChoice>(model.PaymentMethod, ignoreCase: true, out var pm)
                    ? pm : PaymentMethodChoice.COD,
                PromotionCodes: model.PromotionCodes,
                CheckoutSessionId: model.CheckoutSessionId);
            var result = await orchestrator.ExecuteAsync(request, ct);
            return result.Success
                ? Results.Ok(new { result.OrderId, result.OrderNumber, result.TotalAmount })
                : Results.BadRequest(new { Error = result.ErrorMessage });
        }).RequireAuthorization().WithValidation<CheckoutOrchestratorRequestDto>();
    }

    // ============= Promotion preview =============

    /// <summary>
    /// Tính trước khuyến mãi (tự động + mã nhập tay) cho giỏ hàng CHƯA đặt — dùng ở CheckoutPage bước 2.
    /// Xây Cart tạm (không lưu DB) từ items request, tái dùng IPricingEngine — cùng công thức với lúc
    /// đặt hàng thật (CheckoutOrchestrator) để tránh preview khác số tiền lúc submit.
    /// LƯU Ý: promotionCode ở đây là mã Content.Promotions (tự động/nhập tay theo Priority/Exclusive),
    /// KHÁC với Coupon Content.Coupons dùng ở /cart/apply-coupon và CheckoutDto.CouponCode (hệ cũ).
    /// </summary>
    private static async Task<IResult> EvaluatePromotionsAsync(
        EvaluatePromotionRequestDto model,
        IPricingEngine pricingEngine,
        CatalogDbContext catalogDb,
        CancellationToken ct)
    {
        if (model.Items == null || model.Items.Count == 0)
            return Results.Ok(new
            {
                Subtotal = 0m,
                DiscountTotal = 0m,
                ShippingDiscount = 0m,
                FinalTotal = 0m,
                AppliedPromotions = Array.Empty<object>(),
                FreeGifts = Array.Empty<object>()
            });

        // Cart tạm — không SaveChanges, chỉ dùng làm input cho PricingEngine.
        var tempCart = new Cart(model.CustomerId ?? Guid.Empty);
        foreach (var item in model.Items)
        {
            if (item.Quantity <= 0) continue;
            tempCart.AddItem(item.ProductId, productName: string.Empty, item.UnitPrice, item.Quantity,
                item.VariantId, variantName: null, variantSku: null);
        }
        tempCart.SetShippingAmount(Math.Max(0, model.ShippingAmount ?? 0));

        var customerContext = model.CustomerId.HasValue
            ? new CustomerContext(model.CustomerId.Value, CustomerGroup: null, PreviousOrderCount: 0, IsFirstOrder: false)
            : null;
        var manualCodes = string.IsNullOrWhiteSpace(model.CouponCode)
            ? Array.Empty<string>()
            : new[] { model.CouponCode.Trim() };

        var pricing = await pricingEngine.CalculateAsync(tempCart, customerContext, manualCodes, ct);

        // Lookup tên/ảnh sản phẩm tặng (PricingResult.FreeGifts chỉ có Id/Quantity).
        var giftIds = pricing.FreeGifts.Select(g => g.ProductId).Distinct().ToList();
        var giftProducts = giftIds.Count == 0
            ? new List<(Guid Id, string Name, string? ImageUrl)>()
            : (await catalogDb.Products.AsNoTracking()
                .Where(p => giftIds.Contains(p.Id))
                .Select(p => new { p.Id, p.Name, p.ImageUrl })
                .ToListAsync(ct))
                .Select(p => (p.Id, p.Name, p.ImageUrl))
                .ToList();

        var codesUpper = manualCodes.Select(c => c.ToUpperInvariant()).ToHashSet();

        return Results.Ok(new
        {
            pricing.Subtotal,
            DiscountTotal = pricing.TotalDiscount,
            pricing.ShippingDiscount,
            FinalTotal = pricing.Total,
            AppliedPromotions = pricing.AppliedPromotions.Select(p => new
            {
                Id = p.PromotionId,
                p.Code,
                p.Name,
                p.DiscountType,
                p.DiscountAmount,
                LineProductId = p.AppliesTo.StartsWith("Line:") ? p.AppliesTo["Line:".Length..] : null,
                IsAutomatic = !codesUpper.Contains(p.Code.ToUpperInvariant())
            }),
            FreeGifts = pricing.FreeGifts.Select(g =>
            {
                var product = giftProducts.FirstOrDefault(p => p.Id == g.ProductId);
                return new
                {
                    g.ProductId,
                    ProductName = product.Name ?? "Quà tặng",
                    g.Quantity,
                    ImageUrl = product.ImageUrl
                };
            })
        });
    }

    // ============= Session handlers =============

    private static async Task<IResult> CreateSessionAsync(
        CreateSessionDto dto,
        SalesDbContext salesDb,
        InventoryDbContext inventoryDb,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? customerId = Guid.TryParse(userIdStr, out var uid) ? uid : null;

        var cart = await salesDb.Carts.Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == dto.CartId, ct);
        if (cart == null) return Results.NotFound(new { Error = "Giỏ hàng không tồn tại" });
        if (cart.Items.Count == 0) return Results.BadRequest(new { Error = "Giỏ hàng trống" });

        // Tạo session (default 15 phút).
        var session = CheckoutSession.Create(cart.Id, customerId, holdMinutes: 15);

        // Reserve tồn theo (ProductId, VariantId).
        var productIds = cart.Items.Select(i => i.ProductId).Distinct().ToList();
        var invItems = await inventoryDb.InventoryItems
            .Where(i => productIds.Contains(i.ProductId))
            .ToListAsync(ct);

        foreach (var cartItem in cart.Items.Where(i => !i.IsGift))
        {
            var inv = invItems.FirstOrDefault(i =>
                i.ProductId == cartItem.ProductId && i.VariantId == cartItem.VariantId);
            if (inv == null)
                return Results.BadRequest(new { Error = $"Không có tồn cho {cartItem.ProductName}" });
            if (inv.AvailableQuantity < cartItem.Quantity)
                return Results.BadRequest(new { Error = $"Không đủ hàng: {cartItem.ProductName} (còn {inv.AvailableQuantity})" });

            try { inv.ReserveStock(cartItem.Quantity); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }

            var reservation = new StockReservation(
                inventoryItemId: inv.Id,
                productId: cartItem.ProductId,
                variantId: cartItem.VariantId,
                quantity: cartItem.Quantity,
                referenceId: session.Id.ToString(),
                referenceType: "CheckoutSession",
                expirationHours: 1, // hết hạn theo session (15 phút) — cleanup ưu tiên session.ExpiresAt
                notes: $"CheckoutSession {session.Id}");
            inventoryDb.StockReservations.Add(reservation);
            session.AttachReservation(reservation.Id);
        }

        // Persist ReservationIds vào cột shadow.
        salesDb.CheckoutSessions.Add(session);
        salesDb.Entry(session).Property("ReservationIdsJson").CurrentValue =
            JsonSerializer.Serialize(session.ReservationIds);

        await inventoryDb.SaveChangesAsync(ct);
        await salesDb.SaveChangesAsync(ct);

        return Results.Ok(new
        {
            SessionId = session.Id,
            session.ExpiresAt,
            HoldMinutes = 15
        });
    }

    private static async Task<IResult> ExtendSessionAsync(
        Guid id, SalesDbContext salesDb, CancellationToken ct)
    {
        var session = await salesDb.CheckoutSessions.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (session == null) return Results.NotFound();
        try { session.Extend(additionalMinutes: 15); }
        catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        await salesDb.SaveChangesAsync(ct);
        return Results.Ok(new { session.ExpiresAt, session.WasExtended });
    }

    private static async Task<IResult> CancelSessionAsync(
        Guid id,
        SalesDbContext salesDb,
        InventoryDbContext inventoryDb,
        CancellationToken ct)
    {
        var session = await salesDb.CheckoutSessions.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (session == null) return Results.NotFound();

        // Nhả reservation liên kết.
        var reservations = await inventoryDb.StockReservations
            .Where(r => r.ReferenceId == session.Id.ToString() && r.Status == ReservationStatus.Active)
            .ToListAsync(ct);
        foreach (var r in reservations)
        {
            var inv = await inventoryDb.InventoryItems.FirstOrDefaultAsync(i => i.Id == r.InventoryItemId, ct);
            inv?.ReleaseReservedStock(r.Quantity);
            r.Release("Session cancelled by user");
        }
        session.Cancel();
        await inventoryDb.SaveChangesAsync(ct);
        await salesDb.SaveChangesAsync(ct);
        return Results.Ok(new { session.Status });
    }

    private static async Task<IResult> GetSessionAsync(
        Guid id, SalesDbContext salesDb, CancellationToken ct)
    {
        var session = await salesDb.CheckoutSessions.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (session == null) return Results.NotFound();
        return Results.Ok(new
        {
            session.Id,
            session.CartId,
            session.Status,
            session.ExpiresAt,
            session.WasExtended,
            RemainingSeconds = Math.Max(0, (int)(session.ExpiresAt - DateTime.UtcNow).TotalSeconds)
        });
    }
}

// ================= DTOs =================

public record CreateSessionDto(Guid CartId);

public record CheckoutOrchestratorRequestDto(
    Guid CartId,
    ShippingInfo Shipping,
    string? PaymentMethod,
    string[]? PromotionCodes = null,
    Guid? CheckoutSessionId = null,
    string? GuestPhone = null,
    string? GuestEmail = null);

// ---- POST /api/promotions/evaluate — khớp frontend EvaluatePromotionRequest (frontend/src/api/promotion.ts) ----
public record EvaluatePromotionRequestDto(
    List<EvaluatePromotionItemDto> Items,
    string? CouponCode = null,
    Guid? CustomerId = null,
    decimal? ShippingAmount = null);

public record EvaluatePromotionItemDto(
    Guid ProductId,
    Guid? VariantId,
    int Quantity,
    decimal UnitPrice);
