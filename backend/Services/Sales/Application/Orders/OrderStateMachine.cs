using BuildingBlocks.Endpoints;
using Sales.Domain;

namespace Sales.Application.Orders;

/// <summary>
/// W2-23 — BẢNG CHUYỂN TRẠNG THÁI DUY NHẤT của đơn hàng.
///
/// Vì sao phải có: trước track này mỗi endpoint tự viết điều kiện riêng (<c>SetStatus</c> thì không
/// kiểm tra gì cả), nên một đơn đã <c>Delivered</c> vẫn bị kéo lùi về <c>Confirmed</c>, và đơn mới
/// đặt cọc vẫn xuất kho được. Ở đây trạng thái là MỘT CHIỀU và mọi bước nhảy sai là
/// <see cref="ConflictException"/> → HTTP 409 kèm trạng thái hiện tại (docs/api-conventions.md §1),
/// chứ không phải "không làm gì" trong im lặng.
/// </summary>
public static class OrderStateMachine
{
    /// <summary>Trạng thái đích hợp lệ cho từng trạng thái nguồn. Không có cạnh nào đi lùi.</summary>
    private static readonly IReadOnlyDictionary<OrderStatus, OrderStatus[]> Allowed =
        new Dictionary<OrderStatus, OrderStatus[]>
        {
            [OrderStatus.Draft] = new[] { OrderStatus.Pending, OrderStatus.Confirmed, OrderStatus.Cancelled },
            [OrderStatus.Pending] = new[] { OrderStatus.Confirmed, OrderStatus.Paid, OrderStatus.Cancelled },
            [OrderStatus.Confirmed] = new[]
            {
                OrderStatus.Paid, OrderStatus.Fulfilled, OrderStatus.Shipped, OrderStatus.Cancelled,
            },
            [OrderStatus.Paid] = new[]
            {
                OrderStatus.Fulfilled, OrderStatus.Shipped, OrderStatus.Completed, OrderStatus.Cancelled,
            },
            [OrderStatus.Fulfilled] = new[]
            {
                OrderStatus.Shipped, OrderStatus.Delivered, OrderStatus.Completed, OrderStatus.Cancelled,
            },
            [OrderStatus.Shipped] = new[] { OrderStatus.Delivered, OrderStatus.Cancelled },
            [OrderStatus.Delivered] = new[] { OrderStatus.Completed, OrderStatus.Cancelled },
            // Điểm cuối: đơn đã hoàn thành hoặc đã huỷ không đi đâu nữa. Muốn đảo ngược thì
            // phải đi qua luồng ĐỔI/TRẢ (ReturnRequest), không phải đổi trạng thái đơn.
            [OrderStatus.Completed] = Array.Empty<OrderStatus>(),
            [OrderStatus.Cancelled] = Array.Empty<OrderStatus>(),
        };

    /// <summary>Chuyển trạng thái THANH TOÁN — cũng một chiều.</summary>
    private static readonly IReadOnlyDictionary<PaymentStatus, PaymentStatus[]> AllowedPayment =
        new Dictionary<PaymentStatus, PaymentStatus[]>
        {
            [PaymentStatus.Pending] = new[] { PaymentStatus.PartiallyPaid, PaymentStatus.Paid, PaymentStatus.Failed },
            [PaymentStatus.PartiallyPaid] = new[] { PaymentStatus.Paid, PaymentStatus.Refunded, PaymentStatus.Failed },
            [PaymentStatus.Paid] = new[] { PaymentStatus.Refunded },
            [PaymentStatus.Failed] = new[] { PaymentStatus.Pending, PaymentStatus.PartiallyPaid, PaymentStatus.Paid },
            [PaymentStatus.Refunded] = Array.Empty<PaymentStatus>(),
        };

    /// <summary>Các mốc đòi hỏi hàng đã (hoặc đang) rời kho — bị chặn khi đơn mới thu một phần.</summary>
    private static readonly OrderStatus[] HandoverStates =
    {
        OrderStatus.Fulfilled, OrderStatus.Shipped, OrderStatus.Delivered, OrderStatus.Completed,
    };

    public static IReadOnlyList<OrderStatus> AllowedNext(OrderStatus from)
        => Allowed.TryGetValue(from, out var next) ? next : Array.Empty<OrderStatus>();

