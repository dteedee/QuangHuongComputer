using BuildingBlocks.Messaging.IntegrationEvents;

namespace Accounting.Application.Invoicing;

/// <summary>
/// Dữ liệu tối thiểu để lập một hoá đơn bán ra từ một đơn hàng.
///
/// Tồn tại để <c>OrderPaidEvent</c> (đơn trả trước) và <c>OrderDeliveredEvent</c>
/// (đơn công nợ — D10: khoản phải thu ghi nhận lúc GIAO HÀNG) đi chung đúng một đường dựng hoá đơn.
/// Mọi thứ cần thiết đều ĐI KÈM sự kiện; module Kế toán không bao giờ truy ngược sang Sales.
/// </summary>
public sealed record OrderInvoicePayload(
    Guid OrderId,
    Guid CustomerId,
    string OrderNumber,
    IReadOnlyList<InvoiceLineDto> Items,
    ShippingLineDto? Shipping,
    BuyerInvoiceInfo? Buyer,
    DateOnly OrderBusinessDate,
    bool SettleImmediately)
{
    public static OrderInvoicePayload FromPaid(OrderPaidEvent e) => new(
        e.OrderId, e.CustomerId, e.OrderNumber, e.Items, e.Shipping, e.Buyer, e.OrderBusinessDate,
        SettleImmediately: true);

    /// <summary>
    /// Đơn giao hàng: hoá đơn được phát hành nhưng KHÔNG tự tất toán — tiền có thể chưa về
    /// (bán công nợ). Việc thu tiền sẽ ghi nhận qua <c>/ar/{id}/apply-payment</c>.
    /// </summary>
    public static OrderInvoicePayload FromDelivered(OrderDeliveredEvent e) => new(
        e.OrderId, e.CustomerId, e.OrderNumber, e.Items, e.Shipping, e.Buyer, e.OrderBusinessDate,
        SettleImmediately: false);
}
