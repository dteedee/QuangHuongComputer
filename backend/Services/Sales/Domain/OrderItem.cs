using BuildingBlocks.SharedKernel;
using Sales.Application.Pricing;

namespace Sales.Domain;

/// <summary>
/// Dòng hàng của đơn — SNAPSHOT tuyệt đối tại thời điểm chốt đơn.
///
/// D01 §4 + D07: mỗi dòng tự mang đủ số liệu để xuất hoá đơn mà KHÔNG phải đọc ngược về
/// <c>Products</c>/<c>Categories</c> (dữ liệu nguồn có thể đã đổi hoặc đã bị xoá theo D03):
/// thuế suất luật định, cờ được giảm, thuế suất hiệu lực, tiền hàng trước giảm, giảm giá dòng,
/// phần giảm giá cấp đơn phân bổ về dòng, tiền thuế tách ra, và đơn vị tính.
/// </summary>
public class OrderItem : Entity<Guid>
{
    public Guid OrderId { get; private set; }
    public Guid ProductId { get; private set; }
    public string ProductName { get; private set; } = string.Empty;
    public string? ProductSku { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal? OriginalPrice { get; private set; }
    public int Quantity { get; private set; }

    /// <summary>Tổng giảm giá của dòng = <see cref="LineDiscount"/> + <see cref="AllocatedOrderDiscount"/>.</summary>
    public decimal DiscountAmount { get; private set; }
    public decimal LineTotal { get; private set; }

    /// <summary>D01 §3.2 — thứ tự dòng trong đơn; quyết định tie-break khi chia 1đ lẻ của giảm giá.</summary>
    public int Sequence { get; private set; }

    /// <summary>D07 — đơn vị tính in trên hoá đơn điện tử ("Chiếc", "Bộ"...).</summary>
    public string? UnitName { get; private set; }

    /// <summary>D01 §2 — thuế suất LUẬT ĐỊNH của nhóm hàng (<c>Categories.VatRate</c>), dạng phân số.</summary>
    public decimal VatStatutoryRate { get; private set; }

    /// <summary>D01 §2 — dòng có thuộc diện được giảm 2 điểm theo NQ 204/2025 hay không.</summary>
    public bool VatReductionEligible { get; private set; }

    /// <summary>D01 §2 — thuế suất HIỆU LỰC đã resolve theo ngày đặt hàng.</summary>
    public decimal VatRate { get; private set; }

    /// <summary>D01 §5 — tiền hàng TRƯỚC mọi khoản giảm (<c>UnitPrice × Quantity</c>), phải in trên hoá đơn.</summary>
    public decimal GrossBeforeDiscount { get; private set; }

    /// <summary>D01 §5 — giảm giá RIÊNG của dòng (khuyến mãi theo sản phẩm).</summary>
    public decimal LineDiscount { get; private set; }

    /// <summary>D01 §3.2 — phần giảm giá CẤP ĐƠN (coupon/điểm/giảm tay) phân bổ về dòng này.</summary>
    public decimal AllocatedOrderDiscount { get; private set; }

    /// <summary>D01 §3.4 — tiền thuế TÁCH RA khỏi <see cref="LineTotal"/> (không cộng thêm).</summary>
    public decimal VatAmount { get; private set; }

    // Biến thể sản phẩm — SNAPSHOT tại thời điểm đặt hàng.
    public Guid? VariantId { get; private set; }
    public string? VariantName { get; private set; }
    public string? VariantSku { get; private set; }

    /// <summary>Hàng tặng (mua X tặng Y). Giá luôn = 0 và không gánh giảm giá cấp đơn.</summary>
    public bool IsGift { get; private set; }
    public string? AppliedPromotionCode { get; private set; }

    /// <summary>
    /// Dòng thuộc combo ĐÃ ĐƯỢC ÁP giá combo lúc chốt đơn. Phần giảm của combo nằm ở
    /// <see cref="LineDiscount"/>; dòng combo KHÔNG nhận thêm giảm giá cấp đơn (coupon/khuyến mãi).
    /// </summary>
    public Guid? BundleId { get; private set; }
    public string? BundleName { get; private set; }

    public OrderItem(
        Guid productId,
        string productName,
        decimal unitPrice,
        int quantity,
        string? productSku = null,
        decimal? originalPrice = null,
        Guid? variantId = null,
        string? variantName = null,
        string? variantSku = null,
        bool isGift = false,
        string? appliedPromotionCode = null,
        decimal lineDiscount = 0m,
        decimal vatStatutoryRate = 0m,
        bool vatReductionEligible = true,
        decimal vatRate = 0m,
        string? unitName = null,
        int sequence = 0,
        Guid? bundleId = null,
        string? bundleName = null)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        ProductName = productName;
        ProductSku = productSku;
        // Gift LUÔN giá 0 — không tin caller.
        UnitPrice = isGift ? 0m : unitPrice;
        OriginalPrice = originalPrice;
        Quantity = quantity;
        LineDiscount = isGift ? 0m : (lineDiscount < 0m ? 0m : lineDiscount);
        DiscountAmount = LineDiscount;
        GrossBeforeDiscount = UnitPrice * quantity;
        LineTotal = GrossBeforeDiscount - LineDiscount;
        VariantId = variantId;
        VariantName = variantName;
        VariantSku = variantSku;
        IsGift = isGift;
        AppliedPromotionCode = appliedPromotionCode;
        VatStatutoryRate = vatStatutoryRate;
        VatReductionEligible = vatReductionEligible;
        VatRate = vatRate;
        UnitName = unitName;
        Sequence = sequence;
        BundleId = isGift ? null : bundleId;
        BundleName = BundleId.HasValue ? bundleName : null;
    }

