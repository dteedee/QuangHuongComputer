using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Payments.Domain;
using Payments.Infrastructure;

namespace Payments.Application.Refunds;

/// <summary>
/// D04 mục 4 — Sales phát <see cref="RefundRequestedEvent"/> khi huỷ một đơn ĐÃ TRẢ hoặc khi nhận
/// trả hàng. Payments biến nó thành một phiếu hoàn: gọi cổng nếu cổng có API, nếu không thì để
/// kế toán xử lý tay. Không bao giờ tự chuyển tiền.
///
/// Idempotent theo `RefundId` của sự kiện: MassTransit giao lại thì phiếu cũ được trả về nguyên vẹn.
///
/// ĐĂNG KÝ: assembly Payments hiện KHÔNG nằm trong `x.AddConsumers(...)` của
/// `ApiGateway/Startup/ServiceRegistration.cs` — xem integration request của W2-4. Cho tới khi dòng
/// đó được thêm, consumer này biên dịch và chạy được nhưng chưa nhận message nào.
/// </summary>
public sealed class RefundRequestedConsumer : IConsumer<RefundRequestedEvent>
{
    private readonly PaymentsDbContext _db;
    private readonly PaymentRefundService _refunds;
    private readonly ILogger<RefundRequestedConsumer> _logger;

    public RefundRequestedConsumer(
        PaymentsDbContext db,
        PaymentRefundService refunds,
        ILogger<RefundRequestedConsumer> logger)
    {
        _db = db;
        _refunds = refunds;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<RefundRequestedEvent> context)
    {
        var message = context.Message;

        // Khoản đã thu của đúng đơn đó. Không có ⇒ không có gì để hoàn (đơn chưa từng trả tiền).
        var intent = await _db.PaymentIntents
            .Where(p => p.OrderId == message.OrderId)
            .Where(p => p.Status == PaymentStatus.Succeeded || p.Status == PaymentStatus.PartiallyRefunded)
            .OrderByDescending(p => p.ConfirmedAt)
            .FirstOrDefaultAsync(context.CancellationToken);

        if (intent is null)
        {
            _logger.LogWarning(
                "RefundRequested {RefundId}: đơn {OrderId} chưa có khoản thu nào — bỏ qua",
                message.RefundId, message.OrderId);
            return;
        }

        var refund = await _refunds.RequestAsync(
            paymentIntentId: intent.Id,
            amount: message.Amount,
            channel: intent.Provider == PaymentProvider.COD ? RefundChannel.Cash : RefundChannel.ManualTransfer,
            reason: message.Reason,
            requestedBy: null,
            idempotencyKey: $"refund-event:{message.RefundId}",
            ct: context.CancellationToken);

        _logger.LogInformation(
            "RefundRequested {RefundId} → phiếu hoàn {PaymentRefundId} ({Status})",
            message.RefundId, refund.Id, refund.Status);
    }
}
