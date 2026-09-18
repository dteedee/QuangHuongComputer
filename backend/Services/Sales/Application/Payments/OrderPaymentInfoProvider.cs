using Microsoft.EntityFrameworkCore;
using Payments.Application;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Payments;

/// <summary>
/// W0-10 — cài đặt <see cref="IOrderPaymentInfoProvider"/> (interface khai báo trong Payments).
/// Đây là ĐƯỜNG DUY NHẤT để `/api/payments/initiate` biết số tiền và chủ sở hữu của một đơn hàng;
/// số tiền client gửi lên không bao giờ được dùng nữa.
/// Chiều phụ thuộc: Sales → Payments (Payments KHÔNG tham chiếu Sales).
/// </summary>
public class OrderPaymentInfoProvider : IOrderPaymentInfoProvider
{
    private readonly SalesDbContext _db;

    public OrderPaymentInfoProvider(SalesDbContext db)
    {
        _db = db;
    }

    public async Task<OrderPaymentInfo?> GetAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await _db.Orders
            .AsNoTracking()
            .Where(o => o.Id == orderId)
            .Select(o => new
            {
                o.Id,
                o.CustomerId,
                o.TotalAmount,
                o.Status,
                o.PaymentStatus
            })
            .FirstOrDefaultAsync(ct);

        if (order is null) return null;

        return new OrderPaymentInfo(
            OrderId: order.Id,
            CustomerId: order.CustomerId,
            TotalAmount: order.TotalAmount,
            IsCancelled: order.Status == OrderStatus.Cancelled,
            IsPaid: order.PaymentStatus == PaymentStatus.Paid);
    }
}
