using MediatR;

namespace Sales.Application.Carts.Commands.AddToCart;

// VariantId nullable — sản phẩm không có biến thể vẫn hoạt động (backward-compat).
// VariantName/VariantSku là snapshot do client cung cấp (đã fetch từ Catalog API).
public record AddToCartCommand(
    Guid CustomerId,
    Guid ProductId,
    string ProductName,
    decimal Price,
    int Quantity,
    Guid? VariantId = null,
    string? VariantName = null,
    string? VariantSku = null
) : IRequest<Guid>;
