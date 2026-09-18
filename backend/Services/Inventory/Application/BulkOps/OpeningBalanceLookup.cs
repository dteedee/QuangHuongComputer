using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Application.BulkOps;

/// <summary>Facts about one SKU needed to validate an opening-balance row (active only — the
/// global query filter on <c>Products</c> already excludes inactive ones).</summary>
internal sealed record OpeningBalanceProductFacts(Guid ProductId, string Name, bool IsSerialTracked, int WarrantyMonths);

/// <summary>Snapshot of the (product, warehouse) pair's current stock row, if any — used for the
/// zero-quantity + no-movement precondition (phase-67 Key Insights / Risk Assessment).</summary>
internal sealed record ExistingStockSnapshot(Guid InventoryItemId, int QuantityOnHand, bool HasAnyMovement);

/// <summary>
/// Loads everything <see cref="OpeningBalanceEndpoints"/> needs to validate a whole file in one
/// pass, the same shape as Catalog's <c>CategoryBrandMatcher</c> — one query per lookup, then
/// synchronous dictionary reads inside the (synchronous) <c>ExcelImportPipeline</c> validation
/// hook. The dataset is bounded by real SKUs × real warehouses (a single-store shop, D09), never
/// by the 5.000-row cap of the uploaded file, so loading it whole is cheap.
/// </summary>
internal sealed class OpeningBalanceLookup
{
    public IReadOnlyDictionary<string, OpeningBalanceProductFacts> ProductsBySku { get; }
    public IReadOnlyDictionary<string, Guid> WarehousesByCode { get; }
    public IReadOnlyDictionary<(Guid ProductId, Guid WarehouseId), ExistingStockSnapshot> ExistingStock { get; }
    public IReadOnlyCollection<string> ExistingSerials { get; }

    private OpeningBalanceLookup(
        IReadOnlyDictionary<string, OpeningBalanceProductFacts> productsBySku,
        IReadOnlyDictionary<string, Guid> warehousesByCode,
        IReadOnlyDictionary<(Guid, Guid), ExistingStockSnapshot> existingStock,
        IReadOnlyCollection<string> existingSerials)
    {
        ProductsBySku = productsBySku;
        WarehousesByCode = warehousesByCode;
        ExistingStock = existingStock;
        ExistingSerials = existingSerials;
    }

    public static async Task<OpeningBalanceLookup> LoadAsync(
        CatalogDbContext catalog, InventoryDbContext db, CancellationToken ct)
    {
        var products = await (from p in catalog.Products.AsNoTracking()
                               join c in catalog.Categories.AsNoTracking() on p.CategoryId equals c.Id into cats
                               from c in cats.DefaultIfEmpty()
                               select new { p.Sku, p.Id, p.Name, IsSerialTracked = c != null && c.IsSerialTracked, p.WarrantyMonths })
                              .ToListAsync(ct);
        var productsBySku = products
            .GroupBy(p => p.Sku, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key,
                          g => new OpeningBalanceProductFacts(
                              g.First().Id, g.First().Name, g.First().IsSerialTracked,
                              g.First().WarrantyMonths is > 0 ? g.First().WarrantyMonths!.Value : 12),
                          StringComparer.OrdinalIgnoreCase);

        var warehouses = await db.Warehouses.AsNoTracking()
            .Where(w => w.IsActive)
            .Select(w => new { w.Code, w.Id })
            .ToListAsync(ct);
        var warehousesByCode = warehouses
            .GroupBy(w => w.Code, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().Id, StringComparer.OrdinalIgnoreCase);

        var items = await db.InventoryItems.AsNoTracking()
            .Where(i => i.VariantId == null && i.WarehouseId != null)
            .Select(i => new { i.Id, i.ProductId, WarehouseId = i.WarehouseId!.Value, i.QuantityOnHand })
            .ToListAsync(ct);
        var movedItemIds = (await db.StockMovements.AsNoTracking()
            .Select(m => m.InventoryItemId)
            .Distinct()
            .ToListAsync(ct)).ToHashSet();
        var existingStock = items.ToDictionary(
            i => (i.ProductId, i.WarehouseId),
            i => new ExistingStockSnapshot(i.Id, i.QuantityOnHand, movedItemIds.Contains(i.Id)));

        var existingSerials = (await db.SerialNumbers.AsNoTracking().Select(s => s.Serial).ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return new OpeningBalanceLookup(productsBySku, warehousesByCode, existingStock, existingSerials);
    }
}
