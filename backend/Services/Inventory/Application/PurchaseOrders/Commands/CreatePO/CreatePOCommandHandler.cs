using MediatR;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;

namespace InventoryModule.Application.PurchaseOrders.Commands.CreatePO;

public class CreatePOCommandHandler : IRequestHandler<CreatePOCommand, Guid>
{
    private readonly InventoryDbContext _context;

    public CreatePOCommandHandler(InventoryDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreatePOCommand request, CancellationToken cancellationToken)
    {
        var items = request.Items.Select(i => new PurchaseOrderItem(i.ProductId, i.Quantity, i.UnitPrice)).ToList();
        var po = new PurchaseOrder(request.SupplierId, items);

        _context.PurchaseOrders.Add(po);
        await _context.SaveChangesAsync(cancellationToken);

        return po.Id;
    }
}
