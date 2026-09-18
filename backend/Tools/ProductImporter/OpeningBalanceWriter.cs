using Catalog.Infrastructure.Data.Import;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace QuangHuong.Tools.ProductImporter;

/// <summary>
/// Opening balances for the imported catalogue (D09 + D03).
///
/// Two warehouses, created fresh by code, never by reusing a purged row:
///   KHO-CHINH  "Kho chính"   Main      IsDefault = true   - everything sellable
///   KHO-LOI    "Kho hàng lỗi" Defective IsDefault = false  - RMA / defective returns
///
/// D03 overrides D09's earlier instruction to re-home the 8 NULL-warehouse InventoryItems and
/// to merely deactivate AUDIT-WH1: all nine rows die with the products they belonged to, and
/// AUDIT-WH1 is hard-deleted by the prefix rule in purge-prelive-test-data.sql.
///
/// The opening quantity is the dataset's <c>stockQuantity</c> and the unit cost is
/// <c>costPriceVnd</c>, taken straight from the imported <c>Products</c> rows, so the catalogue
/// and the single opening warehouse balance agree by construction. Nothing is written back to
/// <c>Products.StockQuantity</c> - Catalog owns that column and W0-4 owns the projection that
/// keeps it in step with the warehouses once there is more than one balance per SKU.
/// </summary>
public sealed class OpeningBalanceWriter
{
    public const string MainWarehouseCode = "KHO-CHINH";
    public const string DefectiveWarehouseCode = "KHO-LOI";

    private readonly InventoryDbContext _inventory;

    public OpeningBalanceWriter(InventoryDbContext inventory) => _inventory = inventory;

    public async Task RunAsync(
        IReadOnlyList<(Guid ProductId, string Sku, int Quantity, decimal UnitCost)> balances,
        ProductImportSummary summary,
        CancellationToken ct = default)
    {
        var main = await UpsertWarehouseAsync(MainWarehouseCode, "Kho chính", WarehouseType.Main, isDefault: true, summary, ct);
        await UpsertWarehouseAsync(DefectiveWarehouseCode, "Kho hàng lỗi", WarehouseType.Defective, isDefault: false, summary, ct);
        await _inventory.SaveChangesAsync(ct);

        var existing = await _inventory.InventoryItems
            .Where(i => i.WarehouseId == main.Id)
            .ToDictionaryAsync(i => i.Id, ct);

        foreach (var (productId, sku, quantity, unitCost) in balances)
        {
            var id = DeterministicGuid.ForInventoryItem(sku, MainWarehouseCode);
            if (existing.TryGetValue(id, out var row))
            {
                if (row.QuantityOnHand != quantity || row.AverageCost != unitCost)
                {
                    // InventoryItem has no absolute setter and this track may not edit the
                    // Inventory domain, so the opening balance is reached with a delta.
                    if (row.QuantityOnHand != quantity) row.AdjustStock(quantity - row.QuantityOnHand, "W0-6 opening balance");
                    if (row.AverageCost != unitCost) row.UpdateAverageCost(unitCost);
                    summary.InventoryItemsUpdated++;
                }
            }
            else
            {
                var item = new InventoryItem(
                    productId: productId,
                    initialQuantity: quantity,
                    reorderLevel: 5,
                    warehouseId: main.Id,
                    averageCost: unitCost);
                _inventory.InventoryItems.Add(item);
                _inventory.Entry(item).Property("Id").CurrentValue = id;
                summary.InventoryItemsCreated++;
            }
        }

        await _inventory.SaveChangesAsync(ct);
    }

    private async Task<Warehouse> UpsertWarehouseAsync(
        string code, string name, WarehouseType type, bool isDefault, ProductImportSummary summary, CancellationToken ct)
    {
        var row = await _inventory.Warehouses.FirstOrDefaultAsync(w => w.Code == code, ct);
        if (row is null)
        {
            row = new Warehouse(code, name, type, address: null, city: "Hải Phòng", phone: null, managerName: null);
            _inventory.Warehouses.Add(row);
            _inventory.Entry(row).Property("Id").CurrentValue = DeterministicGuid.ForWarehouseCode(code);
            summary.WarehousesCreated++;
        }
        if (isDefault && !row.IsDefault) row.SetAsDefault();
        row.IsActive = true;
        return row;
    }
}
