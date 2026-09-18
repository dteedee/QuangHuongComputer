using System.Linq.Expressions;

namespace Sales.Domain;

/// <summary>
/// THE revenue predicate — định nghĩa DUY NHẤT của "đơn hàng này có được tính vào doanh thu không".
///
/// Vì sao phải tập trung: trước W2-3 mỗi nơi tự lọc một kiểu. `/api/sales/admin/stats` lọc
/// <c>PaymentStatus == Paid</c> (và vì chưa có gì gọi <c>MarkAsPaid</c> nên báo cáo luôn ra 0đ),
/// Reporting lọc <c>Status != Cancelled</c> (tính cả đơn chưa thu tiền), dashboard lại lọc kiểu thứ ba.
/// Ba con số khác nhau cho cùng một câu hỏi.
///
/// Định nghĩa (plan.md · phase-21 "Related Code Files"):
///   ĐƯỢC TÍNH  khi đã thu tiền (<c>PaymentStatus = Paid</c>) HOẶC đơn đã hoàn tất
///              (<c>Status = Completed</c> — hàng đã giao và đã đối soát).
///   KHÔNG TÍNH khi đơn đã huỷ, hoặc tiền đã hoàn (<c>PaymentStatus = Refunded</c>).
///   RÒNG       doanh thu ghi nhận trừ đi tiền đã hoàn cho khách (xem <see cref="NetAmount"/>).
///
/// Bên dùng lại: W2-10 (`/admin/stats`), W2-16 (Reporting), W2-14 (kế toán). KHÔNG sao chép điều
/// kiện này ra chỗ khác — sửa ở đây là sửa mọi báo cáo cùng lúc.
/// </summary>
public static class RecognizedRevenue
{
    /// <summary>
    /// Vị từ dịch được sang SQL — dùng trực tiếp trong <c>Where()</c> trên <c>DbSet&lt;Order&gt;</c>.
    /// </summary>
    public static Expression<Func<Order, bool>> Predicate => order =>
        order.Status != OrderStatus.Cancelled
        && order.PaymentStatus != PaymentStatus.Refunded
        && (order.PaymentStatus == PaymentStatus.Paid || order.Status == OrderStatus.Completed);

    /// <summary>Phiên bản biên dịch sẵn cho dữ liệu đã nạp vào bộ nhớ.</summary>
    public static bool IsRecognized(Order order) => Compiled(order);

    private static readonly Func<Order, bool> Compiled = Predicate.Compile();

    /// <summary>
    /// Lọc doanh thu ghi nhận trên một truy vấn đơn hàng.
    /// </summary>
    public static IQueryable<Order> Recognized(this IQueryable<Order> orders) => orders.Where(Predicate);

    /// <summary>
    /// Doanh thu RÒNG của một đơn = tổng tiền đơn − tiền đã hoàn cho khách.
    /// Không bao giờ âm: hoàn quá tổng đơn là dữ liệu hỏng, không phải doanh thu âm.
    /// </summary>
    /// <param name="orderTotal">Tổng tiền đơn (<c>Orders.TotalAmount</c>, đã gồm VAT theo D01).</param>
    /// <param name="refundedAmount">Tổng tiền đã hoàn của đơn (Σ <c>ReturnRequests.RefundAmount</c> đã hoàn).</param>
    public static decimal NetAmount(decimal orderTotal, decimal refundedAmount)
    {
        var net = orderTotal - (refundedAmount < 0m ? 0m : refundedAmount);
        return net < 0m ? 0m : net;
    }
}