    protected OrderItem() { }

    /// <summary>Gán thứ tự dòng khi đơn được dựng (chỉ khi chưa có).</summary>
    internal void SetSequence(int sequence)
    {
        if (Sequence <= 0) Sequence = sequence;
    }

    /// <summary>
    /// API cũ: chỉ ghi phần giảm giá cấp đơn được phân bổ. Giữ để <c>Order.CalculateAmounts</c> cũ
    /// và test hiện có còn chạy; đường mới dùng <see cref="ApplyTotals"/>.
    /// </summary>
    public void ApplyDiscount(decimal allocatedOrderDiscount)
    {
        AllocatedOrderDiscount = allocatedOrderDiscount < 0m ? 0m : allocatedOrderDiscount;
        DiscountAmount = LineDiscount + AllocatedOrderDiscount;
        LineTotal = (UnitPrice * Quantity) - DiscountAmount;
    }

    /// <summary>D01 §4 — ghi toàn bộ snapshot tiền/thuế của dòng từ kết quả tính tập trung.</summary>
    internal void ApplyTotals(TotalsLineResult totals)
    {
        GrossBeforeDiscount = totals.GrossBeforeDiscount;
        LineDiscount = totals.LineDiscount;
        AllocatedOrderDiscount = totals.AllocatedOrderDiscount;
        DiscountAmount = totals.LineDiscount + totals.AllocatedOrderDiscount;
        LineTotal = totals.Payable;
        VatRate = totals.VatRate;
        VatAmount = totals.VatAmount;
    }

    /// <summary>
    /// D01 §2 — gán hồ sơ thuế của dòng. Gọi bởi <c>CheckoutOrchestrator</c> sau khi join
    /// <c>Categories</c>; thuế suất hiệu lực đã được <c>VatRateResolver</c> resolve theo ngày VN.
    /// </summary>
    public void ApplyVatProfile(decimal statutoryRate, bool reductionEligible, decimal effectiveRate, string? unitName = null)
    {
        VatStatutoryRate = statutoryRate;
        VatReductionEligible = reductionEligible;
        VatRate = effectiveRate;
        if (!string.IsNullOrWhiteSpace(unitName)) UnitName = unitName;
    }
}
