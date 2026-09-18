using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Sales.Application.Inventory;
using Sales.Application.Orders;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Endpoints.Orders;

/// <summary>
/// W2-23 — endpoint vòng đời đơn, TẤT CẢ đi qua <see cref="OrderStateMachine"/>.
///
/// Một endpoint chuyển trạng thái duy nhất thay cho sáu handler mỗi cái một kiểu kiểm tra:
/// client gửi trạng thái đích, server quyết định hợp lệ hay không và trả 409 kèm trạng thái hiện
/// tại khi sai. Không endpoint nào ở đây nhận đơn giá hay tổng tiền từ client; người thực hiện lấy
/// từ token, không bao giờ từ payload (phase-72 "Security Considerations").
/// </summary>
internal static class OrderLifecycleEndpoints
{
    public static void MapOrderLifecycleEndpoints(RouteGroupBuilder group, RouteGroupBuilder adminGroup)
    {
        // Các bước hợp lệ kế tiếp — FE dựng nút bấm từ đây thay vì hardcode luồng.
        adminGroup.MapGet("/orders/{id:guid}/transitions", async (Guid id, SalesDbContext db) =>
        {
            var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id)
                ?? throw NotFoundException.For("đơn hàng", id);

            var next = OrderStateMachine.AllowedNext(order.Status)
                .Where(s => OrderStateMachine.CanTransition(order, s, out _))
                .Select(s => new { status = s.ToString(), label = OrderStateMachine.Vi(s) })
                .ToList();

            return Results.Ok(new
            {
                status = order.Status.ToString(),
                statusLabel = OrderStateMachine.Vi(order.Status),
                paymentStatus = order.PaymentStatus.ToString(),
                fulfillmentStatus = order.FulfillmentStatus.ToString(),
                isCreditOrder = OrderStateMachine.IsCreditOrder(order),
                allowedNext = next,
            });
        }).RequirePermission(Permissions.Sales.ViewAll);

        adminGroup.MapPost("/orders/{id:guid}/transitions", async (
            Guid id,
            [FromBody] OrderTransitionRequest body,
            ClaimsPrincipal user,
            SalesDbContext db,
            InventoryDbContext inventoryDb,
            CatalogDbContext catalogDb,
            InventoryReservationService reservations,
            IPublishEndpoint publish,
            ILogger<OrderLifecycleService> logger) =>
        {
            if (!Enum.TryParse<OrderStatus>(body.To, ignoreCase: true, out var to))
                throw new DomainException($"Trạng thái đích không hợp lệ: {body.To}");

            var lifecycle = Build(db, inventoryDb, catalogDb, reservations, publish, logger);

            var order = await lifecycle.TransitionAsync(
                id, to, Actor(user), body.Reason, body.TrackingNumber, body.Carrier);

            return Results.Ok(new
            {
                status = order.Status.ToString(),
                statusLabel = OrderStateMachine.Vi(order.Status),
                paymentStatus = order.PaymentStatus.ToString(),
                orderNumber = order.OrderNumber,
            });
        }).RequirePermission(Permissions.Sales.UpdateStatus);

        // GHI NHẬN THU TIỀN — thu tay (COD, chuyển khoản đã đối soát, đặt cọc). Thu chưa đủ để lại
        // PartiallyPaid + số còn thiếu, và KHÔNG lập hoá đơn (D07 §5).
        adminGroup.MapPost("/orders/{id:guid}/payments", async (
            Guid id,
            [FromBody] RecordTenderRequest body,
            ClaimsPrincipal user,
            SalesDbContext db,
            InventoryDbContext inventoryDb,
            CatalogDbContext catalogDb,
            InventoryReservationService reservations,
            IPublishEndpoint publish,
            ILogger<OrderLifecycleService> logger) =>
        {
            if (!Enum.TryParse<PaymentTenderMethod>(body.Method, ignoreCase: true, out var method))
                throw new DomainException($"Hình thức thu không hợp lệ: {body.Method}");
            if (string.IsNullOrWhiteSpace(body.Reference))
                throw new DomainException("Phải có mã đối soát cho mỗi lần thu tiền.");

            var lifecycle = Build(db, inventoryDb, catalogDb, reservations, publish, logger);

            var (order, collected, due) = await lifecycle.RecordTenderAsync(
                id, method, body.Amount, body.Reference.Trim(), Actor(user),
                body.TenderedAmount, body.ShiftId);

            return Results.Ok(new
            {
                orderNumber = order.OrderNumber,
                status = order.Status.ToString(),
                paymentStatus = order.PaymentStatus.ToString(),
                totalAmount = order.TotalAmount,
                collectedAmount = collected,
                amountDue = due,
            });
        }).RequirePermission(Permissions.Sales.TakeDeposit);
    }

    /// <summary>Người thực hiện LUÔN lấy từ token — payload không bao giờ được nói mình là ai.</summary>
    private static string Actor(ClaimsPrincipal user)
        => user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";

    /// <summary>
    /// Dựng <see cref="OrderLifecycleService"/> từ các dependency đã đăng ký sẵn.
    /// Bản thân service CHƯA được đăng ký DI vì <c>Sales/DependencyInjection.cs</c> thuộc glob của
    /// track khác — đã gửi integration request để đăng ký scoped và bỏ factory này.
    /// </summary>
    internal static OrderLifecycleService Build(
        SalesDbContext db, InventoryDbContext inventoryDb, CatalogDbContext catalogDb,
        InventoryReservationService reservations, IPublishEndpoint publish,
        ILogger<OrderLifecycleService> logger)
        => new(db, inventoryDb, catalogDb, reservations, publish, logger);
}

/// <summary>Yêu cầu chuyển trạng thái. KHÔNG có trường tiền — server giữ toàn quyền về số tiền.</summary>
public record OrderTransitionRequest(
    string To,
    string? Reason = null,
    string? TrackingNumber = null,
    string? Carrier = null);

/// <summary>Một lần thu tiền. <c>Reference</c> là khoá idempotent (mã giao dịch/sao kê/ca).</summary>
public record RecordTenderRequest(
    string Method,
    decimal Amount,
    string Reference,
    decimal TenderedAmount = 0m,
    Guid? ShiftId = null);
