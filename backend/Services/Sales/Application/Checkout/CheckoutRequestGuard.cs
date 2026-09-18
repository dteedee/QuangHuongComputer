using Sales.Domain;

namespace Sales.Application.Checkout;

/// <summary>
/// Chốt chặn đầu vào của <see cref="CheckoutOrchestrator"/> — quyền sở hữu và các trường
/// chỉ dành cho nhân viên.
///
/// Đây là nơi bịt hai lỗ IDOR có thật: khách gửi <c>cartId</c> của người khác để chốt đơn hộ
/// (và nhận hàng), và khách gửi <c>manualDiscount</c> của luồng nhân viên để tự giảm giá.
/// </summary>
internal static class CheckoutRequestGuard
{
    /// <summary>Trả về thông báo lỗi nếu yêu cầu không hợp lệ, null nếu hợp lệ.</summary>
    public static string? Validate(CheckoutRequest req)
    {
        if (req.Shipping == null) return "Thiếu thông tin giao hàng";

        if (string.IsNullOrWhiteSpace(req.Shipping.RecipientName))
            return "Tên người nhận là bắt buộc";
        if (string.IsNullOrWhiteSpace(req.Shipping.Phone))
            return "Số điện thoại người nhận là bắt buộc";
        if (req.Shipping.ShippingFee < 0m)
            return "Phí vận chuyển không hợp lệ";

        switch (req.Channel)
        {
            case CheckoutChannel.Guest:
                if (string.IsNullOrWhiteSpace(req.AnonymousId))
                    return "Thiếu định danh phiên khách vãng lai";
                if (string.IsNullOrWhiteSpace(req.GuestEmail) && string.IsNullOrWhiteSpace(req.GuestPhone))
                    return "Khách vãng lai phải có email hoặc số điện thoại để tra cứu đơn";
                break;

            case CheckoutChannel.Web:
                if (!req.CustomerId.HasValue || req.CustomerId == Guid.Empty)
                    return "Phiên đăng nhập không hợp lệ";
                break;

            case CheckoutChannel.Pos:
                if (!req.StoreId.HasValue || req.StoreId == Guid.Empty)
                    return "Đơn tại quầy phải gắn với một cửa hàng";
                break;

            case CheckoutChannel.Quotation:
                if (!req.QuotationId.HasValue || req.QuotationId == Guid.Empty)
                    return "Thiếu mã báo giá để chuyển thành đơn";
                break;
        }

        // Giảm giá tay CHỈ tồn tại ở quầy, và phải có người duyệt để quy trách nhiệm.
        if (req.ManualDiscount is > 0m)
        {
            if (req.Channel != CheckoutChannel.Pos)
                return "Giảm giá thủ công chỉ áp dụng cho bán hàng tại quầy";
            if (string.IsNullOrWhiteSpace(req.ApprovedBy))
                return "Giảm giá thủ công phải ghi nhận người duyệt";
        }

        if (req.ManualDiscount is < 0m)
            return "Giảm giá thủ công không được âm";

        return null;
    }

    /// <summary>
    /// Giỏ hàng phải thuộc về người đang chốt đơn. Kênh POS được phép chốt giỏ do nhân viên dựng
    /// (quyền <c>Sales.Pos</c> đã được kiểm ở tầng endpoint).
    /// </summary>
    public static string? CheckCartOwnership(CheckoutRequest req, Cart cart)
    {
        switch (req.Channel)
        {
            case CheckoutChannel.Web:
                return cart.CustomerId == req.CustomerId
                    ? null
                    : "Giỏ hàng không thuộc về tài khoản này";

            case CheckoutChannel.Guest:
                return string.Equals(cart.AnonymousId, req.AnonymousId, StringComparison.Ordinal)
                    ? null
                    : "Giỏ hàng không thuộc về phiên này";

            default:
                return null;
        }
    }
}
