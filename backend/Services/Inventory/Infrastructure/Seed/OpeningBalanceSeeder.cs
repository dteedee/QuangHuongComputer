using Catalog.Infrastructure.Data.Import;
using InventoryModule.Domain;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Infrastructure.Seed;

/// <summary>
/// Opening balances for the imported catalogue (W0-6 / D09 / D03).
///
/// Moved here from <c>backend/Tools/ProductImporter/OpeningBalanceWriter.cs</c> by W1-4 so that
/// both entry points - the operator tool and <c>db seed --profile reference</c> - run the same
/// code. Warehouse creation moved out to <see cref="WarehouseSeeder"/>, which also enforces the
/// "exactly one default warehouse" invariant.
///
/// The opening quantity is the dataset's <c>stockQuantity</c> and the unit cost is
/// <c>costPriceVnd</c>, taken straight from the imported <c>Products</c> rows, so the catalogue
/// and the single opening warehouse balance agree by construction. Nothing is written back to
/// <c>Products.StockQuantity</c> - Catalog owns that column.
/// </summary>
public static class OpeningBalanceSeeder
{
    /// <returns>Number of inventory rows created or adjusted.</returns>
    public static async Task<int> SeedAsync(
        InventoryDbContext db,
        IReadOnlyList<(Guid ProductId, string Sku, int Quantity, decimal UnitCost)> balances,
        ProductImportSummary? summary = null,
        CancellationToken ct = default)
    {
        var mainId = WarehouseSeeder.MainId;
        var existing = await db.InventoryItems
            .Where(i => i.WarehouseId == mainId)
            .ToDictionaryAsync(i => i.Id, ct);

        var changes = 0;

        foreach (var (productId, sku, quantity, unitCost) in balances)
        {
            var id = DeterministicGuid.ForInventoryItem(sku, WarehouseSeeder.MainCode);
            if (existing.TryGetValue(id, out var row))
            {
                if (row.QuantityOnHand == quantity && row.AverageCost == unitCost) continue;

                // InventoryItem has no absolute setter, so the opening balance is reached with a delta.
                if (row.QuantityOnHand != quantity) row.AdjustStock(quantity - row.QuantityOnHand, "opening balance (db seed)");
                if (row.AverageCost != unitCost) row.UpdateAverageCost(unitCost);
                if (summary is not null) summary.InventoryItemsUpdated++;
                changes++;
                continue;
            }

            var item = new InventoryItem(
                productId: productId,
                initialQuantity: quantity,
                reorderLevel: 5,
                warehouseId: mainId,
                averageCost: unitCost);
            db.InventoryItems.Add(item);
            db.Entry(item).Property("Id").CurrentValue = id;
            if (summary is not null) summary.InventoryItemsCreated++;
            changes++;
        }

        if (changes > 0) await db.SaveChangesAsync(ct);
        return changes;
    }
}
