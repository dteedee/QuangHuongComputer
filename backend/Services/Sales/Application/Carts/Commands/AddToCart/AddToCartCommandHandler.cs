using MediatR;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Carts.Commands.AddToCart;

public class AddToCartCommandHandler : IRequestHandler<AddToCartCommand, Guid>
{
    private readonly SalesDbContext _context;

    public AddToCartCommandHandler(SalesDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(AddToCartCommand request, CancellationToken cancellationToken)
    {
        var cart = await _context.Carts
            .FirstOrDefaultAsync(c => c.CustomerId == request.CustomerId, cancellationToken);

        if (cart == null)
        {
            cart = new Cart(request.CustomerId);
            _context.Carts.Add(cart);
        }

        cart.AddItem(request.ProductId, request.ProductName, request.Price, request.Quantity);
        await _context.SaveChangesAsync(cancellationToken);

        return cart.Id;
    }
}
