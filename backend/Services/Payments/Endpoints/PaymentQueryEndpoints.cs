using System.Security.Claims;
using BuildingBlocks.Messaging.IntegrationEvents;
using BuildingBlocks.Security;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Payments.Application;
using Payments.Domain;
using Payments.Infrastructure;

namespace Payments.Endpoints;

/// <summary>
/// W0-10 — tra cứu trạng thái thanh toán + xác nhận thu tiền COD.
/// `GET /{id}` giờ kiểm chủ sở hữu (trước đây bất kỳ tài khoản đăng nhập nào cũng đọc được
/// mọi PaymentIntent nếu đoán đúng GUID) và không bao giờ trả `ClientSecret`.
/// </summary>
public static class PaymentQueryEndpoints
{
    private static readonly string[] StaffRoles = { "Admin", "Manager", "Sale", "Accountant" };

    public static void MapPaymentQueryEndpoints(this RouteGroupBuilder group)
    {
        // Nhân viên giao hàng / thu ngân xác nhận đã thu tiền mặt.
        group.MapPost("/cod/confirm/{orderId:guid}", async (
            Guid orderId,
            PaymentsDbContext db,
            IPublishEndpoint publishEndpoint,
            CancellationToken ct) =>
        {
            var payment = await db.PaymentIntents.FirstOrDefaultAsync(
                p => p.OrderId == orderId && p.Provider == PaymentProvider.COD && p.Status == PaymentStatus.Pending, ct);
            if (payment == null)
                return Results.NotFound(new { error = "NO_PENDING_COD", message = "Không có khoản COD nào đang chờ thu" });

            payment.Succeed();
            // Ghi DB TRƯỚC khi phát sự kiện — tránh consumer xử lý một trạng thái chưa commit.
            await db.SaveChangesAsync(ct);
            await publishEndpoint.Publish(
                new PaymentSucceededEvent(payment.Id, payment.OrderId, payment.Amount, DateTime.UtcNow), ct);

            return Results.Ok(new { message = "Đã xác nhận thu tiền COD", orderId, amount = payment.Amount });
            // W1-10: thu tiền mặt khi giao hàng -> Payments.CollectCod
            // (Manager/Sale/Accountant giữ quyền này; giữ nguyên phạm vi role cũ).
        }).RequireAuthorization(Permissions.Payments.CollectCod);

        group.MapGet("/{id:guid}", async (
            Guid id,
            PaymentsDbContext db,
            ClaimsPrincipal user,
            IOrderPaymentInfoProvider orders,
            CancellationToken ct) =>
        {
            var payment = await db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (payment == null) return Results.NotFound();

            if (!StaffRoles.Any(user.IsInRole))
            {
                var order = await orders.GetAsync(payment.OrderId, ct);
                var callerId = user.FindFirstValue(ClaimTypes.NameIdentifier);
                var isOwner = order is not null
                    && Guid.TryParse(callerId, out var callerGuid)
                    && callerGuid == order.CustomerId;
                if (!isOwner) return Results.NotFound();
            }

            return Results.Ok(new
            {
                payment.Id,
                payment.OrderId,
                payment.Amount,
                payment.Currency,
                payment.Status,
                payment.Provider,
                payment.ExternalId,
                payment.CreatedAt
            });
        });
    }
}
