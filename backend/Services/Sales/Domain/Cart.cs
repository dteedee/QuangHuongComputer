using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

public class Cart : Entity<Guid>
{
    public Guid CustomerId { get; private set; }
    public List<CartItem> Items { get; private set; } = new();
    public string? CouponCode { get; private set; }
    public decimal DiscountAmount { get; private set; }
    // VAT chuẩn lấy từ BuildingBlocks.TaxRates (8% - VN hiện hành).
    // TRƯỚC: hardcode 0.1m -> BUG pháp lý: mọi đơn hàng thu dư 2% VAT.
    public decimal TaxRate { get; private set; } = TaxRates.VatStandard;
    public decimal ShippingAmount { get; private set; }

    public decimal SubtotalAmount => Items.Sum(i => i.Subtotal);
    public decimal TotalAmount => CalculateTotal();

    public Cart(Guid customerId)
    {
        Id = Guid.NewGuid();
        CustomerId = customerId;
    }

    protected Cart() { }

    // Backward-compatible overload — dùng cho sản phẩm không có biến thể.
    public void AddItem(Guid productId, string productName, decimal price, int quantity)
        => AddItem(productId, productName, price, quantity, null, null, null);

    // Overload có biến thể: giỏ hàng gộp theo (ProductId, VariantId).
    // Hai biến thể khác nhau của cùng sản phẩm là 2 dòng hàng riêng.
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

        var existingItem = Items.FirstOrDefault(i =>
            i.ProductId == productId && i.VariantId == variantId);

        if (existingItem != null)
        {
            existingItem.UpdateQuantity(existingItem.Quantity + quantity);
        }
        else
        {
            Items.Add(new CartItem(productId, productName, price, quantity, variantId, variantName, variantSku));
        }
    }

    // Backward-compatible: xoá tất cả dòng hàng của productId (mọi biến thể).
    public void RemoveItem(Guid productId)
    {
        Items.RemoveAll(i => i.ProductId == productId);
    }

    // Xoá đúng 1 dòng theo (ProductId, VariantId).
    public void RemoveItem(Guid productId, Guid? variantId)
    {
        var item = Items.FirstOrDefault(i => i.ProductId == productId && i.VariantId == variantId);
        if (item != null)
        {
            Items.Remove(item);
        }
    }

    public void UpdateItemQuantity(Guid productId, int quantity)
        => UpdateItemQuantity(productId, null, quantity);

    public void UpdateItemQuantity(Guid productId, Guid? variantId, int quantity)
    {
        var item = Items.FirstOrDefault(i => i.ProductId == productId && i.VariantId == variantId);
        if (item != null)
        {
            if (quantity <= 0)
            {
                Items.Remove(item);
            }
            else
            {
                item.UpdateQuantity(quantity);
            }
        }
    }

    public void Clear()
    {
        Items.Clear();
    }

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

    public void SetShippingAmount(decimal amount)
    {
        if (amount < 0)
            throw new ArgumentException("Shipping amount cannot be negative");
        ShippingAmount = amount;
    }

    private decimal CalculateTotal()
    {
        var subtotal = SubtotalAmount;
        var discounted = subtotal - DiscountAmount;
        if (discounted < 0) discounted = 0;
        var tax = discounted * TaxRate;
        return discounted + tax + ShippingAmount;
    }
}

public class CartItem
{
    public Guid ProductId { get; private set; }
    public string ProductName { get; private set; } = string.Empty;
    public decimal Price { get; private set; }
    public int Quantity { get; private set; }
    public decimal Subtotal => Price * Quantity;

    // Biến thể sản phẩm — nullable để tương thích với sản phẩm không có biến thể.
    // VariantName/VariantSku là SNAPSHOT tại thời điểm thêm giỏ,
    // KHÔNG đổi khi admin sửa tên biến thể sau đó (ràng buộc lịch sử đơn hàng).
    public Guid? VariantId { get; private set; }
    public string? VariantName { get; private set; }
    public string? VariantSku { get; private set; }

    // Backward-compatible constructor.
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
    }

    protected CartItem() { }

    public void UpdateQuantity(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Quantity must be greater than 0");

        Quantity = quantity;
    }
}
