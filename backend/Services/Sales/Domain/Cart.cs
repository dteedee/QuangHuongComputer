using BuildingBlocks.SharedKernel;
using Sales.Application.Pricing;

namespace Sales.Domain;

/// <summary>
/// Giỏ hàng của một khách (đã đăng nhập hoặc vãng lai).
///
/// D01: giá đã BAO GỒM VAT → <c>Total = tạm tính − giảm giá + phí ship</c>, KHÔNG cộng thuế.
/// <see cref="TaxRate"/> chỉ còn là nhãn hiển thị mặc định; con số thuế có thẩm quyền được tính
/// THEO DÒNG ở tầng ứng dụng (<c>CartVatBreakdownService</c>) vì chỉ ở đó mới join được
/// <c>Categories.VatRate</c>/<c>VatReductionEligible</c> của từng sản phẩm.
/// </summary>
public partial class Cart : Entity<Guid>
{
    public Guid CustomerId { get; private set; }
    public List<CartItem> Items { get; private set; } = new();
    public string? CouponCode { get; private set; }
    public decimal DiscountAmount { get; private set; }

    /// <summary>D01 §4 — nhãn hiển thị; không còn là nguồn thuế có thẩm quyền của dòng hàng.</summary>
    public decimal TaxRate { get; private set; } = TaxRates.VatStatutoryStandard - TaxRates.VatReductionPoints;

    public decimal ShippingAmount { get; private set; }

    /// <summary>
    /// Định danh khách VÃNG LAI (cookie <c>qh_aid</c>). Giỏ của khách chưa đăng nhập sống trên
    /// server theo khoá này, nên đổi máy/đổi tab không mất giỏ và giỏ gộp được khi khách đăng nhập.
    /// </summary>
    public string? AnonymousId { get; private set; }

    public decimal SubtotalAmount => Items.Sum(i => i.Subtotal);
    public decimal TotalAmount => Totals().Total;

    /// <summary>Phần VAT TÁCH RA khỏi <see cref="TotalAmount"/> (để hiển thị/hoá đơn), không cộng thêm.</summary>
    public decimal TaxAmount => Totals().TaxAmount;

    /// <summary>Giảm giá thực tế sau clamp (không vượt tạm tính).</summary>
    public decimal EffectiveDiscountAmount => Totals().EffectiveDiscount;

    public Cart(Guid customerId)
    {
        Id = Guid.NewGuid();
        CustomerId = customerId;
    }

    /// <summary>Giỏ của khách vãng lai — chưa có tài khoản, khoá theo cookie.</summary>
    public static Cart ForGuest(string anonymousId)
    {
        if (string.IsNullOrWhiteSpace(anonymousId))
            throw new ArgumentException("anonymousId là bắt buộc cho giỏ khách vãng lai", nameof(anonymousId));

        return new Cart(Guid.Empty) { AnonymousId = anonymousId.Trim() };
    }

    protected Cart() { }

    public void AddItem(Guid productId, string productName, decimal price, int quantity)
        => AddItem(productId, productName, price, quantity, null, null, null);

    /// <summary>Gộp theo (ProductId, VariantId): hai biến thể khác nhau là hai dòng riêng.</summary>
    public void AddItem(
        Guid productId,
        string productName,
        decimal price,
        int quantity,
        Guid? variantId,
        string? variantName,
        string? variantSku)
    {
        if (quantity <= 0)
            throw new ArgumentException("Quantity phải lớn hơn 0", nameof(quantity));

        // Chỉ gộp vào dòng LẺ — dòng combo là một nhóm riêng (CartBundles.cs).
        var existingItem = Items.FirstOrDefault(i =>
            i.ProductId == productId && i.VariantId == variantId && !i.IsGift && i.BundleId == null);

        if (existingItem != null)
        {
            existingItem.UpdateQuantity(existingItem.Quantity + quantity);
        }
        else
        {
            Items.Add(new CartItem(productId, productName, price, quantity, variantId, variantName, variantSku));
        }
    }

    /// <summary>Xoá mọi dòng của sản phẩm; combo nào mất món thì vỡ nhóm và trở về giá lẻ.</summary>
    public void RemoveItem(Guid productId)
    {
        var brokenBundles = BundleIdsOf(Items.Where(i => i.ProductId == productId));
        Items.RemoveAll(i => i.ProductId == productId);
        foreach (var bundleId in brokenBundles) BreakBundle(bundleId);
    }

