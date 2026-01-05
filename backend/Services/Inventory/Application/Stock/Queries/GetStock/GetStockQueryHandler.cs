using MediatR;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;

namespace InventoryModule.Application.Stock.Queries.GetStock;

public class GetStockQueryHandler : IRequestHandler<GetStockQuery, List<InventoryItem>>
{
    private readonly InventoryDbContext _context;

    public GetStockQueryHandler(InventoryDbContext context)
    {
        _context = context;
    }

    public async Task<List<InventoryItem>> Handle(GetStockQuery request, CancellationToken cancellationToken)
    {
        return await _context.InventoryItems.ToListAsync(cancellationToken);
    }
}
