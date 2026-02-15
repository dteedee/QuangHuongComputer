using MediatR;
using Sales.Domain;
using Sales.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;

namespace Sales.Application.Orders.Commands.CreateOrder;

public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, Guid>
{
    private readonly IConfiguration _configuration;

    public CreateOrderCommandHandler(IConfiguration configuration)
    {
        _configuration = configuration;
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

        // Manually create context to guarantee isolation and avoid concurrency issues
        var connectionString = _configuration.GetConnectionString("DefaultConnection");
        var optionsBuilder = new DbContextOptionsBuilder<SalesDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        using var context = new SalesDbContext(optionsBuilder.Options);
        
        context.Orders.Add(order);
        await context.SaveChangesAsync(cancellationToken);

        return order.Id;
    }
}
