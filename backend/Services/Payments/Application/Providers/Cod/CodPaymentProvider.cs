using Payments.Domain;

namespace Payments.Application.Providers.Cod;

/// <summary>
/// D04 tầng 0 — thu tiền mặt khi giao hàng. Không có cổng, không có URL, không có chữ ký.
///
/// Điểm xác nhận DUY NHẤT là `POST /api/payments/cod/confirm/{orderId}` (quyền
/// `Payments.CollectCod`); từ lúc đó khoản tiền là tiền mặt đang nằm ngoài quỹ nên intent chuyển
/// sang <see cref="CodSettlementStatus.AwaitingRemittance"/> cho tới khi kế toán tick đã nhận.
/// </summary>
public sealed class CodPaymentProvider : IPaymentProvider
{
    public PaymentProvider Provider => PaymentProvider.COD;

    public Task<PaymentInstruction> CreateAsync(PaymentCreationContext context, CancellationToken ct = default)
    {
        context.Intent.SetExternalId($"COD-{context.Intent.Id}", null);
        return Task.FromResult(PaymentInstruction.None(
            "Đơn hàng sẽ được thanh toán bằng tiền mặt khi nhận hàng."));
    }
}
