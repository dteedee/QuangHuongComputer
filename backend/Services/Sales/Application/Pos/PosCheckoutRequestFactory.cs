using Sales.Application.Checkout;
using Sales.Domain;

namespace Sales.Application.Pos;

/// <summary>
/// Dịch một yêu cầu bán tại quầy sang <see cref="CheckoutRequest"/> của đường chốt đơn chung.
///
/// Ba điểm mà luồng POS cũ (gọi nhờ checkout của khách) làm hỏng và ở đây được đặt đúng:
/// <c>Channel = Pos</c>, <c>IsPickup = true</c> và <c>ShippingFee = 0</c> — tức không còn khoản
/// 30.000đ phí ship bị cộng lén vào mọi đơn bán tại quầy.
/// </summary>
internal static class PosCheckoutRequestFactory
{
    public static CheckoutRequest Build(
        PosSaleRequest req, Cart cart, string cashierId, decimal manualDiscountAllowed)
        => new()
        {
            CartId = cart.Id,
            Channel = CheckoutChannel.Pos,
            CustomerId = req.CustomerId,
            AnonymousId = cart.AnonymousId,
            GuestPhone = req.CustomerPhone,
            StoreId = req.StoreId,
            ShiftId = req.ShiftId,
            CashierId = Guid.TryParse(cashierId, out var cashier) ? cashier : null,
            // Số ĐÃ BỊ CẮT theo trần, không phải số thu ngân gõ — nếu không, tổng đơn lưu xuống
            // sẽ khác con số đã đọc cho khách ở bước tạm tính.
            ManualDiscount = manualDiscountAllowed > 0m ? manualDiscountAllowed : null,
            ManualDiscountReason = req.ManualDiscountReason,
            ApprovedBy = manualDiscountAllowed > 0m ? (req.ApprovedBy ?? cashierId) : cashierId,
            PromotionCodes = req.PromotionCodes,
            PaymentMethod = PaymentMethodChoice.Cash,
            Shipping = new ShippingInfo(
                RecipientName: string.IsNullOrWhiteSpace(req.CustomerName) ? "Khách lẻ" : req.CustomerName!,
                Phone: string.IsNullOrWhiteSpace(req.CustomerPhone) ? "0000000000" : req.CustomerPhone!,
                StreetAddress: null, Ward: null, District: null, Province: null,
                ShippingFee: 0m,
                IsPickup: true,
                PickupStoreId: req.StoreId.ToString(),
                PickupStoreName: null,
                Notes: req.Notes),
        };
}
