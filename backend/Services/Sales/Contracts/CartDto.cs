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
    decimal Subtotal
);

public record AddToCartDto(
    Guid ProductId,
    string ProductName,
    decimal Price,
    int Quantity
);

public record UpdateQuantityDto(int Quantity);

public record ApplyCouponDto(string CouponCode);

public record SetShippingDto(decimal ShippingAmount);
