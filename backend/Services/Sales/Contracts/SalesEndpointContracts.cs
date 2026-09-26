using Sales.Application.Pricing;

namespace Sales;

/// <summary>
/// W0-4 — DTO checkout của KHÁCH HÀNG. Đã gỡ <c>CustomerId</c>, <c>ManualDiscount</c>,
/// <c>ShippingFee</c>: đó là ba field cho phép khách tự giảm giá về 0đ, tự đặt phí ship
/// và cắm đơn vào tài khoản người khác. Client vẫn gửi lên cũng không sao — System.Text.Json
/// bỏ qua field lạ, endpoint không 500. Ba field đó nay nằm ở <see cref="StaffCheckoutDto"/>.
/// </summary>
public record CheckoutDto(
    List<CheckoutItemDto> Items,
    string? ShippingAddress,
    string? Notes,
    string? PaymentMethod = "COD",
    bool IsPickup = false,
    string? PickupStoreId = null,
    string? PickupStoreName = null,
    string? CouponCode = null,
    // Người nhận hàng — lưu snapshot vào Order.CustomerName/CustomerPhone (không thêm cột, không migration).
    string? RecipientName = null,
    string? RecipientPhone = null
);

/// <summary>
/// W0-4 — DTO checkout của NHÂN VIÊN (POS tạm thời, RequireRole Admin/Manager/Sale).
/// Giữ các field ảnh hưởng tiền mà khách không được phép dùng. W2-3 thay bằng POS thật.
/// </summary>
public record StaffCheckoutDto(
    List<CheckoutItemDto> Items,
    string? ShippingAddress,
    string? Notes,
    string? PaymentMethod = "COD",
    bool IsPickup = false,
    string? PickupStoreId = null,
    string? PickupStoreName = null,
    string? CouponCode = null,
    string? RecipientName = null,
    string? RecipientPhone = null,
    Guid? CustomerId = null,
    decimal? ManualDiscount = null,
    decimal? ShippingFee = null
);
/// <summary>
/// W0-4 — request đã chuẩn hoá dùng chung cho <c>/checkout</c> (khách) và <c>/staff-checkout</c>.
/// Các field <c>Staff*</c> LUÔN null ở luồng khách; chỉ endpoint có RequireRole mới điền.
/// </summary>
internal sealed record LegacyCheckoutRequest(
    List<CheckoutItemDto> Items,
    string? ShippingAddress,
    string? Notes,
    string? PaymentMethod,
    bool IsPickup,
    string? PickupStoreId,
    string? PickupStoreName,
    string? CouponCode,
    string? RecipientName,
    string? RecipientPhone,
    Guid? StaffCustomerId,
    decimal? StaffManualDiscount,
    decimal? StaffShippingFee);

public record CheckoutItemDto(
    Guid ProductId,
    string ProductName,
    decimal UnitPrice,
    int Quantity,
    // Optional — nếu sản phẩm có biến thể, truyền VariantId để order lưu snapshot đúng dòng biến thể.
    Guid? VariantId = null);
public record UpdateOrderStatusDto(string Status);
public record CancelOrderDto(string Reason);
public record CreateReturnRequestDto(
    Guid OrderId,
    Guid OrderItemId,
    string Reason,
    string? Description,
    // Phase 07
    Sales.Domain.ReturnType? Type = null,
    string? AttachmentUrls = null,
    Guid? ExchangeProductId = null,
    Guid? ExchangeVariantId = null);
public record RejectReturnDto(string Reason);
public record InspectReturnDto(
    Sales.Domain.ReceivedCondition Condition,
    Guid WarehouseId,
    string? Notes = null);
public record ShipOrderDto(string? TrackingNumber, string? Carrier);
public record SetOrderAttributesDto(string? Attributes);

public record CartDto(
    Guid Id,
    Guid CustomerId,
    decimal SubtotalAmount,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal ShippingAmount,
    decimal TotalAmount,
    decimal TaxRate,
    string? CouponCode,
    List<CartItemDto> Items,
    // D01 §6 — thuế tách theo NHÓM THUẾ SUẤT. Giỏ có thể trộn hàng 8% và 10%, khi đó
    // nhãn "Trong đó VAT (8%)" là sai; frontend đọc mảng này và KHÔNG tự tính thuế.
    IReadOnlyList<VatBucket>? VatBreakdown = null,
    // Combo trong giỏ: nhóm nào được giá combo, nhóm nào vỡ/hết hạn và vì sao.
    IReadOnlyList<CartBundleGroupDto>? Bundles = null
);

/// <summary>Một nhóm combo trong giỏ (xem <c>BundleCartPricer</c>).</summary>
public record CartBundleGroupDto(
    Guid BundleId,
    string Name,
    bool IsApplied,
    string? Reason,
    int Sets,
    decimal ListTotal,
    decimal BundleTotal,
    decimal Discount);

public record CartItemDto(
    Guid ProductId,
    string ProductName,
    decimal Price,
    int Quantity,
    decimal Subtotal,
    string? ImageUrl = null,
    int StockQuantity = 999,
    // Biến thể sản phẩm — snapshot lịch sử; null nếu sản phẩm không có biến thể.
    Guid? VariantId = null,
    string? VariantName = null,
    string? VariantSku = null,
    // Combo: dòng thuộc nhóm nào, giảm combo chia về dòng, thành tiền sau giảm combo.
    Guid? BundleId = null,
    string? BundleName = null,
    decimal LineDiscount = 0m,
    decimal LineTotal = 0m
);

/// <summary>POST /api/sales/cart/bundles — thêm <c>Quantity</c> bộ combo vào giỏ.</summary>
public record AddBundleToCartDto(Guid BundleId, int Quantity = 1);

public record AddToCartDto(
    Guid ProductId,
    string ProductName,
    decimal Price,
    int Quantity,
    // Optional — nếu sản phẩm có biến thể (RAM/SSD/màu), truyền VariantId.
    // Endpoint tự fetch snapshot VariantName/Sku từ Catalog, không tin client.
    Guid? VariantId = null
);
public record UpdateQuantityDto(int Quantity);
public record ApplyCouponDto(string CouponCode);
public record SetShippingDto(decimal ShippingAmount);

public record GuestCheckoutDto(
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    string ShippingAddress,
    List<GuestCheckoutItemDto> Items,
    string? CouponCode = null,
    string? Notes = null,
    string? PaymentMethod = null,
    // Combo trong giỏ vãng lai (localStorage): server tự nạp món + giá của combo.
    List<GuestCheckoutBundleDto>? Bundles = null
);

public record GuestCheckoutBundleDto(Guid BundleId, int Quantity);

public record GuestCheckoutItemDto(
    Guid ProductId,
    string ProductName,
    decimal Price,
    int Quantity
);

// Loyalty Points DTOs
public record RedeemPointsDto(int Points, Guid? OrderId = null, string? Description = null);

public record AdjustPointsDto(int Points, string Reason);


// ---- POST /api/promotions/evaluate — khớp frontend EvaluatePromotionRequest (frontend/src/api/promotion.ts) ----
public record EvaluatePromotionRequestDto(
    List<EvaluatePromotionItemDto> Items,
    string? CouponCode = null,
    Guid? CustomerId = null,
    decimal? ShippingAmount = null);

public record EvaluatePromotionItemDto(
    Guid ProductId,
    Guid? VariantId,
    int Quantity,
    decimal UnitPrice);
