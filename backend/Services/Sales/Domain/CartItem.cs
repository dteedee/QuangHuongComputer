namespace Sales.Domain;

/// <summary>
/// Một dòng trong giỏ hàng. <c>VariantName</c>/<c>VariantSku</c> là SNAPSHOT lúc thêm vào giỏ —
/// admin đổi tên biến thể sau đó không được làm đổi thứ khách đang nhìn thấy trong giỏ.
/// </summary>
public class CartItem
{
    public Guid ProductId { get; private set; }
    public string ProductName { get; private set; } = string.Empty;
    public decimal Price { get; private set; }
    public int Quantity { get; private set; }
    public decimal Subtotal => Price * Quantity;

    public Guid? VariantId { get; private set; }
    public string? VariantName { get; private set; }
    public string? VariantSku { get; private set; }

    /// <summary>Dòng quà do khuyến mãi "mua X tặng Y" sinh ra. Giá luôn 0, không gộp với dòng thường.</summary>
    public bool IsGift { get; private set; }
    public string? AppliedPromotionCode { get; private set; }

    public CartItem(Guid productId, string productName, decimal price, int quantity)
        : this(productId, productName, price, quantity, null, null, null)
    {
    }

    public CartItem(
        Guid productId,
        string productName,
        decimal price,
        int quantity,
        Guid? variantId,
        string? variantName,
        string? variantSku)
    {
        ProductId = productId;
        ProductName = productName;
        Price = price;
        Quantity = quantity;
        VariantId = variantId;
        VariantName = variantName;
        VariantSku = variantSku;
        IsGift = false;
    }

    protected CartItem() { }

    public void UpdateQuantity(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Quantity must be greater than 0");

        Quantity = quantity;
    }

    /// <summary>
    /// Ghi lại đơn giá THEO SERVER trước khi chốt đơn. Giá trong giỏ chỉ là ảnh chụp lúc thêm
    /// hàng; giá có thẩm quyền luôn đọc lại từ CSDL ở <c>CheckoutOrchestrator</c>.
    /// </summary>
    internal void SetServerPrice(decimal price)
    {
        if (IsGift) return;                 // Hàng tặng luôn 0đ.
        if (price < 0m) return;
        Price = price;
    }

    internal void MarkAsGift(string? promotionCode)
    {
        IsGift = true;
        Price = 0m; // Dòng quà LUÔN giá 0 — bảo vệ tuyệt đối, không tin caller.
        AppliedPromotionCode = promotionCode;
    }
}
