namespace Sales.Application.Pricing;

/// <summary>
/// Snapshot chi tiết một dòng hàng cần cho tính giá.
/// Extend Cart.CartItem với CategoryId/BrandId lookup từ Catalog để rule evaluate được.
/// </summary>
public record CartLineSnapshot(
    Guid ProductId,
    Guid? VariantId,
    string ProductName,
    decimal UnitPrice,
    int Quantity,
    Guid? CategoryId = null,
    Guid? BrandId = null,
    bool IsGift = false)
{
    public decimal Subtotal => UnitPrice * Quantity;
}

/// <summary>
/// Ngữ cảnh chuyển cho từng rule khi đánh giá điều kiện.
/// </summary>
public class PricingContext
{
    public IReadOnlyList<CartLineSnapshot> Lines { get; }
    public decimal Subtotal { get; }
    public CustomerContext Customer { get; }
    public DateTime EvaluatedAt { get; }

    public PricingContext(
        IReadOnlyList<CartLineSnapshot> lines,
        CustomerContext customer,
        DateTime? evaluatedAt = null)
    {
        // Chỉ tính subtotal từ dòng không phải gift — dòng gift luôn = 0.
        Lines = lines;
        Subtotal = lines.Where(l => !l.IsGift).Sum(l => l.Subtotal);
        Customer = customer;
        EvaluatedAt = evaluatedAt ?? DateTime.UtcNow;
    }
}

/// <summary>Giảm giá được gán vào một dòng hàng cụ thể.</summary>
public record LineDiscount(Guid ProductId, Guid? VariantId, decimal Amount, string Reason);

/// <summary>
/// Kết quả đánh giá một promotion đơn lẻ.
/// LineBreakdown chi tiết cho line-level (nếu có).
/// </summary>
public record PromotionEvaluationResult(
    bool IsApplicable,
    decimal LineDiscountAmount,
    decimal OrderDiscountAmount,
    decimal ShippingDiscountAmount,
    IReadOnlyList<LineDiscount> LineBreakdown,
    IReadOnlyList<FreeGift> FreeGifts,
    string? Reason)
{
    public decimal TotalDiscount => LineDiscountAmount + OrderDiscountAmount + ShippingDiscountAmount;

    public static PromotionEvaluationResult NotApplicable(string reason) =>
        new(false, 0, 0, 0,
            Array.Empty<LineDiscount>(),
            Array.Empty<FreeGift>(),
            reason);
}
