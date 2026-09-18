using BuildingBlocks.Endpoints;
using Sales.Application.Orders;

namespace Sales.Domain;

/// <summary>
/// Chuyển trạng thái của <see cref="Order"/> — sở hữu bởi **W2-23** (`phase-72`), bàn giao từ W2-3.
///
/// MỌI bước nhảy đi qua đúng một nơi: <see cref="OrderStateMachine"/>. Bước nhảy sai ném
/// <see cref="ConflictException"/> → HTTP 409 kèm trạng thái hiện tại (docs/api-conventions.md §1).
/// Trước đây mỗi phương thức tự viết điều kiện riêng và <c>SetStatus</c> thì không kiểm tra gì cả,
/// nên đơn đã giao vẫn bị kéo lùi về "đã xác nhận".
///
/// Lớp này CHỈ đổi trạng thái trong bộ nhớ. Ghi <c>OrderHistories</c>, phát sự kiện tích hợp, nhả
/// tồn kho và mở việc hoàn tiền là việc của <see cref="OrderLifecycleService"/> — đó là bên ghi duy
/// nhất được phép gọi các phương thức dưới đây từ endpoint/consumer.
/// </summary>
public partial class Order
{
    public void Confirm()
    {
        OrderStateMachine.EnsureCanTransition(this, OrderStatus.Confirmed);
        if (Status == OrderStatus.Confirmed) return;

        Status = OrderStatus.Confirmed;
        ConfirmedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        RaiseDomainEvent(new OrderConfirmedDomainEvent(
            Id, Items.Select(i => new OrderItemDto(i.ProductId, i.Quantity)).ToList()));
    }

    /// <summary>
    /// "Tiền đã về đủ" — LỐI VÀO DUY NHẤT. Mọi đường thu tiền (COD, chuyển khoản, webhook SePay,
    /// IPN cổng, trả góp, thu công nợ) phải gọi qua đây, không đường nào được tự gán
    /// <see cref="PaymentStatus"/>. Idempotent: gọi lại khi đã Paid là no-op.
    /// </summary>
    public void MarkAsPaid(string paymentReference)
    {
        if (PaymentStatus == PaymentStatus.Paid) return;

        OrderStateMachine.EnsurePaymentTransition(this, PaymentStatus.Paid);
        PaymentStatus = PaymentStatus.Paid;
        PaidAt ??= DateTime.UtcNow;

        // Đơn COD/POS không đi qua bước Confirmed thủ công: tiền đã vào thì trạng thái phải tiến.
        // Nhưng KHÔNG BAO GIỜ kéo lùi một đơn đã Shipped/Delivered (đơn COD trả tiền lúc nhận hàng).
        if (Status is OrderStatus.Pending or OrderStatus.Confirmed)
        {
            Status = OrderStatus.Paid;
        }

        UpdatedAt = DateTime.UtcNow;
        TryComplete();
    }

