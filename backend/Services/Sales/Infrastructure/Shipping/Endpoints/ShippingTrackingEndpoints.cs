using System.Security.Claims;
using System.Text.Json;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Payments.Application.Webhooks;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Infrastructure.Shipping.Endpoints;

/// <summary>
/// Tra vận đơn (nhân viên/khách đã đăng nhập) + webhook trạng thái GHN.
///
/// W1-10 BÀN GIAO W2 (IDOR): endpoint cũ chỉ yêu cầu <c>Authenticated</c>, không kiểm chủ sở hữu —
/// bất kỳ tài khoản nào đoán được <c>orderId</c> (GUID tuần tự dễ liệt kê qua các đơn của chính họ)
/// đều đọc được địa chỉ giao hàng của người khác. Track W2-11 đóng lỗ này: CHỦ đơn hoặc nhân viên có
/// <c>Sales.ViewAll</c> mới xem được. Khách vãng lai tra đơn qua route riêng đã có sẵn
/// (<c>GET /api/sales/public/orders/track?orderNumber=&amp;phone=</c>, <c>GuestOrderTrackingEndpoints</c>,
/// W2-3) — không đụng tới ở đây.
/// </summary>
internal static class ShippingTrackingEndpoints
{
    public static void MapAuthenticated(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/shipping/tracking/{orderId:guid}", async (
            Guid orderId, ClaimsPrincipal user, SalesDbContext db, CancellationToken ct) =>
        {
            var order = await db.Orders
                .AsNoTracking()
                .Where(o => o.Id == orderId)
                .Select(o => new
                {
                    o.Id, o.OrderNumber, o.CustomerId, Status = o.Status.ToString(),
                    o.DeliveryTrackingNumber, o.DeliveryCarrier,
                    o.ShippedAt, o.DeliveredAt, o.ShippingAddress
                })
                .FirstOrDefaultAsync(ct);

            if (order == null) throw NotFoundException.For("đơn hàng", orderId);
            if (!user.CanViewOrderShipment(order.CustomerId)) throw new ForbiddenException();

            return Results.Ok(new
            {
                order.Id, order.OrderNumber, order.Status,
                order.DeliveryTrackingNumber, order.DeliveryCarrier,
                order.ShippedAt, order.DeliveredAt, order.ShippingAddress
            });
        }).RequireAuthorization(SecurityPolicies.Authenticated);
    }

    public static void MapWebhook(IEndpointRouteBuilder app)
    {
        // GHN webhook — cập nhật trạng thái giao hàng. W0-10: FAIL-CLOSED (token chưa cấu hình = 503,
        // không còn "ai gọi cũng được" như trước).
        app.MapPost("/api/shipping/webhook", async (
            HttpContext ctx, SalesDbContext db, IConfiguration config, ILoggerFactory lf) =>
        {
            var logger = lf.CreateLogger("GHNWebhook");
            var expectedToken = config["Shipping:GHN:WebhookToken"];

            if (!WebhookSignature.IsConfiguredSecret(expectedToken))
            {
                logger.LogError("GHN webhook bị gọi nhưng Shipping:GHN:WebhookToken CHƯA cấu hình — từ chối 503");
                return Results.Json(
                    new { error = "SHIPPING_WEBHOOK_NOT_CONFIGURED", message = "Webhook vận chuyển chưa được cấu hình" },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            var token = ctx.Request.Headers["Token"].ToString();
            if (!WebhookSignature.FixedTimeEquals(expectedToken!.Trim(), token.Trim()))
            {
                logger.LogWarning("GHN webhook: token sai — từ chối 401");
                return Results.Json(new { error = "INVALID_TOKEN" }, statusCode: StatusCodes.Status401Unauthorized);
            }

            string body;
            using (var reader = new StreamReader(ctx.Request.Body))
                body = await reader.ReadToEndAsync();

            JsonElement payload;
            try { payload = JsonSerializer.Deserialize<JsonElement>(body); }
            catch (JsonException) { return Results.BadRequest(new { error = "INVALID_JSON" }); }
            if (payload.ValueKind != JsonValueKind.Object
                || !payload.TryGetProperty("OrderCode", out var codeEl)) return Results.BadRequest();

            var trackingCode = codeEl.GetString() ?? "";
            var status = payload.TryGetProperty("Status", out var statusEl) ? statusEl.GetString() : "";

            var order = await db.Orders.FirstOrDefaultAsync(o => o.DeliveryTrackingNumber == trackingCode);
            if (order == null) return Results.Ok(new { matched = false });

            switch (status)
            {
                case "delivered":
                    if (order.Status == OrderStatus.Shipped)
                    {
                        order.MarkAsDelivered();
                        db.OrderHistories.Add(new OrderHistory(
                            order.Id, OrderStatus.Shipped, OrderStatus.Delivered,
                            "GHN Webhook", $"Giao hàng thành công - {trackingCode}"));
                    }
                    break;
                case "return":
                    db.OrderHistories.Add(new OrderHistory(
                        order.Id, order.Status, order.Status,
                        "GHN Webhook", $"Đơn hàng bị trả lại - {trackingCode}"));
                    break;
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { matched = true, orderStatus = order.Status.ToString() });
        }).AllowAnonymous();
    }
}
