using MediatR;
using Sales.Domain;

namespace Sales.Application.Orders.Commands.CreateOrder;

public record CreateOrderCommand(
    Guid CustomerId,
    string ShippingAddress,
    List<OrderItemDto> Items,
    string? Notes = null
) : IRequest<Guid>;

public record OrderItemDto(Guid ProductId, string ProductName, decimal UnitPrice, int Quantity);
