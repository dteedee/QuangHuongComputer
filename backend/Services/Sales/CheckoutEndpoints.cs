using System.Security.Claims;
using BuildingBlocks.Validation;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Checkout;
using Sales.Domain;
using Sales.Infrastructure;
using System.Text.Json;

namespace Sales;

/// <summary>
/// Phase 04 — Endpoints cho luồng checkout hợp nhất:
/// - POST /api/sales/checkout/session      → giữ chỗ 15 phút
/// - POST /api/sales/checkout/session/{id}/extend → gia hạn 1 lần
/// - POST /api/sales/checkout               → orchestrator (thay thế /checkout cũ + /fast-checkout)
/// - POST /api/sales/fast-checkout          → alias tương thích, chuyển sang orchestrator
/// </summary>
public static class CheckoutEndpoints
{
    public static void MapCheckoutEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sales/checkout");

        // ---- Session giữ chỗ tồn ----
        group.MapPost("/session", CreateSessionAsync).RequireAuthorization();
        group.MapPost("/session/{id:guid}/extend", ExtendSessionAsync).RequireAuthorization();
        group.MapPost("/session/{id:guid}/cancel", CancelSessionAsync).RequireAuthorization();
        group.MapGet("/session/{id:guid}", GetSessionAsync).RequireAuthorization();

        // ---- Checkout orchestrator ----
        group.MapPost("/", async (
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
