using Catalog.Infrastructure.Data.Import;
using InventoryModule.Domain;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Infrastructure.Seed;

/// <summary>
/// Purchase-order approval ladder. Without at least one rule a purchase order can never leave
/// Draft, so a fresh install cannot buy stock - one of the four "0 rows out of the box" gaps
/// this track exists to close.
///
/// Bands are non-overlapping and half-open (<c>Matches</c> is <c>amount &gt;= Min &amp;&amp; amount &lt; Max</c>),
/// so every amount from 0 upwards matches exactly one rule.
/// </summary>
public static class PoApprovalRuleSeeder
{
    private static readonly (string Name, decimal Min, decimal Max, string Role, int Sort)[] Rules =
    {
        ("Duyệt đơn mua hàng - dưới 20 triệu",  0m,          20_000_000m,          "Manager", 0),
        ("Duyệt đơn mua hàng - 20 đến 100 triệu", 20_000_000m, 100_000_000m,        "Manager", 1),
        ("Duyệt đơn mua hàng - từ 100 triệu",   100_000_000m, 100_000_000_000m,     "Admin",   2),
    };

    public static async Task<int> SeedAsync(InventoryDbContext db, CancellationToken ct = default)
    {
        var existing = await db.POApprovalRules.ToDictionaryAsync(r => r.Name, ct);
        var changes = 0;

        foreach (var (name, min, max, role, sort) in Rules)
        {
            if (existing.ContainsKey(name)) continue;

            var rule = new POApprovalRule(name, min, max, role, sort);
            db.POApprovalRules.Add(rule);
            db.Entry(rule).Property("Id").CurrentValue =
                DeterministicGuid.Create(DeterministicGuid.UrlNamespace, "po-approval-rule:" + name);
            changes++;
        }

        if (changes > 0) await db.SaveChangesAsync(ct);
        return changes;
    }
}