    public void RemoveItem(Guid productId, Guid? variantId)
    {
        var item = Items.FirstOrDefault(i => i.ProductId == productId && i.VariantId == variantId && i.BundleId == null)
            ?? Items.FirstOrDefault(i => i.ProductId == productId && i.VariantId == variantId);
        if (item == null) return;
        Items.Remove(item);
        if (item.BundleId.HasValue) BreakBundle(item.BundleId.Value);
    }

    public void UpdateItemQuantity(Guid productId, int quantity)
        => UpdateItemQuantity(productId, null, quantity);

    public void UpdateItemQuantity(Guid productId, Guid? variantId, int quantity)
    {
        // Ưu tiên dòng lẻ. Chỉ còn dòng combo thì đổi số lượng = vỡ combo (giá về giá lẻ).
        var item = Items.FirstOrDefault(i => i.ProductId == productId && i.VariantId == variantId && i.BundleId == null && !i.IsGift);
        if (item == null)
        {
            var bundled = Items.FirstOrDefault(i => i.ProductId == productId && i.VariantId == variantId && i.BundleId != null);
            if (bundled == null) return;
            BreakBundle(bundled.BundleId!.Value);
            item = Items.FirstOrDefault(i => i.ProductId == productId && i.VariantId == variantId && i.BundleId == null && !i.IsGift);
            if (item == null) return;
        }

        if (quantity <= 0) Items.Remove(item);
        else item.UpdateQuantity(quantity);
    }

    public void Clear() => Items.Clear();

    /// <summary>
    /// Đồng bộ đơn giá của một dòng về giá server trước khi chốt đơn.
    /// Gọi bởi <c>CheckoutOrchestrator</c> — giá trong giỏ không bao giờ là giá có thẩm quyền.
    /// </summary>
    public void UpdateItemPrice(Guid productId, Guid? variantId, decimal price)
    {
        // MỌI dòng khớp (dòng lẻ + dòng combo cùng sản phẩm) — không chỉ dòng đầu tiên.
        foreach (var item in Items.Where(i => i.ProductId == productId && i.VariantId == variantId && !i.IsGift))
            item.SetServerPrice(price);
    }

    /// <summary>
    /// CŨ — áp mã thủ công. Giá trị giảm được TÍNH LẠI ở server lúc chốt đơn
    /// (<c>CheckoutOrchestrator</c>); giá trị lưu ở đây chỉ để hiển thị giỏ.
    /// </summary>
    public void ApplyCoupon(string couponCode, decimal discountAmount)
    {
        if (discountAmount < 0)
            throw new ArgumentException("Số tiền giảm giá không được âm", nameof(discountAmount));

        CouponCode = couponCode;
        DiscountAmount = discountAmount;
    }

    public void RemoveCoupon()
    {
        CouponCode = null;
        DiscountAmount = 0;
    }

    /// <summary>Thêm hàng tặng (giá 0) do khuyến mãi mua X tặng Y. Luôn là dòng mới, không gộp.</summary>
    public void AddGiftItem(
        Guid productId,
        string productName,
        int quantity,
        Guid? variantId = null,
        string? variantName = null,
        string? variantSku = null,
        string? promotionCode = null)
    {
        if (quantity <= 0)
            throw new ArgumentException("Quantity phải lớn hơn 0", nameof(quantity));

        var giftItem = new CartItem(productId, productName, price: 0m, quantity,
            variantId, variantName, variantSku);
        giftItem.MarkAsGift(promotionCode);
        Items.Add(giftItem);
    }

    /// <summary>Gỡ toàn bộ hàng tặng — gọi trước khi PricingEngine tính lại.</summary>
    public void ClearGiftItems() => Items.RemoveAll(i => i.IsGift);

    public void SetShippingAmount(decimal amount)
    {
        if (amount < 0)
            throw new ArgumentException("Shipping amount cannot be negative");
        ShippingAmount = amount;
    }

    /// <summary>
    /// D01 — dùng chung <see cref="OrderTotalsCalculator"/> với Order để giỏ và đơn không bao giờ
    /// ra hai con số khác nhau trên cùng dữ liệu.
    /// </summary>
    private OrderTotals Totals() => OrderTotalsCalculator.Compute(
        Items.Select((i, index) => new TotalsLineInput(
            Sequence: index + 1,
            UnitPriceIncludingVat: i.Price,
            Quantity: i.Quantity,
            LineDiscount: 0m,
            VatRate: TaxRate,
            IsGift: i.IsGift)).ToList(),
        DiscountAmount,
        ShippingAmount,
        shippingDiscount: 0m,
        shippingVatRate: TaxRate);
}
