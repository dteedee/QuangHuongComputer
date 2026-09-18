using System.Security.Claims;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Payments.Application;
using Payments.Application.Configuration;
using Payments.Domain;
using Payments.Infrastructure;

namespace Payments.Endpoints;

/// <summary>
/// W0-10 — `POST /api/payments/initiate`, phiên bản fail-closed.
///
/// Trước đây: tạo intent từ `model.Amount` (client tự khai), không tra đơn hàng, không kiểm chủ sở hữu,
/// và nhánh `else` trả `paymentUrl=/payment/mock/{id}` cho mọi provider không có nhánh riêng.
///
/// Bây giờ:
///  1. provider chưa cấu hình → 400 PAYMENT_METHOD_UNAVAILABLE (không có nhánh giả nào),
///  2. đơn hàng tra từ server qua <see cref="IOrderPaymentInfoProvider"/>,
///  3. người gọi phải là CHỦ đơn (hoặc nhân viên), đơn chưa huỷ, chưa thanh toán,
///  4. `amount = order.TotalAmount` — `model.Amount` bị bỏ qua hoàn toàn,
///  5. tái sử dụng intent Pending sẵn có của cùng (đơn, provider) thay vì sinh rác.
/// </summary>
public static class PaymentInitiateEndpoint
{
    private static readonly string[] StaffRoles = { "Admin", "Manager", "Sale", "Accountant" };

    public static void MapInitiatePaymentEndpoint(this RouteGroupBuilder group)
    {
        group.MapPost("/initiate", async (
            InitiatePaymentDto model,
            PaymentsDbContext db,
            ClaimsPrincipal user,
            IOrderPaymentInfoProvider orders,
            PaymentConfigGuard guard,
            IConfiguration config,
            ILoggerFactory lf,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var logger = lf.CreateLogger("PaymentInitiate");

            // 1) Phương thức phải đang bật. Không bật ⇒ 400, không bao giờ URL giả.
            var availability = guard.Evaluate(model.Provider);
            if (!availability.Available)
            {
                logger.LogWarning("Initiate bị từ chối: {Provider} chưa cấu hình (thiếu: {Missing})",
                    model.Provider, string.Join(", ", availability.MissingKeys));
                return Results.BadRequest(new
                {
                    error = "PAYMENT_METHOD_UNAVAILABLE",
                    message = "Phương thức thanh toán chưa được cấu hình"
                });
            }

            // 2) Sự thật về đơn hàng lấy từ server.
            var order = await orders.GetAsync(model.OrderId, ct);
            if (order is null)
                return Results.NotFound(new { error = "ORDER_NOT_FOUND", message = "Đơn hàng không tồn tại" });

            // 3) Quyền: chủ đơn hoặc nhân viên.
            var isStaff = StaffRoles.Any(user.IsInRole);
            var callerId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var isOwner = Guid.TryParse(callerId, out var callerGuid) && callerGuid == order.CustomerId;
            if (!isStaff && !isOwner)
            {
                logger.LogWarning("Initiate bị từ chối: người dùng không phải chủ đơn {OrderId}", order.OrderId);
                return Results.Json(
                    new { error = "FORBIDDEN", message = "Bạn không có quyền thanh toán đơn hàng này" },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            if (order.IsCancelled)
                return Results.BadRequest(new { error = "ORDER_CANCELLED", message = "Đơn hàng đã bị huỷ" });
            if (order.IsPaid)
                return Results.BadRequest(new { error = "ORDER_ALREADY_PAID", message = "Đơn hàng đã được thanh toán" });
            if (order.TotalAmount <= 0)
                return Results.BadRequest(new { error = "INVALID_ORDER_AMOUNT", message = "Tổng tiền đơn hàng không hợp lệ" });

            // 4) Số tiền LUÔN từ đơn hàng.
            var amount = order.TotalAmount;

            // 5) Tái sử dụng intent Pending của cùng (đơn, provider).
            var payment = await db.PaymentIntents.FirstOrDefaultAsync(
                p => p.OrderId == order.OrderId && p.Provider == model.Provider && p.Status == PaymentStatus.Pending, ct);

            var reused = payment is not null;
            if (payment is null)
            {
                payment = PaymentIntent.Create(order.OrderId, amount, "VND", model.Provider, Guid.NewGuid().ToString());
                db.PaymentIntents.Add(payment);
            }
            else if (payment.Amount != amount)
            {
                payment.ReviseAmount(amount);
            }
            await db.SaveChangesAsync(ct);

            var paymentUrl = await PaymentUrlBuilder.BuildAsync(model, payment, amount, guard, config, httpContext);
            await db.SaveChangesAsync(ct);

            return Results.Ok(new
            {
                PaymentId = payment.Id,
                payment.ClientSecret,
                payment.Status,
                Amount = payment.Amount,
                Reused = reused,
                PaymentUrl = paymentUrl
            });
        }).WithValidation<InitiatePaymentDto>();
    }
}
