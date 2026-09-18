using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Payments.Application;

namespace Payments.Endpoints;

/// <summary>
/// `POST /api/payments/initiate` — fail-closed.
///
/// Trước W0-10: tạo intent từ `model.Amount` (client tự khai), không tra đơn hàng, không kiểm chủ sở
/// hữu, và nhánh `else` trả `paymentUrl=/payment/mock/{id}` cho mọi provider không có nhánh riêng.
/// W2-4 gỡ nốt `switch (model.Provider)` cuối cùng: endpoint chỉ còn hỏi
/// <see cref="PaymentInitiationService"/>, mọi logic cổng nằm trong <see cref="Application.Providers.IPaymentProvider"/>.
/// </summary>
public static class PaymentInitiateEndpoint
{
    public static void MapInitiatePaymentEndpoint(this RouteGroupBuilder group)
    {
        group.MapPost("/initiate", async (
            InitiatePaymentDto model,
            ClaimsPrincipal user,
            PaymentInitiationService initiation,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            // 1) Phương thức trước đơn hàng: một provider chưa bật phải trả 400 kể cả khi
            //    orderId là số không có thật (probe W0-10 dựa đúng vào thứ tự này).
            var strategy = initiation.RequireProvider(model.Provider);

            var order = await initiation.GetOrderAsync(model.OrderId, ct)
                ?? throw NotFoundException.For("đơn hàng", model.OrderId);

            if (!user.IsPaymentsStaff() && !user.OwnsOrder(order.CustomerId))
                throw new ForbiddenException("Bạn không có quyền thanh toán đơn hàng này.");

            var result = await initiation.InitiateAsync(strategy, order, model.BankCode, httpContext, ct);
            return Results.Ok(PaymentInitiationResponse.From(result));
        }).WithValidation<InitiatePaymentDto>();
    }
}

/// <summary>
/// Phản hồi của `/initiate`. `paymentUrl` giữ lại cho FE hiện hành (cổng chuyển hướng);
/// `transfer` là dữ liệu màn VietQR theo D04 mục 3b — QR KHÔNG BAO GIỜ đứng một mình.
/// KHÔNG trả `clientSecret` ra ngoài.
/// </summary>
public sealed record PaymentInitiationResponse(
    Guid PaymentId,
    string Status,
    decimal Amount,
    bool Reused,
    string Kind,
    string PaymentUrl,
    string? PaymentCode,
    DateTime? ExpiresAt,
    object? Transfer,
    string? Message)
{
    public static PaymentInitiationResponse From(PaymentInitiationResult result)
    {
        var i = result.Intent;
        var t = result.Instruction.Transfer;
        return new PaymentInitiationResponse(
            PaymentId: i.Id,
            Status: i.Status.ToString(),
            Amount: result.Amount,
            Reused: result.Reused,
            Kind: result.Instruction.Kind,
            PaymentUrl: result.Instruction.RedirectUrl ?? string.Empty,
            PaymentCode: i.PaymentCode,
            ExpiresAt: i.ExpiresAt,
            Transfer: t is null ? null : new
            {
                bankBin = t.BankBin,
                bankName = t.BankName,
                accountNumber = t.AccountNumber,
                accountName = t.AccountName,
                amount = t.Amount,
                paymentCode = t.PaymentCode,
                qrPayload = t.QrPayload,
                qrImageUrl = t.QrImageUrl,
                expiresAt = t.ExpiresAt,
                // D04 mục 3b: có app ngân hàng bỏ mất số tiền và nội dung khi quét QR.
                notice = "Bắt buộc ghi đúng nội dung chuyển khoản này, nếu thiếu đơn sẽ phải chờ kế toán đối soát."
            },
            Message: result.Instruction.Message);
    }
}
