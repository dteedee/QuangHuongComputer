using Microsoft.EntityFrameworkCore;
using SystemConfig.Domain;

namespace SystemConfig.Infrastructure.Seed;

/// <summary>
/// The single physical shop (D09, option B). Upserted by <c>Code</c>.
///
/// Every value below is either verbatim from the tax register or measured; nothing is invented.
/// See <c>plans/260917-2100-full-system-overhaul/decisions/D09-cua-hang-kho-va-thong-tin-cong-ty.md</c>
/// for the provenance table - in particular "Khu phố 3/2" (no public source writes "thôn"), the
/// post-merger administrative units (ward "Xã Vĩnh Bảo", no district, "Thành phố Hải Phòng"), and
/// the opening hours 07:00-17:15 Mon-Sat restored from commit f659837.
///
/// The link row <c>StoreWarehouses</c> is what POS and "nhận tại cửa hàng" resolve stock through.
/// Before this track nothing in the product code ever called <c>StoreWarehouse.MarkPrimary()</c>
/// (only a unit test did), so <c>IsPrimary</c> was permanently false.
/// </summary>
public static class StoreSeeder
{
    public const string StoreCode = "QH-VINHBAO";

    /// <summary>Deterministic id so a re-seed on another machine produces the same row.</summary>
    public static readonly Guid StoreId = new("7e1c9a54-0d3b-4d2e-9a51-6b2f0c1d8a10");

    private const string OpeningHours =
        """{"mon":"07:00-17:15","tue":"07:00-17:15","wed":"07:00-17:15","thu":"07:00-17:15","fri":"07:00-17:15","sat":"07:00-17:15","sun":"closed"}""";

    /// <param name="primaryWarehouseId">
    /// <c>KHO-CHINH</c>. Passed in because Store lives in SystemConfig, which sits below Inventory
    /// in the project graph - the caller (the seed registry) references both.
    /// </param>
    /// <param name="phone">Value of <c>COMPANY_HOTLINE</c>.</param>
    /// <param name="email">Value of <c>COMPANY_EMAIL</c>.</param>
    public static async Task<int> SeedAsync(
        SystemConfigDbContext db,
        Guid primaryWarehouseId,
        string phone,
        string email,
        CancellationToken ct = default)
    {
        var changes = 0;

        var store = await db.Stores
            .Include(s => s.Warehouses)
            .FirstOrDefaultAsync(s => s.Code == StoreCode, ct);

        if (store is null)
        {
            store = new Store(
                code: StoreCode,
                name: "Quang Hưởng Computer - Vĩnh Bảo",
                address: "Số 179, Khu phố 3/2",
                phone: phone,
                province: "Thành phố Hải Phòng",
                district: null,
                ward: "Xã Vĩnh Bảo",
                email: email,
                latitude: 20.6904744m,
                longitude: 106.4821139m,
                isPickupPoint: true,
                sortOrder: 0);
            store.SetOpeningHours(OpeningHours);
            db.Stores.Add(store);
            db.Entry(store).Property("Id").CurrentValue = StoreId;
            changes++;
        }
        else if (!SameOpeningHours(store.OpeningHoursJson, OpeningHours))
        {
            // Opening hours are the one field the shop actually disputed across three commits;
            // keep the seed authoritative until an operator edits it away from every seeded value.
            store.SetOpeningHours(OpeningHours);
            changes++;
        }

        if (changes > 0) await db.SaveChangesAsync(ct);

        changes += await LinkPrimaryWarehouseAsync(db, store, primaryWarehouseId, ct);
        return changes;
    }

    /// <summary>
    /// <c>OpeningHoursJson</c> is a <c>jsonb</c> column, so PostgreSQL stores it re-ordered and
    /// re-spaced ({"fri":..., "mon":...}). A string comparison therefore NEVER matches what was
    /// written, and the seeder reported one change on every single run - the exact failure mode
    /// "second seed = 0 changes" is meant to catch. Compare the parsed key/value pairs instead.
    /// </summary>
    private static bool SameOpeningHours(string? stored, string expected)
    {
        try
        {
            using var a = System.Text.Json.JsonDocument.Parse(string.IsNullOrWhiteSpace(stored) ? "{}" : stored);
            using var b = System.Text.Json.JsonDocument.Parse(expected);
            var left = a.RootElement.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.ToString());
            var right = b.RootElement.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.ToString());
            return left.Count == right.Count && left.All(kv => right.TryGetValue(kv.Key, out var v) && v == kv.Value);
        }
        catch (System.Text.Json.JsonException)
        {
            return false; // unparseable -> rewrite it
        }
    }

    private static async Task<int> LinkPrimaryWarehouseAsync(
        SystemConfigDbContext db, Store store, Guid warehouseId, CancellationToken ct)
    {
        var links = await db.StoreWarehouses.Where(sw => sw.StoreId == store.Id).ToListAsync(ct);
        var changes = 0;

        var link = links.FirstOrDefault(sw => sw.WarehouseId == warehouseId);
        if (link is null)
        {
            link = new StoreWarehouse(store.Id, warehouseId, isPrimary: true);
            db.StoreWarehouses.Add(link);
            changes++;
        }
        else if (!link.IsPrimary)
        {
            link.MarkPrimary();
            changes++;
        }

        foreach (var other in links.Where(sw => sw.WarehouseId != warehouseId && sw.IsPrimary))
        {
            other.UnmarkPrimary();
            changes++;
        }

        if (changes > 0) await db.SaveChangesAsync(ct);
        return changes;
    }
}
