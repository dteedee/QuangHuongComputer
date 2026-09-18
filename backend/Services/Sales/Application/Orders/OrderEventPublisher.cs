using BuildingBlocks.Messaging.IntegrationEvents;
using InventoryModule.Infrastructure;
using MassTransit;
using Sales.Domain;

namespace Sales.Application.Orders;

/// <summary>
/// W2-23 — phát sự kiện tích hợp cho mốc vòng đời hiện tại của đơn.
///
/// Tách khỏi <see cref="OrderLifecycleService"/> để mỗi file dưới 200 dòng và để "đổi trạng thái"
/// (logic nghiệp vụ) tách khỏi "báo cho module khác" (hạ tầng). Mọi sự kiện mang ĐỦ dòng hàng +
/// khối người mua nên bên nhận không phải truy ngược sang module khác.
/// </summary>
public static class OrderEventPublisher
{
    /// <summary>Phát sự kiện tích hợp tương ứng mốc hiện tại, kèm ĐỦ dòng hàng + khối người mua.</summary>
    public static async Task PublishForStatusAsync(
        IPublishEndpoint publish, InventoryDbContext inventoryDb, Order order, CancellationToken ct)
    {
        var buyer = OrderInvoicePayloadBuilder.BuildBuyer(order);

        if (order.Status == OrderStatus.Shipped)
        {
            await publish.Publish(new OrderShippedEvent(
                order.Id, order.CustomerId, order.OrderNumber, buyer,
                order.DeliveryTrackingNumber, DateTime.UtcNow), ct);
        }
        else if (order.Status is OrderStatus.Delivered or OrderStatus.Completed)
        {
            var serials = await OrderInvoicePayloadBuilder.LoadSerialsAsync(inventoryDb, order.Id, ct);
            await publish.Publish(new OrderDeliveredEvent(
                order.Id, order.CustomerId, order.OrderNumber,
                OrderInvoicePayloadBuilder.BuildLines(order, serials),
                OrderInvoicePayloadBuilder.BuildShipping(order),
                buyer, order.BusinessDate, DateTime.UtcNow), ct);
        }

        // POS / nhận tại cửa hàng: BÀN GIAO XẢY RA NGAY khi thu tiền, không có bước giao hàng.
        // D07 §5 neo hoá đơn vào mốc bàn giao, nên đơn quầy phát luôn OrderDelivered để consumer
        // hoá đơn dùng ĐÚNG MỘT quy tắc cho mọi kênh.
        else if (order.PaymentStatus == PaymentStatus.Paid
                 && (order.Channel == OrderChannels.Pos || order.IsPickup))
        {
            var posSerials = await OrderInvoicePayloadBuilder.LoadSerialsAsync(inventoryDb, order.Id, ct);
            await publish.Publish(new OrderDeliveredEvent(
                order.Id, order.CustomerId, order.OrderNumber,
                OrderInvoicePayloadBuilder.BuildLines(order, posSerials),
                OrderInvoicePayloadBuilder.BuildShipping(order),
                buyer, order.BusinessDate, DateTime.UtcNow), ct);
        }

        if (order.PaymentStatus == PaymentStatus.Paid)
        {
            var serials = await OrderInvoicePayloadBuilder.LoadSerialsAsync(inventoryDb, order.Id, ct);
            await publish.Publish(new OrderPaidEvent(
                order.Id, order.CustomerId, order.OrderNumber,
                OrderInvoicePayloadBuilder.BuildLines(order, serials),
                OrderInvoicePayloadBuilder.BuildShipping(order),
                buyer, order.BusinessDate, DateTime.UtcNow), ct);
        }
    }

}
