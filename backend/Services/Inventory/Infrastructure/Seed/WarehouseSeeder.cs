using Catalog.Infrastructure.Data.Import;
using InventoryModule.Domain;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Infrastructure.Seed;

/// <summary>
/// Reference warehouses (D09, option B): exactly two rows, upserted by <c>Code</c> with
/// deterministic ids, so a second <c>db seed</c> changes nothing and W0-6's importer rows are
/// adopted rather than duplicated.
///
///   KHO-CHINH  "Kho chính - Cửa hàng Vĩnh Bảo"   Main       IsDefault = true   (sellable)
///   KHO-LOI    "Kho hàng lỗi / chờ trả hãng"     Defective  IsDefault = false  (not sellable)
///
/// The seeder also enforces the invariant W1-11 turns into a partial unique index: at most one
/// warehouse carries <c>IsDefault = true</c>. Before this track the owner's database had ZERO
/// default warehouses (the only row was the audit junk <c>AUDIT-WH1</c>), which is why checkout
/// could not reserve stock.
/// </summary>
public static class WarehouseSeeder
{
    public const string MainCode = "KHO-CHINH";
    public const string DefectiveCode = "KHO-LOI";

    /// <summary>D09: shop and both warehouses are the same building, No. 179.</summary>
    public const string Address = "Số 179, Khu phố 3/2";
    public const string City = "Thành phố Hải Phòng";

    public static Guid MainId => DeterministicGuid.ForWarehouseCode(MainCode);
    public static Guid DefectiveId => DeterministicGuid.ForWarehouseCode(DefectiveCode);

    /// <returns>Number of rows created or changed. 0 means "already correct".</returns>
    public static async Task<int> SeedAsync(InventoryDbContext db, CancellationToken ct = default)
    {
        var changes = 0;
        changes += await UpsertAsync(db, MainCode, "Kho chính - Cửa hàng Vĩnh Bảo", WarehouseType.Main, ct);
        changes += await UpsertAsync(db, DefectiveCode, "Kho hàng lỗi / chờ trả hãng", WarehouseType.Defective, ct);
        if (changes > 0) await db.SaveChangesAsync(ct);

        changes += await EnforceSingleDefaultAsync(db, ct);
        return changes;
    }

    private static async Task<int> UpsertAsync(
        InventoryDbContext db, string code, string name, WarehouseType type, CancellationToken ct)
    {
        var row = await db.Warehouses.FirstOrDefaultAsync(w => w.Code == code, ct);
        if (row is null)
        {
            row = new Warehouse(code, name, type, address: Address, city: City, phone: null, managerName: null);
            db.Warehouses.Add(row);
            // Warehouse's constructor hard-assigns Guid.NewGuid() and Entity<T>.Id is init-only,
            // so the deterministic id has to be forced through the change tracker.
            db.Entry(row).Property("Id").CurrentValue = DeterministicGuid.ForWarehouseCode(code);
            return 1;
        }

        // Adopt an existing row (W0-6's importer creates both) without overwriting an operator's
        // edits to anything but the fields this seed owns.
        if (row.Type == type && row.IsActive) return 0;
        row.Update(row.Name, type, row.Address, row.City, row.District, row.Ward,
                   row.Phone, row.ManagerName, row.ManagerEmail, row.Description, row.Capacity);
        row.IsActive = true;
        return 1;
    }

    /// <summary>
    /// KHO-CHINH is the default; every other row loses the flag. Web orders and checkout holds
    /// resolve stock through the default warehouse (D09 §2), so two defaults - or none - is a
    /// silent mis-shipment, not a cosmetic problem.
    /// </summary>
    private static async Task<int> EnforceSingleDefaultAsync(InventoryDbContext db, CancellationToken ct)
    {
        var all = await db.Warehouses.ToListAsync(ct);
        var changes = 0;

        foreach (var w in all.Where(w => w.IsDefault && w.Code != MainCode))
        {
            w.UnsetDefault();
            changes++;
        }

        var main = all.FirstOrDefault(w => w.Code == MainCode);
        if (main is not null && !main.IsDefault)
        {
            main.SetAsDefault();
            changes++;
        }

        if (changes > 0) await db.SaveChangesAsync(ct);
        return changes;
    }
}
