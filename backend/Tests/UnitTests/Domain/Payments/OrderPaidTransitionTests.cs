using BuildingBlocks.Endpoints;
using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// W0-10 — vì sao `OrderPaidConsumer` phải gọi `Order.MarkAsPaid` chứ KHÔNG phải `SetStatus(Paid)`:
/// `SetStatus` ghi đè thẳng OrderStatus nên một đơn đã Shipped/Delivered/Completed bị KÉO LÙI về Paid,
/// và nó không bao giờ đặt `PaymentStatus` ⇒ đơn "đã trả" mà `PaymentStatus` vẫn Pending
/// (đúng lỗi mà GHN `payment_type_id` đọc phải).
///
/// CẬP NHẬT W2-23 (`phase-72`, IR #19 — "test cho bảng chuyển trạng thái nằm ngoài glob của track"):
/// trạng thái đơn giờ đi qua đúng một bảng, <c>OrderStateMachine</c>, và bước nhảy sai ném
/// <see cref="ConflictException"/> (→ 409) chứ không còn im lặng ghi đè. Vì thế:
///  · dựng đơn ở trạng thái "đã tiến xa" phải đi qua các bước HỢP LỆ, không gán tắt bằng SetStatus;
///  · <c>SetStatus</c> hết là cửa hậu — kéo lùi nay là 409, nên test tài liệu-hoá lỗi cũ được đổi
///    thành test KHOÁ bản vá (xem <see cref="SetStatus_HetLaCuaHau_KeoLuiTrangThaiNem409"/>).
/// </summary>
public class OrderPaidTransitionTests
{
    private static Order NewOrder() => new(
        customerId: Guid.NewGuid(),
        shippingAddress: "12 Lê Lợi, Hải Phòng",
        items: new List<OrderItem> { new(Guid.NewGuid(), "Laptop", 10_000_000m, 1) },
        taxRate: 0m);

    /// <summary>Đưa đơn tới <paramref name="target"/> bằng ĐÚNG các bước bảng trạng thái cho phép.</summary>
    private static Order OrderAt(OrderStatus target)
    {
        var order = NewOrder();
        order.Confirm();
        switch (target)
        {
            case OrderStatus.Confirmed:
                break;
            case OrderStatus.Fulfilled:
                order.MarkAsFulfilled();
                break;
            case OrderStatus.Shipped:
                order.MarkAsShipped("GHN-1", "GHN");
                break;
            case OrderStatus.Delivered:
                order.MarkAsShipped("GHN-1", "GHN");
                order.MarkAsDelivered();
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(target), target, "Chưa hỗ trợ trong test này.");
        }

        order.Status.Should().Be(target, "bước dựng dữ liệu phải hợp lệ trước khi test hành vi");
        return order;
    }

    [Fact]
    public void MarkAsPaid_TuConfirmed_LenPaid_VaDatPaymentStatus()
    {
        var order = OrderAt(OrderStatus.Confirmed);
        order.MarkAsPaid("pay-1");

        order.Status.Should().Be(OrderStatus.Paid);
        order.PaymentStatus.Should().Be(PaymentStatus.Paid);
    }

    /// <summary>
    /// Thu tiền COD lúc giao KHÔNG được kéo đơn lùi về <c>Paid</c>. Trạng thái đích sau khi thu đủ
    /// do <c>Order.TryComplete</c> quyết định (`OrderTransitions.cs:122-134`): đã giao đủ hàng
    /// (<c>FulfillmentStatus = Fulfilled</c>) + đã thu đủ tiền ⇒ <c>Completed</c>, NẾU bảng trạng
    /// thái cho phép cạnh đó. <c>Shipped</c> (hàng đang trên đường) không có cạnh sang
    /// <c>Completed</c> (`OrderStateMachine.cs:34`) nên đơn ở nguyên <c>Shipped</c>.
    /// </summary>
    [Theory]
    [InlineData(OrderStatus.Fulfilled, OrderStatus.Completed)]
    [InlineData(OrderStatus.Shipped, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Delivered, OrderStatus.Completed)]
    public void MarkAsPaid_KhongKeoLuiTrangThaiDaTienXa(OrderStatus advanced, OrderStatus expected)
    {
        var order = OrderAt(advanced);
        order.MarkAsPaid("pay-2");

        order.Status.Should().NotBe(OrderStatus.Paid, "thu tiền COD lúc giao không được làm đơn lùi về Paid");
        order.Status.Should().Be(expected);
        order.PaymentStatus.Should().Be(PaymentStatus.Paid);
    }

    /// <summary>
    /// W2-23: <c>SetStatus</c> nay chuyển tiếp sang đúng phương thức có kiểm tra, nên một đơn ĐÃ GIAO
    /// bị ép về <c>Paid</c> là 409 chứ không phải âm thầm kéo lùi. Đây là bản vá của chính lỗi mà
    /// phiên bản cũ của test này từng tài liệu hoá.
    /// </summary>
    [Fact]
    public void SetStatus_HetLaCuaHau_KeoLuiTrangThaiNem409()
    {
        var order = OrderAt(OrderStatus.Delivered);

        var act = () => order.SetStatus(OrderStatus.Paid);

        act.Should().Throw<ConflictException>().Which.StatusCode.Should().Be(409);
        order.Status.Should().Be(OrderStatus.Delivered, "bước nhảy bị từ chối thì trạng thái không đổi");
        order.PaymentStatus.Should().Be(PaymentStatus.Pending);
    }

    /// <summary>
    /// Đơn ĐÃ HUỶ là điểm cuối: tiền về sau khi huỷ phải đi đường hoàn tiền, không được biến đơn
    /// thành "đã thanh toán". <c>OrderPaidConsumer</c> đã chặn ở tầng consumer; bất biến này khoá
    /// cả tầng domain để không đường thu tiền nào khác lách được.
    /// </summary>
    [Fact]
    public void MarkAsPaid_DonDaHuy_Nem()
    {
        var order = OrderAt(OrderStatus.Confirmed);
        order.Cancel("khách đổi ý");

        var act = () => order.MarkAsPaid("pay-3");

        act.Should().Throw<ConflictException>();
        order.PaymentStatus.Should().Be(PaymentStatus.Pending);
    }
}