    /// <summary>
    /// D10 quy tắc 5 — đơn CÔNG NỢ: giao trước, thu sau theo hạn. Đây là NGOẠI LỆ DUY NHẤT của
    /// quy tắc "thu chưa đủ thì không được xuất hàng".
    /// </summary>
    /// <remarks>
    /// KIỂM CHỨNG ĐỐI KHÁNG (W2-23): trước đây chỉ cần <c>PaymentMethod == "Credit"</c> là đủ, mà
    /// trường đó do CLIENT gửi — <c>POST /api/sales/public/guest-checkout</c> (AllowAnonymous) và
    /// <c>/api/sales/checkout</c> đưa thẳng <c>paymentMethod</c> của payload vào đơn. Nghĩa là bất
    /// kỳ khách nào cũng tự tắt được chốt chặn "thu chưa đủ thì không xuất hàng" và ép hoá đơn phát
    /// ra khi mới đặt cọc. Ngoại lệ công nợ vì thế phải neo vào dữ liệu chỉ NHÂN VIÊN đặt được:
    /// hạn thanh toán (<c>SetQuotationLink</c>) hoặc đơn chuyển từ báo giá (D10 quy tắc 5 nói rõ
    /// "đơn công nợ TỪ BÁO GIÁ").
    /// </remarks>
    public static bool IsCreditOrder(Order order)
        => order.PaymentDueDate.HasValue
           || (order.QuotationId.HasValue
               && string.Equals(order.PaymentMethod, "Credit", StringComparison.OrdinalIgnoreCase));

    public static bool CanTransition(Order order, OrderStatus to, out string? reason)
    {
        reason = null;
        if (order.Status == to) return true; // idempotent: gọi lại cùng mốc không phải lỗi

        if (!AllowedNext(order.Status).Contains(to))
        {
            reason = $"Không thể chuyển đơn từ trạng thái {Vi(order.Status)} sang {Vi(to)}.";
            return false;
        }

        if (HandoverStates.Contains(to)
            && order.PaymentStatus == PaymentStatus.PartiallyPaid
            && !IsCreditOrder(order))
        {
            // Không nêu con số ở đây: bảng trạng thái không đọc sổ thu (OrderPayments) nên mọi
            // con số suy ra từ trạng thái đều sai. Số còn thiếu thật do RecordTenderAsync trả về.
            reason = "Đơn mới thu một phần nên chưa được xuất hàng. "
                     + "Chỉ đơn bán công nợ (có hạn thanh toán) mới được giao trước khi thu đủ.";
            return false;
        }

        if (to == OrderStatus.Completed
            && (order.PaymentStatus != PaymentStatus.Paid
                || order.FulfillmentStatus != FulfillmentStatus.Fulfilled))
        {
            reason = "Đơn chỉ hoàn thành khi đã thu đủ tiền VÀ đã giao đủ hàng.";
            return false;
        }

        return true;
    }

    /// <summary>Ném 409 kèm trạng thái hiện tại khi bước nhảy không hợp lệ.</summary>
    public static void EnsureCanTransition(Order order, OrderStatus to)
    {
        if (!CanTransition(order, to, out var reason))
            throw new ConflictException(reason!);
    }

    public static void EnsurePaymentTransition(Order order, PaymentStatus to)
    {
        if (order.PaymentStatus == to) return;

        // Đơn ĐÃ HUỶ là điểm cuối. Tiền về sau khi huỷ (webhook cổng tới muộn, COD thu nhầm) phải
        // đi đường HOÀN TIỀN, không được biến đơn huỷ thành "đã thanh toán" — nếu không, đơn đã nhả
        // tồn kho lại nằm trong doanh thu ghi nhận (`RecognizedRevenue` loại theo Status != Cancelled,
        // nhưng `/admin/stats`, GHN `payment_type_id` và sổ thu thì đọc PaymentStatus).
        // `OrderPaidConsumer` đã chặn ở tầng consumer; đây là chốt chặn cuối ở tầng domain nên
        // KHÔNG đường thu tiền nào lách được. `Refunded` vẫn cho phép (đó chính là lối hoàn tiền).
        if (order.Status == OrderStatus.Cancelled && to is PaymentStatus.Paid or PaymentStatus.PartiallyPaid)
            throw new ConflictException(
                "Đơn đã huỷ — không ghi nhận đã thanh toán được. Tiền đã nhận phải xử lý qua luồng hoàn tiền.");

        if (!AllowedPayment.TryGetValue(order.PaymentStatus, out var next) || !next.Contains(to))
            throw new ConflictException(
                $"Không thể chuyển thanh toán của đơn từ {order.PaymentStatus} sang {to}.");
    }

    /// <summary>Số tiền còn phải thu = tổng đơn − các dòng thu chưa bị đảo. Không bao giờ âm.</summary>
    public static decimal AmountDue(Order order, decimal collected)
        => Math.Max(0m, order.TotalAmount - collected);

    public static string Vi(OrderStatus status) => status switch
    {
        OrderStatus.Draft => "Nháp",
        OrderStatus.Pending => "Chờ xác nhận",
        OrderStatus.Confirmed => "Đã xác nhận",
        OrderStatus.Paid => "Đã thanh toán",
        OrderStatus.Fulfilled => "Đã xuất kho",
        OrderStatus.Shipped => "Đang giao",
        OrderStatus.Delivered => "Đã giao",
        OrderStatus.Completed => "Hoàn thành",
        OrderStatus.Cancelled => "Đã huỷ",
        _ => status.ToString(),
    };
}
