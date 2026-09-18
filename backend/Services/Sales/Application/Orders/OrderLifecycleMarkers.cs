namespace Sales.Application.Orders;

/// <summary>
/// W2-23 — dấu mốc IDEMPOTENT ghi vào <c>OrderHistories.Notes</c>.
///
/// Vì sao dùng bảng lịch sử thay vì một cột cờ mới: repo chưa có outbox (W1-5 ghi nhận:
/// MassTransit.EntityFrameworkCore đòi EF ≥ 9.0.1 còn repo ghim 8.0.2), nên một sự kiện CÓ THỂ
/// được phát lại. Bên phát cần một chốt bền vững "đơn này đã yêu cầu hoá đơn rồi" mà KHÔNG phải
/// thêm cột + migration vào <c>Orders</c> (bảng do W2-3 sở hữu). <c>OrderHistories</c> là sổ
/// append-only sẵn có, đã nằm trong cùng giao dịch, và tra cứu được bằng mắt khi đối soát.
/// </summary>
public static class OrderLifecycleMarkers
{
    /// <summary>Đã phát <c>InvoiceRequestedEvent</c> cho đơn này — phát lại là cấm.</summary>
    public const string InvoiceRequested = "[evt:invoice-requested]";

    /// <summary>Đã phát <c>OrderShippedEvent</c>.</summary>
    public const string Shipped = "[evt:order-shipped]";

    /// <summary>Đã phát <c>OrderDeliveredEvent</c>.</summary>
    public const string Delivered = "[evt:order-delivered]";

    /// <summary>Đã mở việc hoàn tiền cho đơn huỷ có tiền đã thu.</summary>
    public const string RefundTask = "[task:refund]";

    /// <summary>Dấu một lần thu tiền theo mã đối soát — chặn webhook/IPN lặp.</summary>
    public static string Tender(string reference) => $"[tender:{reference}]";
}
