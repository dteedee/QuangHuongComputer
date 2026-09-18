using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Repair.Services;

/// <inheritdoc cref="IRepairStockService"/>
public sealed class RepairStockService : IRepairStockService
{
    private readonly InventoryDbContext _inventoryDb;
    private readonly IStockLedger _ledger;

    public RepairStockService(InventoryDbContext inventoryDb, IStockLedger ledger)
    {
        _inventoryDb = inventoryDb;
        _ledger = ledger;
    }

    public async Task ReserveAsync(Guid inventoryItemId, int quantity, Guid workOrderId, string performedBy, CancellationToken ct = default)
    {
        var location = await ResolveLocationAsync(inventoryItemId, ct);
        await _ledger.ReserveAsync(location, quantity, Context(workOrderId, performedBy), ct);
    }

    public async Task ReleaseAsync(Guid inventoryItemId, int quantity, Guid workOrderId, string performedBy, CancellationToken ct = default)
    {
        var location = await ResolveLocationAsync(inventoryItemId, ct);
        await _ledger.ReleaseAsync(location, quantity, Context(workOrderId, performedBy), ct);
    }

    public async Task CommitAsync(Guid inventoryItemId, int quantity, Guid workOrderId, string performedBy, CancellationToken ct = default)
    {
        var location = await ResolveLocationAsync(inventoryItemId, ct);
        await _ledger.CommitAsync(location, quantity, Context(workOrderId, performedBy), ct);
    }

    private static StockLedgerContext Context(Guid workOrderId, string performedBy)
        => new(performedBy, ReferenceId: workOrderId.ToString(), ReferenceType: "WorkOrder", Notes: "Repair part");

    private async Task<StockLocation> ResolveLocationAsync(Guid inventoryItemId, CancellationToken ct)
    {
        var item = await _inventoryDb.InventoryItems
            .Where(i => i.Id == inventoryItemId)
            .Select(i => new { i.ProductId, i.VariantId, i.WarehouseId })
            .FirstOrDefaultAsync(ct);

        if (item is null)
            throw new InvalidOperationException($"Inventory item {inventoryItemId} not found");

        return new StockLocation(item.ProductId, item.VariantId, item.WarehouseId);
    }
}
