using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Payments.Application.Webhooks;
using Sales.Infrastructure;
using Sales.Domain;
using System.Text.Json;

namespace Sales.Infrastructure.Shipping;

public static class ShippingEndpoints
{
    public static void MapShippingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shipping");

        // 1. Calculate shipping fee (public — used at checkout)
        group.MapPost("/calculate-fee", async (ShippingFeeRequest request, IConfiguration config) =>
        {
            var ghn = CreateGHNService(config);
            var result = await ghn.CalculateShippingFee(request.ToDistrictId, request.ToWardCode, request.Weight);
            return Results.Ok(result);
        });

        // 2. Create GHN shipment for an order (staff only)
        group.MapPost("/create-shipment/{orderId:guid}", async (
            Guid orderId,
            CreateShipmentRequest request,
            SalesDbContext db,
            IConfiguration config) =>
        {
            var order = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == orderId);
            if (order == null) return Results.NotFound(new { error = "Đơn hàng không tồn tại" });

            if (order.Status != OrderStatus.Paid && order.Status != OrderStatus.Confirmed)
                return Results.BadRequest(new { error = $"Không thể tạo vận đơn cho đơn hàng ở trạng thái {order.Status}" });

            var ghn = CreateGHNService(config);
            var ghnRequest = new GHNCreateOrderRequest
            {
                to_name = request.ReceiverName,
                to_phone = request.ReceiverPhone,
                to_address = order.ShippingAddress,
                to_district_id = request.ToDistrictId,
                to_ward_code = request.ToWardCode,
                weight = request.Weight > 0 ? request.Weight : 500,
                payment_type_id = order.PaymentStatus == PaymentStatus.Paid ? 1 : 2,
                required_note = "KHONGCHOXEMHANG",
                items = order.Items.Select(i => new GHNItem
                {
                    name = i.ProductName,
                    quantity = i.Quantity,
                    weight = 500
                }).ToList()
            };

            var result = await ghn.CreateShipment(ghnRequest);

            if (!string.IsNullOrEmpty(result.OrderCode))
            {
                order.MarkAsShipped(result.OrderCode, "GHN");
                order.SetShippingTracking(order.ShippingAmount, result.OrderCode, "GHN");
                db.OrderHistories.Add(new OrderHistory(
                    order.Id, OrderStatus.Paid, OrderStatus.Shipped,
                    "System", "Đã tạo vận đơn GHN: " + result.OrderCode));
                await db.SaveChangesAsync();
            }

            return Results.Ok(new
            {
                trackingCode = result.OrderCode,
                expectedDelivery = result.ExpectedDeliveryTime,
                orderStatus = order.Status.ToString()
            });
        }).RequireAuthorization(Permissions.Sales.UpdateStatus);

        // 3. Get tracking info
        group.MapGet("/tracking/{orderId:guid}", async (Guid orderId, SalesDbContext db) =>
        {
            var order = await db.Orders
                .Where(o => o.Id == orderId)
                .Select(o => new
                {
                    o.Id, o.OrderNumber, Status = o.Status.ToString(),
                    o.DeliveryTrackingNumber, o.DeliveryCarrier,
                    o.ShippedAt, o.DeliveredAt, o.ShippingAddress
                })
                .FirstOrDefaultAsync();

            if (order == null) return Results.NotFound();
            return Results.Ok(order);
            // W1-10 BÀN GIAO W2 (Sales): endpoint "tra vận đơn của tôi" nhưng KHÔNG có kiểm tra
            // quyền sở hữu — bất kỳ tài khoản đăng nhập nào cũng đọc được địa chỉ giao hàng của
            // đơn bất kỳ nếu đoán được orderId. Giữ nguyên policy Authenticated để không chặn
            // khách tra đơn của mình; chủ sở hữu W2 phải thêm điều kiện o.UserId == userId.
        }).RequireAuthorization(SecurityPolicies.Authenticated);

        // 4. GHN webhook — delivery status updates.
        //    W0-10: FAIL-CLOSED. Trước đây `if (!string.IsNullOrEmpty(expectedToken) && ...)` nghĩa là
        //    token chưa cấu hình ⇒ BẤT KỲ AI cũng POST được "delivered" và đơn tự chuyển trạng thái.
        app.MapPost("/api/shipping/webhook", async (
            HttpContext ctx,
            SalesDbContext db,
            IConfiguration config,
            ILoggerFactory lf) =>
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
            using (var reader = new System.IO.StreamReader(ctx.Request.Body))
                body = await reader.ReadToEndAsync();

            JsonElement payload;
            try { payload = JsonSerializer.Deserialize<JsonElement>(body); }
            catch (JsonException) { return Results.BadRequest(new { error = "INVALID_JSON" }); }
            if (payload.ValueKind != JsonValueKind.Object
                || !payload.TryGetProperty("OrderCode", out var codeEl)) return Results.BadRequest();

            var trackingCode = codeEl.GetString() ?? "";
            var status = payload.TryGetProperty("Status", out var statusEl) ? statusEl.GetString() : "";

            var order = await db.Orders
                .FirstOrDefaultAsync(o => o.DeliveryTrackingNumber == trackingCode);

            if (order == null) return Results.Ok(new { matched = false });

            // GHN status mapping to order status
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

    private static GHNService CreateGHNService(IConfiguration config)
    {
        return new GHNService(new GHNConfig
        {
            Token = config["Shipping:GHN:Token"] ?? "",
            ShopId = config["Shipping:GHN:ShopId"] ?? "",
            Endpoint = config["Shipping:GHN:Endpoint"] ?? "https://dev-online-gateway.ghn.vn/shiip/public-api"
        }, new HttpClient());
    }
}

public record ShippingFeeRequest(int ToDistrictId, string ToWardCode, int Weight = 500);
public record CreateShipmentRequest(string ReceiverName, string ReceiverPhone, int ToDistrictId, string ToWardCode, int Weight = 500);
