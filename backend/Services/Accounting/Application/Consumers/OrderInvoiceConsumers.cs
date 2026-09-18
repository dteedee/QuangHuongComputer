using Accounting.Application.Invoicing;
using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;

namespace Accounting.Application.Consumers;

/// <summary>
/// Đơn trả trước đã thanh toán → lập hoá đơn bán ra VND, tự tất toán.
/// Thay cho <c>InvoiceRequestedConsumer</c> cũ (USD, VAT 10% cộng thêm, bỏ qua giảm giá và phí ship,
/// không chống trùng) — bản cũ đã được XOÁ chứ không vá.
/// </summary>
public class OrderPaidInvoiceConsumer : IConsumer<OrderPaidEvent>
{
    private readonly OrderInvoiceService _invoices;

    public OrderPaidInvoiceConsumer(OrderInvoiceService invoices) => _invoices = invoices;

    public Task Consume(ConsumeContext<OrderPaidEvent> context)
        => _invoices.CreateAsync(OrderInvoicePayload.FromPaid(context.Message), context.CancellationToken);
}

/// <summary>
/// D10: với đơn BÁN CÔNG NỢ, khoản phải thu được ghi nhận lúc GIAO HÀNG chứ không phải lúc thu tiền.
/// Hoá đơn được phát hành ngay, còn nguyên số phải thu; tất toán về sau sẽ phát
/// <c>InvoicePaidEvent</c> mang theo <c>OrderId</c> để W2-23 đóng đơn.
///
/// Đơn trả trước đã có hoá đơn từ <see cref="OrderPaidInvoiceConsumer"/>; ở đây sẽ trúng
/// bước chống trùng theo <c>OrderId</c> và không tạo gì thêm.
/// </summary>
public class OrderDeliveredInvoiceConsumer : IConsumer<OrderDeliveredEvent>
{
    private readonly OrderInvoiceService _invoices;

    public OrderDeliveredInvoiceConsumer(OrderInvoiceService invoices) => _invoices = invoices;

    public Task Consume(ConsumeContext<OrderDeliveredEvent> context)
        => _invoices.CreateAsync(OrderInvoicePayload.FromDelivered(context.Message), context.CancellationToken);
}
