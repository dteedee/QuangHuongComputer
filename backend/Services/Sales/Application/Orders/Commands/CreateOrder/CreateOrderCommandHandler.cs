using MediatR;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Orders.Commands.CreateOrder;

public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, Guid>
{
    private readonly SalesDbContext _context;

    public CreateOrderCommandHandler(SalesDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        var orderItems = request.Items.Select(i => 
            new OrderItem(i.ProductId, i.ProductName, i.UnitPrice, i.Quantity)
        ).ToList();

        var order = new Order(
            request.CustomerId,
            request.ShippingAddress,
            orderItems,
            0.1m, // 10% tax rate
            request.Notes
        );

        _context.Orders.Add(order);
        await _context.SaveChangesAsync(cancellationToken);

        return order.Id;
    }
}
