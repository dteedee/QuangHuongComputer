using MediatR;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;

namespace InventoryModule.Application.PurchaseOrders.Commands.ReceivePO;

public class ReceivePOCommandHandler : IRequestHandler<ReceivePOCommand, Unit>
{
    private readonly InventoryDbContext _context;

    public ReceivePOCommandHandler(InventoryDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(ReceivePOCommand request, CancellationToken cancellationToken)
    {
        var po = await _context.PurchaseOrders.FindAsync(new object[] { request.POId }, cancellationToken);
        if (po == null) throw new Exception("PO not found");

        po.ReceiveAll();

        // Update inventory for each item in the PO
        foreach (var item in po.Items)
        {
            var inventoryItem = await _context.InventoryItems
                .FirstOrDefaultAsync(i => i.ProductId == item.ProductId, cancellationToken);

            if (inventoryItem == null)
            {
                inventoryItem = new InventoryItem(item.ProductId, item.Quantity);
                _context.InventoryItems.Add(inventoryItem);
            }
            else
            {
                inventoryItem.AdjustStock(item.Quantity);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
