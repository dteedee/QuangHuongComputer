using Sales.Domain;

namespace Sales.Application.Pricing;

/// <summary>
/// Phase 04 — Contract cho động cơ tính giá.
/// Interface ĐẶT TẠI Sales.Application vì Sales phụ thuộc kết quả để build Order snapshot.
/// Implementation (PricingEngine, PromotionEvaluator, rules) do LUỒNG A (Content module) cung cấp.
/// Bạn CHỈ tiêu thụ interface — không tự viết PricingEngine.
/// </summary>
public interface IPricingEngine
{
    /// <summary>
    /// Tính giá cho giỏ hàng, có xét promotion tự động + mã người dùng nhập.
    /// KHÔNG mutate cart — trả PricingResult, caller tự áp lên Order/Cart.
    /// </summary>
    /// <param name="cart">Giỏ đọc-thôi để tính tiền.</param>
    /// <param name="customerContext">Ngữ cảnh khách (id, nhóm, lịch sử đơn) — nullable cho guest.</param>
    /// <param name="appliedCodes">Mã người dùng nhập (nếu có).</param>
    /// <param name="ct">CancellationToken.</param>
    Task<PricingResult> CalculateAsync(
        Cart cart,
        CustomerContext? customerContext,
        IReadOnlyCollection<string>? appliedCodes,
        CancellationToken ct = default);
}

/// <summary>Ngữ cảnh khách để lọc điều kiện promotion (nhóm khách, đã mua lần nào chưa...).</summary>
public record CustomerContext(
    Guid CustomerId,
    string? CustomerGroup,       // "VIP" | "Gold" | "Member" | ...
    int PreviousOrderCount,      // 0 nếu là đơn đầu tiên
    bool IsFirstOrder);

/// <summary>Kết quả tính giá — snapshot ghi vào Order.AppliedPromotionsJson.</summary>
public record PricingResult(
    decimal Subtotal,
    decimal LineDiscountTotal,
    decimal OrderDiscount,
    decimal ShippingDiscount,
    IReadOnlyList<FreeGift> FreeGifts,
    IReadOnlyList<AppliedPromotion> AppliedPromotions,
    decimal TaxAmount,
    decimal ShippingFee,
    decimal Total)
{
    /// <summary>Tổng giảm hàng (line + order) — dùng gán Order.DiscountAmount.</summary>
    public decimal TotalDiscount => LineDiscountTotal + OrderDiscount;
}

public record FreeGift(
    Guid ProductId,
    Guid? VariantId,
    int Quantity,
    string PromotionCode);

public record AppliedPromotion(
    Guid PromotionId,
    string Code,
    string Name,
    string DiscountType,     // "Percent" | "Fixed" | "FreeShip" | "BuyXGetY" | "Tiered"
    decimal DiscountAmount,  // 0 nếu là FreeShip/BuyXGetY (mô tả ở AppliesTo)
    string AppliesTo);       // "Line:{productId}" | "Order" | "Shipping" | "Gift:{productId}"
