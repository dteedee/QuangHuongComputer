using BuildingBlocks.Endpoints;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Payments.Application;
using Payments.Application.Guest;
using Payments.Infrastructure;

namespace Payments.Endpoints;

/// <summary>
/// Bước 11 của phase-22 — khách VÃNG LAI trả tiền đơn của mình bằng một token ký sẵn.
///
/// Token do Sales phát khi tạo đơn không cần tài khoản (xem integration request của W2-4); nó chỉ
/// mở đúng MỘT đơn và có hạn. Ba luật fail-closed:
///   - `Payment:GuestToken:Secret` chưa cấu hình → 503, không có nhánh "bỏ qua kiểm tra";
///   - token sai/hết hạn → 401;
///   - token hợp lệ nhưng trỏ sang đơn khác → 401, không bao giờ 200 cho đơn người khác.
/// </summary>
public static class PaymentGuestEndpoints
{
    public static void MapPaymentGuestEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/payments/guest").AllowAnonymous();

        group.MapPost("/initiate", async (
            GuestInitiatePaymentDto model,
            GuestOrderTokenService tokens,
            PaymentInitiationService initiation,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            RequireToken(tokens, model.Token, model.OrderId);

            var strategy = initiation.RequireProvider(model.Provider);
            var order = await initiation.GetOrderAsync(model.OrderId, ct)
                ?? throw NotFoundException.For("đơn hàng", model.OrderId);

            var result = await initiation.InitiateAsync(strategy, order, model.BankCode, httpContext, ct);
            return Results.Ok(PaymentInitiationResponse.From(result));
        });

        group.MapGet("/{id:guid}", async (
            Guid id,
            string? token,
            GuestOrderTokenService tokens,
            PaymentsDbContext db,
            CancellationToken ct) =>
        {
            var payment = await db.PaymentIntents.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct)
                ?? throw NotFoundException.For("giao dịch thanh toán", id);
            RequireToken(tokens, token, payment.OrderId);
            return Results.Ok(PaymentStatusResponse.From(payment));
        });

        group.MapGet("/{id:guid}/qr.png", async (
            Guid id,
            string? token,
            GuestOrderTokenService tokens,
            PaymentsDbContext db,
            PaymentQrImageService qr,
            CancellationToken ct) =>
        {
            var payment = await db.PaymentIntents.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct)
                ?? throw NotFoundException.For("giao dịch thanh toán", id);
            RequireToken(tokens, token, payment.OrderId);
            return qr.Render(payment);
        });
    }

    private static void RequireToken(GuestOrderTokenService tokens, string? token, Guid orderId)
    {
        if (!tokens.IsEnabled) throw PaymentDomainException.GuestPaymentDisabled();
        if (tokens.Validate(token) != orderId) throw PaymentDomainException.InvalidGuestToken();
    }
}

/// <summary>`Amount` KHÔNG tồn tại ở đây: số tiền luôn là tổng đơn đọc từ server.</summary>
public sealed record GuestInitiatePaymentDto(
    Guid OrderId,
    string Token,
    Domain.PaymentProvider Provider,
    string? BankCode = null);
