namespace Sales.Contracts;

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
    List<CartItemDto> Items
);

public record CartItemDto(
    Guid ProductId,
    string ProductName,
    decimal Price,
    int Quantity,
    decimal Subtotal,
    string? ImageUrl,
    int StockQuantity,
    // Biến thể sản phẩm — snapshot lịch sử; null nếu sản phẩm không có biến thể.
    Guid? VariantId = null,
    string? VariantName = null,
    string? VariantSku = null
);

public record AddToCartDto(
    Guid ProductId,
    string ProductName,
    decimal Price,
    int Quantity,
    // Optional — nếu sản phẩm có biến thể (RAM/SSD/màu), truyền VariantId.
    // Handler tự fetch snapshot VariantName/Sku từ Catalog, không tin client.
    Guid? VariantId = null
);

public record UpdateQuantityDto(int Quantity);

public record ApplyCouponDto(string CouponCode);

public record SetShippingDto(decimal ShippingAmount);
