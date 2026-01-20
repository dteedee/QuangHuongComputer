using BuildingBlocks.Repository;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Repository;

public class SupplierRepository : Repository<Supplier, Guid, InventoryDbContext>
{
    public SupplierRepository(InventoryDbContext context) : base(context)
    {
    }

    protected override IQueryable<Supplier> ApplySearch(IQueryable<Supplier> query, string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return query;
        }

        var searchLower = search.ToLower();
        return query.Where(s =>
            s.Name.ToLower().Contains(searchLower) ||
            s.ContactPerson.ToLower().Contains(searchLower) ||
            s.Email.ToLower().Contains(searchLower) ||
            s.Phone.Contains(search) ||
            s.Address.ToLower().Contains(searchLower)
        );
    }

    public async Task<bool> HasActivePurchaseOrders(Guid supplierId, CancellationToken cancellationToken = default)
    {
        return await _context.PurchaseOrders
            .AnyAsync(po => po.SupplierId == supplierId && po.IsActive, cancellationToken);
    }
}
