using MediatR;

namespace Sales.Application.Carts.Commands.AddToCart;

public record AddToCartCommand(Guid CustomerId, Guid ProductId, string ProductName, decimal Price, int Quantity) : IRequest<Guid>;
