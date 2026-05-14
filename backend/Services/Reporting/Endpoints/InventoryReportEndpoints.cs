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
            var totalValueTask = invDb.InventoryItems.SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost);
            var itemCountTask = invDb.InventoryItems.CountAsync();
            var totalQuantityTask = invDb.InventoryItems.SumAsync(i => (int?)i.QuantityOnHand);

            var lowStockItems = await invDb.InventoryItems
                .Where(i => i.QuantityOnHand <= i.LowStockThreshold)
                .OrderBy(i => i.QuantityOnHand)
                .Take(10)
                .ToListAsync();

            await Task.WhenAll(totalValueTask, itemCountTask, totalQuantityTask);

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
                TotalValue = await totalValueTask ?? 0,
                ItemCount = await itemCountTask,
                TotalQuantity = await totalQuantityTask ?? 0,
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
