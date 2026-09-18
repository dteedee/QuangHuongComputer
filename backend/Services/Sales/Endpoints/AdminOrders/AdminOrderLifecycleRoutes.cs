using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Sales.Application.Inventory;
using Sales.Application.Orders;
using Sales.Domain;
using Sales.Endpoints.Orders;
using Sales.Infrastructure;

namespace Sales.Endpoints.AdminOrders;

/// <summary>
/// Các route ĐỔI TRẠNG THÁI đơn ở trang quản trị. Tách khỏi phần truy vấn để mỗi file dưới 200
/// dòng, và vì hai nhóm này hỏng theo hai kiểu khác nhau: truy vấn hỏng thì thiếu thông tin,
/// đổi trạng thái hỏng thì sai tiền và sai hoá đơn.
/// </summary>
internal static partial class AdminOrderEndpoints
{
    private static void MapLifecycle(RouteGroupBuilder adminGroup)
    {
        // Sáu route cũ được GIỮ NGUYÊN đường dẫn (frontend đang gọi) nhưng đổi ruột: tất cả đi qua
        // OrderLifecycleService ⇒ đúng bảng chuyển trạng thái (409 khi nhảy sai), có ghi lịch sử,
        // và CÓ phát sự kiện tích hợp ⇒ hoá đơn mới ra được.
        MapTransition(adminGroup, "/orders/{id:guid}/confirm", OrderStatus.Confirmed, "Xác nhận đơn");
        MapTransition(adminGroup, "/orders/{id:guid}/fulfill", OrderStatus.Fulfilled, "Xuất kho");
        MapTransition(adminGroup, "/orders/{id:guid}/deliver", OrderStatus.Delivered, "Đã giao");
        MapTransition(adminGroup, "/orders/{id:guid}/complete", OrderStatus.Completed, "Hoàn thành");

        adminGroup.MapPost("/orders/{id:guid}/ship", async (
            Guid id, ShipOrderDto dto, HttpContext http, CancellationToken ct) =>
        {
            var lifecycle = Resolve(http);
            var order = await lifecycle.TransitionAsync(
                id, OrderStatus.Shipped, Actor(http.User), "Giao cho đơn vị vận chuyển",
                dto.TrackingNumber, dto.Carrier, ct);

            return Results.Ok(Summary(order));
        });

        adminGroup.MapPost("/orders/{id:guid}/cancel", async (
            Guid id, CancelOrderDto dto, HttpContext http, SalesDbContext db, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Reason))
                throw new RequestValidationException("reason", "Huỷ đơn phải ghi lý do.");

            var lifecycle = Resolve(http);
            var order = await lifecycle.CancelAsync(id, dto.Reason.Trim(), Actor(http.User), ct);

            // Huỷ đơn ⇒ đảo điểm đã tích (phase-48 bước 5). Không đảo thì khách giữ điểm của một
            // đơn không bao giờ tồn tại và đổi được nó thành tiền.
            await Sales.Application.Loyalty.LoyaltyLedger.ReverseForOrderAsync(
                db, id, $"Đảo điểm do huỷ đơn {order.OrderNumber}", ct);

            return Results.Ok(Summary(order));
        }).RequireAuthorization(Permissions.Sales.CancelOrder);

        adminGroup.MapPut("/orders/{id:guid}/status", async (
            Guid id, UpdateOrderStatusDto dto, HttpContext http, CancellationToken ct) =>
        {
            if (!Enum.TryParse<OrderStatus>(dto.Status, true, out var status))
                throw new RequestValidationException("status", $"Trạng thái không hợp lệ: {dto.Status}.");

            // IR w2#24 — `status = Paid` từng đặt Status=Paid mà KHÔNG đụng PaymentStatus và không
            // ghi một dòng thu nào: đơn "đã thanh toán" với sổ thu trống.
            if (status == OrderStatus.Paid)
                throw new ConflictException(
                    "Ghi nhận tiền phải qua phiếu thu: POST /api/sales/admin/orders/{id}/payments.");

            var lifecycle = Resolve(http);
            var order = await lifecycle.TransitionAsync(
                id, status, Actor(http.User), $"Đổi trạng thái sang {OrderStateMachine.Vi(status)}", ct: ct);

            return Results.Ok(Summary(order));
        });
    }

    private static void MapTransition(
        RouteGroupBuilder adminGroup, string route, OrderStatus to, string label)
        => adminGroup.MapPost(route, async (Guid id, HttpContext http, CancellationToken ct) =>
        {
            var lifecycle = Resolve(http);
            var order = await lifecycle.TransitionAsync(id, to, Actor(http.User), label, ct: ct);
            return Results.Ok(Summary(order));
        });

    private static object Summary(Order order) => new
    {
        order.Id,
        order.OrderNumber,
        Status = order.Status.ToString(),
        StatusLabel = OrderStateMachine.Vi(order.Status),
        PaymentStatus = order.PaymentStatus.ToString(),
        FulfillmentStatus = order.FulfillmentStatus.ToString(),
    };

    private static string Actor(ClaimsPrincipal user)
        => user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";

    /// <summary>
    /// <see cref="OrderLifecycleService"/> chưa nằm trong DI (file đăng ký thuộc W2-3), nên dựng
    /// tay từ các dịch vụ đã đăng ký — đúng cách W2-23 đang làm ở <c>OrderLifecycleEndpoints</c>.
    /// </summary>
    private static OrderLifecycleService Resolve(HttpContext http)
        => OrderLifecycleEndpoints.Build(
            http.RequestServices.GetRequiredService<SalesDbContext>(),
            http.RequestServices.GetRequiredService<InventoryDbContext>(),
            http.RequestServices.GetRequiredService<CatalogDbContext>(),
            http.RequestServices.GetRequiredService<InventoryReservationService>(),
            http.RequestServices.GetRequiredService<IPublishEndpoint>(),
            http.RequestServices.GetRequiredService<ILogger<OrderLifecycleService>>());
}
