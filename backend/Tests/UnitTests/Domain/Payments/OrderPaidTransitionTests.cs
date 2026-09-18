using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// W0-10 — vì sao `OrderPaidConsumer` phải gọi `Order.MarkAsPaid` chứ KHÔNG phải `SetStatus(Paid)`:
/// `SetStatus` ghi đè thẳng OrderStatus nên một đơn đã Shipped/Delivered/Completed bị KÉO LÙI về Paid,
/// và nó không bao giờ đặt `PaymentStatus` ⇒ đơn "đã trả" mà `PaymentStatus` vẫn Pending
/// (đúng lỗi mà GHN `payment_type_id` đọc phải).
/// </summary>
public class OrderPaidTransitionTests
{
    private static Order NewOrder(OrderStatus status = OrderStatus.Confirmed)
    {
        var order = new Order(
            customerId: Guid.NewGuid(),
            shippingAddress: "12 Lê Lợi, Hải Phòng",
            items: new List<OrderItem> { new(Guid.NewGuid(), "Laptop", 10_000_000m, 1) },
            taxRate: 0m);
        order.SetStatus(status);
        return order;
    }

    [Fact]
    public void MarkAsPaid_TuConfirmed_LenPaid_VaDatPaymentStatus()
    {
        var order = NewOrder(OrderStatus.Confirmed);
        order.MarkAsPaid("pay-1");

        order.Status.Should().Be(OrderStatus.Paid);
        order.PaymentStatus.Should().Be(PaymentStatus.Paid);
    }

    [Theory]
    [InlineData(OrderStatus.Shipped)]
    [InlineData(OrderStatus.Delivered)]
    [InlineData(OrderStatus.Fulfilled)]
    public void MarkAsPaid_KhongKeoLuiTrangThaiDaTienXa(OrderStatus advanced)
    {
        var order = NewOrder(advanced);
        order.MarkAsPaid("pay-2");

        order.Status.Should().Be(advanced, "thu tiền COD lúc giao không được làm đơn lùi về Paid");
        order.PaymentStatus.Should().Be(PaymentStatus.Paid);
    }

    [Fact]
    public void SetStatus_LaLyDoPhaiDoi_NoKeoLuiVaBoQuaPaymentStatus()
    {
        var order = NewOrder(OrderStatus.Delivered);
        order.SetStatus(OrderStatus.Paid);

        order.Status.Should().Be(OrderStatus.Paid, "đây chính là hành vi sai của code cũ");
        order.PaymentStatus.Should().Be(PaymentStatus.Pending, "SetStatus không bao giờ đặt PaymentStatus");
    }

    [Fact]
    public void MarkAsPaid_DonDaHuy_Nem()
    {
        var order = NewOrder(OrderStatus.Cancelled);
        var act = () => order.MarkAsPaid("pay-3");
        act.Should().Throw<InvalidOperationException>(
            "OrderPaidConsumer phải chặn đơn Cancelled TRƯỚC khi gọi MarkAsPaid");
    }
}
