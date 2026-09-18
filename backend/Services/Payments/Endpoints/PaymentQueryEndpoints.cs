using System.Security.Claims;
using BuildingBlocks.Endpoints;
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
/// Tra cứu trạng thái thanh toán + xác nhận thu tiền COD.
/// `GET /{id}` kiểm chủ sở hữu (trước W0-10 bất kỳ tài khoản đăng nhập nào cũng đọc được mọi
/// PaymentIntent nếu đoán đúng GUID) và không bao giờ trả `ClientSecret`.
/// </summary>
public static class PaymentQueryEndpoints
{
    public static void MapPaymentQueryEndpoints(this RouteGroupBuilder group)
    {
        // Nhân viên giao hàng / thu ngân xác nhận đã thu tiền mặt (D04 mục 4, hàng COD).
        group.MapPost("/cod/confirm/{orderId:guid}", async (
            Guid orderId,
            PaymentsDbContext db,
            IPublishEndpoint publishEndpoint,
            CancellationToken ct) =>
        {
            var payment = await db.PaymentIntents.FirstOrDefaultAsync(
                p => p.OrderId == orderId && p.Provider == PaymentProvider.COD && p.Status == PaymentStatus.Pending, ct);
            if (payment == null)
                return Results.NotFound(new { error = PaymentErrorCodes.NoPendingCod, message = "Không có khoản COD nào đang chờ thu" });

            payment.Succeed();
            // Tiền mặt đã ở tay nhân viên nhưng CHƯA về quỹ: kế toán còn phải tick đối soát.
            payment.MarkCodAwaitingRemittance();

            // Ghi DB TRƯỚC khi phát sự kiện — tránh consumer xử lý một trạng thái chưa commit.
            await db.SaveChangesAsync(ct);
            await publishEndpoint.Publish(
                new PaymentSucceededEvent(payment.Id, payment.OrderId, payment.Amount, DateTime.UtcNow), ct);

            return Results.Ok(new
            {
                message = "Đã xác nhận thu tiền COD",
                orderId,
                amount = payment.Amount,
                settlement = payment.Settlement.ToString()
            });
        }).RequireAuthorization(Permissions.Payments.CollectCod);

        group.MapGet("/{id:guid}", async (
            Guid id,
            PaymentsDbContext db,
            ClaimsPrincipal user,
            IOrderPaymentInfoProvider orders,
            CancellationToken ct) =>
        {
            var payment = await LoadForCallerAsync(db, orders, user, id, ct);
            return Results.Ok(PaymentStatusResponse.From(payment));
        });

        // Ảnh QR VietQR. Nằm trong nhóm đã yêu cầu đăng nhập, nên `<img src>` thuần sẽ 401:
        // frontend tải bằng fetch kèm token rồi tạo blob URL (hoặc tự vẽ từ `qrPayload`).
        group.MapGet("/{id:guid}/qr.png", async (
            Guid id,
            PaymentsDbContext db,
            ClaimsPrincipal user,
            IOrderPaymentInfoProvider orders,
            PaymentQrImageService qr,
            CancellationToken ct) =>
        {
            var payment = await LoadForCallerAsync(db, orders, user, id, ct);
            return qr.Render(payment);
        });
    }

    /// <summary>Tải intent và CHẶN nếu người gọi không phải chủ đơn/nhân viên. 404 (không 403) để không lộ sự tồn tại.</summary>
    internal static async Task<PaymentIntent> LoadForCallerAsync(
        PaymentsDbContext db,
        IOrderPaymentInfoProvider orders,
        ClaimsPrincipal user,
        Guid paymentId,
        CancellationToken ct)
    {
        var payment = await db.PaymentIntents.AsNoTracking().FirstOrDefaultAsync(p => p.Id == paymentId, ct)
            ?? throw NotFoundException.For("giao dịch thanh toán", paymentId);

        if (user.IsPaymentsStaff()) return payment;

        var order = await orders.GetAsync(payment.OrderId, ct);
        if (order is null || !user.OwnsOrder(order.CustomerId))
            throw NotFoundException.For("giao dịch thanh toán", paymentId);

        return payment;
    }
}

/// <summary>Trạng thái công khai của một giao dịch — KHÔNG chứa secret nào.</summary>
public sealed record PaymentStatusResponse(
    Guid Id,
    Guid OrderId,
    decimal Amount,
    decimal AmountRefunded,
    string Currency,
    string Status,
    string Provider,
    string? ExternalId,
    string? PaymentCode,
    DateTime? ExpiresAt,
    DateTime? ConfirmedAt,
    string Settlement,
    DateTime CreatedAt)
{
    public static PaymentStatusResponse From(PaymentIntent p) => new(
        p.Id, p.OrderId, p.Amount, p.AmountRefunded, p.Currency,
        p.Status.ToString(), p.Provider.ToString(), p.ExternalId, p.PaymentCode,
        p.ExpiresAt, p.ConfirmedAt, p.Settlement.ToString(), p.CreatedAt);
}
