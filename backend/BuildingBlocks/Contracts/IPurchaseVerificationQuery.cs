namespace BuildingBlocks.Contracts;

/// <summary>
/// "Người này đã thực sự nhận món hàng này chưa?" — câu hỏi Catalog (đánh giá sản phẩm) cần hỏi
/// Sales mà không được tham chiếu Sales (module không tham chiếu module; chỉ host nối bản cài đặt).
///
/// Vì sao tồn tại: trước đây cờ "đã mua hàng" đi qua header <c>X-Verified-Purchase</c> do một
/// middleware ở gateway ghi vào request. Endpoint đọc header → an toàn phụ thuộc hoàn toàn vào thứ
/// tự middleware và regex khớp route; lệch một chút là client tự cấp huy hiệu cho mình. Nay endpoint
/// hỏi thẳng server qua contract này, không còn giá trị nào từ client được tin.
///
/// Cài đặt duy nhất nằm trong Sales (<c>Sales.Application.Orders.PurchaseVerificationQuery</c>).
/// </summary>
public interface IPurchaseVerificationQuery
{
    /// <summary>
    /// True khi <paramref name="userId"/> có ít nhất một đơn ĐÃ GIAO hoặc ĐÃ HOÀN TẤT chứa
    /// <paramref name="productId"/>. Đơn mới thanh toán/đang giao/đã huỷ không tính — khách chưa
    /// cầm hàng trên tay thì chưa có gì để đánh giá.
    /// <paramref name="userId"/> không phải GUID hợp lệ ⇒ false (fail-closed), không ném lỗi.
    /// </summary>
    Task<bool> HasReceivedProductAsync(
        string userId,
        Guid productId,
        CancellationToken cancellationToken = default);
}
