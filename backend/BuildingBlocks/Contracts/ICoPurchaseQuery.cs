namespace BuildingBlocks.Contracts;

/// <summary>
/// "Khách mua sản phẩm X thường mua kèm gì?" — Catalog (khối "Thường được mua cùng" trên trang
/// sản phẩm) cần hỏi Sales mà không được tham chiếu Sales. Cùng khuôn với
/// <see cref="IPurchaseVerificationQuery"/>: contract ở BuildingBlocks, cài đặt duy nhất trong Sales
/// (<c>Sales.Application.Orders.CoPurchaseQuery</c>), host nối DI.
///
/// Chỉ trả về số đếm tổng hợp (sản phẩm + số đơn), không bao giờ trả thông tin đơn/khách — nhờ vậy
/// endpoint công khai dựa trên nó không lộ gì về người mua.
/// </summary>
public interface ICoPurchaseQuery
{
    /// <summary>
    /// Các sản phẩm xuất hiện CÙNG ĐƠN với <paramref name="productId"/> trong
    /// <paramref name="window"/> gần nhất, xếp theo số đơn chung giảm dần.
    ///
    /// Đơn được tính: đơn web ĐÃ GIAO hoặc ĐÃ HOÀN TẤT, và đơn POS đã bàn giao tại quầy
    /// (Fulfilled/Completed). Đơn huỷ không bao giờ được tính. Dòng quà tặng bị bỏ qua (khách
    /// không chọn mua món đó). Chỉ những cặp có ít nhất <paramref name="minOrders"/> đơn chung.
    /// </summary>
    Task<IReadOnlyList<CoPurchaseCount>> GetCoPurchasedAsync(
        Guid productId,
        TimeSpan window,
        int minOrders,
        int take,
        CancellationToken cancellationToken = default);
}

/// <param name="ProductId">Sản phẩm được mua kèm.</param>
/// <param name="OrderCount">Số đơn (khác nhau) chứa cả hai sản phẩm.</param>
public sealed record CoPurchaseCount(Guid ProductId, int OrderCount);
