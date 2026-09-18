using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;
using Catalog.Infrastructure;
using Accounting.Infrastructure;

namespace Reporting.Endpoints;

public static class InventoryReportEndpoints
{
    public static void MapInventoryReportEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/inventory-value", async (InventoryDbContext invDb, CatalogDbContext catalogDb) =>
        {
            // Sequential awaits: these all share invDb, and EF Core's DbContext does not
            // support concurrent operations ("A second operation started on this context
            // before a previous operation completed"). Result sets are small; measured to
            // not need IDbContextFactory-based parallelism.
            var totalValue = await invDb.InventoryItems.SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost) ?? 0;
            var itemCount = await invDb.InventoryItems.CountAsync();
            var totalQuantity = await invDb.InventoryItems.SumAsync(i => (int?)i.QuantityOnHand) ?? 0;

            var lowStockItems = await invDb.InventoryItems
                .Where(i => i.QuantityOnHand <= i.LowStockThreshold)
                .OrderBy(i => i.QuantityOnHand)
                .Take(10)
                .ToListAsync();

            var productIds = lowStockItems.Select(i => i.ProductId).ToList();
            var products = await catalogDb.Products
                .Where(p => productIds.Contains(p.Id))
                .Select(p => new { p.Id, p.Name })
                .ToDictionaryAsync(p => p.Id, p => p.Name);

            var lowStock = lowStockItems.Select(i => new
            {
                i.ProductId,
                ProductName = products.TryGetValue(i.ProductId, out var name) ? name : "Unknown",
                i.QuantityOnHand, i.LowStockThreshold, i.AverageCost
            });

            return Results.Ok(new
            {
                TotalValue = totalValue,
                ItemCount = itemCount,
                TotalQuantity = totalQuantity,
                LowStockItems = lowStock
            });
        });

        group.MapGet("/ar-aging", async (AccountingDbContext accDb) =>
        {
            var accounts = await accDb.Accounts.ToListAsync();
            return Results.Ok(accounts);
        });
    }
}