    /// <summary>Thu một phần (đặt cọc). D07 §5: đặt cọc KHÔNG phải sự kiện xuất hoá đơn.</summary>
    public void MarkAsPartiallyPaid()
    {
        if (PaymentStatus == PaymentStatus.Paid) return;
        OrderStateMachine.EnsurePaymentTransition(this, PaymentStatus.PartiallyPaid);

        PaymentStatus = PaymentStatus.PartiallyPaid;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsFulfilled()
    {
        OrderStateMachine.EnsureCanTransition(this, OrderStatus.Fulfilled);
        if (FulfillmentStatus == FulfillmentStatus.Fulfilled && Status != OrderStatus.Confirmed) return;

        FulfillmentStatus = FulfillmentStatus.Fulfilled;
        if (Status is OrderStatus.Confirmed or OrderStatus.Paid)
        {
            Status = OrderStatus.Fulfilled;
            FulfilledAt = DateTime.UtcNow;
        }

        UpdatedAt = DateTime.UtcNow;
        TryComplete();
    }

    public void SetShippingTracking(decimal shippingFee, string trackingNumber, string shippingProvider)
    {
        ShippingFee = shippingFee;
        TrackingNumber = trackingNumber;
        ShippingProvider = shippingProvider;
        DeliveryTrackingNumber = trackingNumber;
        DeliveryCarrier = shippingProvider;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsShipped(string trackingNumber, string carrier)
    {
        OrderStateMachine.EnsureCanTransition(this, OrderStatus.Shipped);
        if (Status == OrderStatus.Shipped) return;

        // Giao cho đơn vị vận chuyển = hàng đã rời kho; giữ hai trạng thái nhất quán với nhau.
        FulfillmentStatus = FulfillmentStatus.Fulfilled;
        FulfilledAt ??= DateTime.UtcNow;

        Status = OrderStatus.Shipped;
        ShippedAt = DateTime.UtcNow;
        DeliveryTrackingNumber = trackingNumber;
        DeliveryCarrier = carrier;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsDelivered()
    {
        OrderStateMachine.EnsureCanTransition(this, OrderStatus.Delivered);
        if (Status == OrderStatus.Delivered) return;

        FulfillmentStatus = FulfillmentStatus.Fulfilled;
        FulfilledAt ??= DateTime.UtcNow;

        Status = OrderStatus.Delivered;
        DeliveredAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        TryComplete();
    }

    /// <summary>Đơn chỉ Completed khi ĐÃ thu tiền VÀ đã giao đủ hàng.</summary>
    private void TryComplete()
    {
        if (PaymentStatus != PaymentStatus.Paid || FulfillmentStatus != FulfillmentStatus.Fulfilled) return;
        if (!OrderStateMachine.CanTransition(this, OrderStatus.Completed, out _)) return;

        Status = OrderStatus.Completed;
        CompletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        RaiseDomainEvent(new OrderCompletedDomainEvent(Id));
    }

    /// <summary>Chốt đơn thủ công (đơn đã giao, đã thu đủ) — dùng bởi endpoint `/complete`.</summary>
    public void MarkAsCompleted()
    {
        OrderStateMachine.EnsureCanTransition(this, OrderStatus.Completed);
        if (Status == OrderStatus.Completed) return;

        Status = OrderStatus.Completed;
        CompletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
        RaiseDomainEvent(new OrderCompletedDomainEvent(Id));
    }

    public void Cancel(string reason)
    {
        OrderStateMachine.EnsureCanTransition(this, OrderStatus.Cancelled);
        if (Status == OrderStatus.Cancelled) return;

        Status = OrderStatus.Cancelled;
        CancelledAt = DateTime.UtcNow;
        CancellationReason = reason;
        UpdatedAt = DateTime.UtcNow;

        RaiseDomainEvent(new OrderCancelledDomainEvent(Id, reason));
    }

    public void AddInternalNote(string note)
    {
        InternalNotes = string.IsNullOrWhiteSpace(InternalNotes)
            ? note
            : $"{InternalNotes}\n{DateTime.UtcNow:yyyy-MM-dd HH:mm}: {note}";
        UpdatedAt = DateTime.UtcNow;
    }

    public void IncrementRetryCount(string? failureReason = null)
    {
        RetryCount++;
        FailureReason = failureReason;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Đặt trạng thái theo tên (PUT /admin/orders/{id}/status). KHÔNG còn là cửa hậu: từ W2-23 nó
    /// đi qua đúng bảng chuyển trạng thái như mọi đường khác, nên `Đã giao → Đã xác nhận` trả 409.
    /// </summary>
    public void SetStatus(OrderStatus status)
    {
        switch (status)
        {
            case OrderStatus.Confirmed: Confirm(); return;
            case OrderStatus.Fulfilled: MarkAsFulfilled(); return;
            case OrderStatus.Shipped: MarkAsShipped(DeliveryTrackingNumber ?? "", DeliveryCarrier ?? ""); return;
            case OrderStatus.Delivered: MarkAsDelivered(); return;
            case OrderStatus.Completed: MarkAsCompleted(); return;
            case OrderStatus.Cancelled: Cancel(CancellationReason ?? "Huỷ bởi quản trị"); return;
        }

        OrderStateMachine.EnsureCanTransition(this, status);
        if (Status == status) return;

        Status = status;
        if (status == OrderStatus.Paid) PaidAt ??= DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
}
