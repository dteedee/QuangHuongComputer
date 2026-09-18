namespace Payments.Application;

/// <summary>
/// W0-10 — sự thật về đơn hàng mà Payments cần, LẤY TỪ SERVER (không bao giờ từ client).
/// Payments KHÔNG tham chiếu Sales (chiều ngược lại mới đúng), nên interface khai báo ở đây
/// và Sales cài đặt (<c>Sales/Application/Payments/OrderPaymentInfoProvider.cs</c>).
/// </summary>
public record OrderPaymentInfo(
    Guid OrderId,
    Guid CustomerId,
    decimal TotalAmount,
    bool IsCancelled,
    bool IsPaid);

public interface IOrderPaymentInfoProvider
{
    /// <summary>Trả null nếu đơn không tồn tại.</summary>
    Task<OrderPaymentInfo?> GetAsync(Guid orderId, CancellationToken ct = default);
}
