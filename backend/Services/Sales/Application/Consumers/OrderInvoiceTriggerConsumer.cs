using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Sales.Application.Orders;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Consumers;

/// <summary>
/// W2-23 — MỐC LẬP HOÁ ĐƠN. Nơi DUY NHẤT phát <see cref="InvoiceRequestedEvent"/>.
///
/// NĐ 254/2026 Đ9.1 neo thời điểm lập hoá đơn vào lúc CHUYỂN GIAO QUYỀN SỞ HỮU, "không phân biệt
/// đã thu được tiền hay chưa". Trước track này `OrderPaidConsumer` phát ngay khi thu tiền — sai
/// thời điểm theo cả hai chiều: đơn COD giao xong mà chưa thu thì KHÔNG có hoá đơn, còn đơn đặt
/// cọc (Đ9.2 loại trừ tiền đặt cọc) thì lại CÓ hoá đơn sớm.
///
/// Mốc do cấu hình <c>EInvoice:IssueTrigger</c> quyết định: <c>OrderDelivered</c> (mặc định) hoặc
/// <c>OrderShipped</c> nếu kế toán muốn hoá đơn đi cùng hàng — đổi mốc KHÔNG phải sửa code.
/// Đơn POS/nhận tại cửa hàng bàn giao ngay nên <c>OrderLifecycleService</c> phát thẳng
/// <c>OrderDelivered</c> lúc thu đủ tiền; consumer này vì thế đúng cho mọi kênh.
///
/// Idempotent theo ĐƠN: chưa có outbox nên broker được phép giao lại sự kiện; dấu mốc bền vững
/// nằm ở <c>OrderHistories</c> (xem <see cref="OrderLifecycleMarkers"/>).
/// </summary>
public class OrderInvoiceTriggerConsumer :
    IConsumer<OrderDeliveredEvent>,
    IConsumer<OrderShippedEvent>
{
    private const string TriggerKey = "EInvoice:IssueTrigger";
    private const string TriggerDelivered = "OrderDelivered";
    private const string TriggerShipped = "OrderShipped";

    private readonly SalesDbContext _db;
    private readonly IPublishEndpoint _publish;
    private readonly IConfiguration _config;
    private readonly ILogger<OrderInvoiceTriggerConsumer> _logger;

    public OrderInvoiceTriggerConsumer(
        SalesDbContext db,
        IPublishEndpoint publish,
        IConfiguration config,
        ILogger<OrderInvoiceTriggerConsumer> logger)
    {
        _db = db;
        _publish = publish;
        _config = config;
        _logger = logger;
    }

    private string Trigger =>
        _config[TriggerKey] is { Length: > 0 } t ? t : TriggerDelivered;

    public Task Consume(ConsumeContext<OrderDeliveredEvent> context)
        => Trigger.Equals(TriggerDelivered, StringComparison.OrdinalIgnoreCase)
            ? RequestInvoiceAsync(context.Message.OrderId, TriggerDelivered, context.CancellationToken)
            : Task.CompletedTask;

    public Task Consume(ConsumeContext<OrderShippedEvent> context)
        => Trigger.Equals(TriggerShipped, StringComparison.OrdinalIgnoreCase)
            ? RequestInvoiceAsync(context.Message.OrderId, TriggerShipped, context.CancellationToken)
            : Task.CompletedTask;

    private async Task RequestInvoiceAsync(Guid orderId, string trigger, CancellationToken ct)
    {
        var order = await _db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == orderId, ct);
        if (order == null)
        {
            _logger.LogWarning("Không tìm thấy đơn {OrderId} để lập hoá đơn", orderId);
            return;
        }

        if (order.Status == OrderStatus.Cancelled)
        {
            _logger.LogWarning("Đơn {OrderId} đã huỷ — không lập hoá đơn", orderId);
            return;
        }

        // Đặt cọc (PartiallyPaid) KHÔNG phải thời điểm lập hoá đơn (Đ9.2) — trừ đơn công nợ,
        // vốn được giao trước và thu sau theo thiết kế (D10 quy tắc 5).
        if (order.PaymentStatus == PaymentStatus.PartiallyPaid && !OrderStateMachine.IsCreditOrder(order))
        {
            _logger.LogInformation(
                "Đơn {OrderId} mới thu một phần và không phải đơn công nợ — chưa lập hoá đơn", orderId);
            return;
        }

        var already = await _db.OrderHistories.AnyAsync(
            h => h.OrderId == orderId && h.Notes != null
                 && h.Notes.Contains(OrderLifecycleMarkers.InvoiceRequested), ct);
        if (already)
        {
            _logger.LogInformation("Đơn {OrderId} đã yêu cầu hoá đơn — bỏ qua (idempotent)", orderId);
            return;
        }

        _db.OrderHistories.Add(new OrderHistory(
            order.Id, order.Status, order.Status, "system",
            $"Yêu cầu lập hoá đơn theo mốc {trigger} {OrderLifecycleMarkers.InvoiceRequested}"));
        await _db.SaveChangesAsync(ct);

        await _publish.Publish(new InvoiceRequestedEvent(
            order.Id,
            order.CustomerId,
            OrderInvoicePayloadBuilder.BuildLegacyInvoiceItems(order),
            order.TotalAmount), ct);

        _logger.LogInformation("Đơn {OrderId}: đã yêu cầu lập hoá đơn theo mốc {Trigger}", orderId, trigger);
    }
}
