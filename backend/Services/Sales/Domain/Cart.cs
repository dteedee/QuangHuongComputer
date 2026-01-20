using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

public class Cart : Entity<Guid>
{
    public Guid CustomerId { get; private set; }
    public List<CartItem> Items { get; private set; } = new();
    public string? CouponCode { get; private set; }
    public decimal DiscountAmount { get; private set; }
    public decimal TaxRate { get; private set; } = 0.1m; // 10% VAT
    public decimal ShippingAmount { get; private set; }

    public decimal SubtotalAmount => Items.Sum(i => i.Subtotal);
    public decimal TotalAmount => CalculateTotal();

    public Cart(Guid customerId)
    {
        Id = Guid.NewGuid();
        CustomerId = customerId;
    }

    protected Cart() { }

    public void AddItem(Guid productId, string productName, decimal price, int quantity)
    {
        var existingItem = Items.FirstOrDefault(i => i.ProductId == productId);
        
        if (existingItem != null)
        {
            existingItem.UpdateQuantity(existingItem.Quantity + quantity);
        }
        else
        {
            Items.Add(new CartItem(productId, productName, price, quantity));
        }
    }

    public void RemoveItem(Guid productId)
    {
        var item = Items.FirstOrDefault(i => i.ProductId == productId);
        if (item != null)
        {
            Items.Remove(item);
        }
    }

    public void UpdateItemQuantity(Guid productId, int quantity)
    {
        var item = Items.FirstOrDefault(i => i.ProductId == productId);
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

    public CartItem(Guid productId, string productName, decimal price, int quantity)
    {
        ProductId = productId;
        ProductName = productName;
        Price = price;
        Quantity = quantity;
    }

    protected CartItem() { }

    public void UpdateQuantity(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Quantity must be greater than 0");
        
        Quantity = quantity;
    }
}
