using System.Security.Claims;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Sales.Application.Checkout;
using Sales.Endpoints.Checkout;
using Sales.Infrastructure;

// Namespace CỐ Ý là `Sales`, không phải `Sales.Endpoints.Checkout`: ApiGateway/Program.cs gọi
// `app.MapCheckoutEndpoints()` với `using Sales;`. Đổi namespace ở đây làm hỏng build của host —
// mà Program.cs thuộc quyền sở hữu của track khác. Các lớp phụ trợ vẫn nằm ở Sales.Endpoints.Checkout.
namespace Sales;

/// <summary>
/// Mọi đường chốt đơn — tất cả đều gọi <see cref="CheckoutOrchestrator"/>.
///
/// Trước W2-3, `/api/sales/checkout` và `/api/sales/public/guest-checkout` có thân xử lý VIẾT TAY
/// dài ~500 dòng ngay trong <c>SalesEndpoints.cs</c>: tự tính tiền, tự trừ tồn, không giữ chỗ,
/// không dùng <c>PricingEngine</c> — trong khi orchestrator (đường "đúng") thì không ai gọi.
/// Hai thân xử lý đó đã bị XOÁ; các route giữ nguyên đường dẫn và hình dạng request để frontend
/// đang chạy không phải đổi gì.
/// </summary>
public static class CheckoutEndpoints
{
    public static void MapCheckoutEndpoints(this IEndpointRouteBuilder app)
    {
        var sessionGroup = app.MapGroup("/api/sales/checkout");
        CheckoutSessionEndpoints.Map(sessionGroup);
        PromotionPreviewEndpoints.Map(app);
        GuestOrderTrackingEndpoints.Map(app);
        GuestCartEndpoints.Map(app);

        // ---- Khách đã đăng nhập: POST /api/sales/checkout (đường frontend đang dùng) ----
        app.MapPost("/api/sales/checkout", async (
            CheckoutDto model,
            SalesDbContext salesDb,
            CheckoutOrchestrator orchestrator,
            ClaimsPrincipal user,
            HttpContext http,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var customerId))
                return Results.Unauthorized();

            var cart = await CheckoutCartResolver.ForCustomerAsync(salesDb, customerId, ct);
            var sync = CheckoutCartResolver.SyncLines(cart, ToLines(model.Items));
            if (sync != null) return Results.BadRequest(new { Error = sync });
            await salesDb.SaveChangesAsync(ct);

            var request = new CheckoutRequest
            {
                CartId = cart.Id,
                Channel = CheckoutChannel.Web,
                CustomerId = customerId,
                GuestEmail = user.FindFirstValue(ClaimTypes.Email),
                Shipping = BuildShipping(model),
                PaymentMethod = ParseMethod(model.PaymentMethod),
                PromotionCodes = string.IsNullOrWhiteSpace(model.CouponCode)
                    ? null : new[] { model.CouponCode },
                CustomerIp = http.Connection.RemoteIpAddress?.ToString(),
                CustomerUserAgent = http.Request.Headers.UserAgent.ToString(),
            };

            return Respond(await orchestrator.ExecuteAsync(request, ct));
        }).RequireAuthorization(SecurityPolicies.Authenticated).WithValidation<CheckoutDto>();

        // ---- Khách vãng lai: POST /api/sales/public/guest-checkout ----
        app.MapPost("/api/sales/public/guest-checkout", async (
            GuestCheckoutDto model,
            SalesDbContext salesDb,
            CheckoutOrchestrator orchestrator,
            HttpContext http,
            CancellationToken ct) =>
        {
            var anonymousId = GuestCartEndpoints.ResolveAnonymousId(http);

            var cart = await CheckoutCartResolver.ForGuestAsync(salesDb, anonymousId, ct);
            var sync = CheckoutCartResolver.SyncLines(cart,
                model.Items.Select(i => (i.ProductId, (Guid?)null, i.Quantity)).ToList());
            if (sync != null) return Results.BadRequest(new { Error = sync });
            await salesDb.SaveChangesAsync(ct);

            var request = new CheckoutRequest
            {
                CartId = cart.Id,
                Channel = CheckoutChannel.Guest,
                AnonymousId = anonymousId,
                GuestEmail = model.CustomerEmail,
                GuestPhone = model.CustomerPhone,
                Shipping = new ShippingInfo(
                    RecipientName: model.CustomerName,
                    Phone: model.CustomerPhone,
                    StreetAddress: model.ShippingAddress,
                    Ward: null, District: null, Province: null,
                    ShippingFee: 0m,
                    Notes: model.Notes),
                PaymentMethod = ParseMethod(model.PaymentMethod),
                PromotionCodes = string.IsNullOrWhiteSpace(model.CouponCode)
                    ? null : new[] { model.CouponCode },
                CustomerIp = http.Connection.RemoteIpAddress?.ToString(),
                CustomerUserAgent = http.Request.Headers.UserAgent.ToString(),
            };

            return Respond(await orchestrator.ExecuteAsync(request, ct));
        }).AllowAnonymous();

        // ---- Nhân viên lập đơn tại quầy: POST /api/sales/staff-checkout ----
        // Giữ đường dẫn cũ làm alias một wave; POS thật là /api/sales/pos/orders của W2-10.
        app.MapPost("/api/sales/staff-checkout", async (
            StaffCheckoutDto model,
            SalesDbContext salesDb,
            CheckoutOrchestrator orchestrator,
            ClaimsPrincipal user,
            HttpContext http,
            CancellationToken ct) =>
        {
            var staffId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var customerId = model.CustomerId ?? Guid.Empty;

            var cart = customerId != Guid.Empty
                ? await CheckoutCartResolver.ForCustomerAsync(salesDb, customerId, ct)
                : await CheckoutCartResolver.ForGuestAsync(salesDb, $"pos:{staffId}", ct);

            var sync = CheckoutCartResolver.SyncLines(cart, ToLines(model.Items));
            if (sync != null) return Results.BadRequest(new { Error = sync });
            await salesDb.SaveChangesAsync(ct);

            // Đường cũ không truyền cửa hàng — tra cửa hàng đang hoạt động thay vì bịa một mã.
            var storeId = await DefaultStoreResolver.ResolveAsync(salesDb, ct);
            if (storeId == null)
                return Results.BadRequest(new { Error = "Chưa khai báo cửa hàng nào, không thể lập đơn tại quầy" });

            var request = new CheckoutRequest
            {
                CartId = cart.Id,
                Channel = CheckoutChannel.Pos,
                CustomerId = customerId == Guid.Empty ? null : customerId,
                Shipping = BuildShipping(model.ShippingAddress, model.Notes, model.RecipientName,
                    model.RecipientPhone, model.ShippingFee ?? 0m, model.IsPickup,
                    model.PickupStoreId, model.PickupStoreName),
                PaymentMethod = ParseMethod(model.PaymentMethod),
                PromotionCodes = string.IsNullOrWhiteSpace(model.CouponCode)
                    ? null : new[] { model.CouponCode },
                StoreId = storeId,
                CashierId = Guid.TryParse(staffId, out var sid) ? sid : null,
                ManualDiscount = model.ManualDiscount,
                ApprovedBy = staffId,
                CustomerIp = http.Connection.RemoteIpAddress?.ToString(),
            };

            return Respond(await orchestrator.ExecuteAsync(request, ct));
        }).RequireAuthorization(Permissions.Sales.Pos).WithValidation<StaffCheckoutDto>();

        // ---- Orchestrator trực tiếp (giỏ đã có trên server) ----
        app.MapPost("/api/sales/checkout/orchestrate", async (
            CheckoutOrchestratorRequestDto model,
            CheckoutOrchestrator orchestrator,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var customerId))
                return Results.Unauthorized();

            return Respond(await orchestrator.ExecuteAsync(new CheckoutRequest
            {
                CartId = model.CartId,
                Channel = CheckoutChannel.Web,
                CustomerId = customerId,
                GuestEmail = user.FindFirstValue(ClaimTypes.Email) ?? model.GuestEmail,
                GuestPhone = model.GuestPhone,
                Shipping = model.Shipping,
                PaymentMethod = ParseMethod(model.PaymentMethod),
                PromotionCodes = model.PromotionCodes,
                CheckoutSessionId = model.CheckoutSessionId,
            }, ct));
        }).RequireAuthorization(SecurityPolicies.Authenticated).WithValidation<CheckoutOrchestratorRequestDto>();

        // ---- Alias cũ: /api/sales/fast-checkout ----
        app.MapPost("/api/sales/fast-checkout", async (
            CheckoutOrchestratorRequestDto model,
            CheckoutOrchestrator orchestrator,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var customerId))
                return Results.Unauthorized();

            return Respond(await orchestrator.ExecuteAsync(new CheckoutRequest
            {
                CartId = model.CartId,
                Channel = CheckoutChannel.Web,
                CustomerId = customerId,
                GuestEmail = user.FindFirstValue(ClaimTypes.Email),
                Shipping = model.Shipping,
                PaymentMethod = ParseMethod(model.PaymentMethod),
                PromotionCodes = model.PromotionCodes,
                CheckoutSessionId = model.CheckoutSessionId,
            }, ct));
        }).RequireAuthorization(SecurityPolicies.Authenticated).WithValidation<CheckoutOrchestratorRequestDto>();
    }

    private static IResult Respond(CheckoutResult result) => result.Success
        ? Results.Ok(new
        {
            result.OrderId,
            result.OrderNumber,
            result.TotalAmount,
            result.TaxAmount,
            result.OrderStatus,
            result.RequiresPaymentGateway,
        })
        : Results.BadRequest(new { Error = result.ErrorMessage });

    private static PaymentMethodChoice ParseMethod(string? raw)
        => Enum.TryParse<PaymentMethodChoice>(raw, ignoreCase: true, out var parsed)
            ? parsed
            : PaymentMethodChoice.COD;

    private static List<(Guid, Guid?, int)> ToLines(IEnumerable<CheckoutItemDto>? items)
        => items?.Select(i => (i.ProductId, i.VariantId, i.Quantity)).ToList()
           ?? new List<(Guid, Guid?, int)>();

    private static ShippingInfo BuildShipping(CheckoutDto model) => BuildShipping(
        model.ShippingAddress, model.Notes, model.RecipientName, model.RecipientPhone,
        0m, model.IsPickup, model.PickupStoreId, model.PickupStoreName);

    private static ShippingInfo BuildShipping(
        string? address, string? notes, string? recipientName, string? recipientPhone,
        decimal shippingFee, bool isPickup, string? pickupStoreId, string? pickupStoreName)
        => new(
            RecipientName: recipientName ?? string.Empty,
            Phone: recipientPhone ?? string.Empty,
            StreetAddress: address,
            Ward: null, District: null, Province: null,
            ShippingFee: shippingFee,
            IsPickup: isPickup,
            PickupStoreId: pickupStoreId,
            PickupStoreName: pickupStoreName,
            Notes: notes);
}

public record CreateSessionDto(Guid CartId);

public record CheckoutOrchestratorRequestDto(
    Guid CartId,
    ShippingInfo Shipping,
    string? PaymentMethod,
    string[]? PromotionCodes = null,
    Guid? CheckoutSessionId = null,
    string? GuestPhone = null,
    string? GuestEmail = null);
