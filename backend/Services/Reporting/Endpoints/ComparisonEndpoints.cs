using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;
using Sales.Domain;
using Accounting.Infrastructure;
using Accounting.Domain;
using InventoryModule.Infrastructure;

namespace Reporting.Endpoints;

public static class ComparisonEndpoints
{
    public static void MapComparisonEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/comparison/revenue", async (SalesDbContext salesDb,
            string period1Start, string period1End, string period2Start, string period2End) =>
        {
            var p1s = DateTime.Parse(period1Start); var p1e = DateTime.Parse(period1End);
            var p2s = DateTime.Parse(period2Start); var p2e = DateTime.Parse(period2End);

            var p1Task = GetRevenuePeriodData(salesDb, p1s, p1e);
            var p2Task = GetRevenuePeriodData(salesDb, p2s, p2e);
            await Task.WhenAll(p1Task, p2Task);

            var p1 = await p1Task; var p2 = await p2Task;
            return Results.Ok(new
            {
                Period1 = new { Label = $"{p1s:dd/MM} - {p1e:dd/MM}", p1.Revenue, p1.OrderCount, p1.AvgOrderValue },
                Period2 = new { Label = $"{p2s:dd/MM} - {p2e:dd/MM}", p2.Revenue, p2.OrderCount, p2.AvgOrderValue },
                Change = new
                {
                    RevenuePercent = CalcChangePercent(p1.Revenue, p2.Revenue),
                    OrderPercent = CalcChangePercent(p1.OrderCount, p2.OrderCount),
                    AovPercent = CalcChangePercent(p1.AvgOrderValue, p2.AvgOrderValue)
                }
            });
        });

        group.MapGet("/comparison/orders", async (SalesDbContext salesDb,
            string period1Start, string period1End, string period2Start, string period2End) =>
        {
            var p1s = DateTime.Parse(period1Start); var p1e = DateTime.Parse(period1End);
            var p2s = DateTime.Parse(period2Start); var p2e = DateTime.Parse(period2End);

            var p1Task = GetOrderPeriodData(salesDb, p1s, p1e);
            var p2Task = GetOrderPeriodData(salesDb, p2s, p2e);
            await Task.WhenAll(p1Task, p2Task);

            var p1 = await p1Task; var p2 = await p2Task;
            return Results.Ok(new
            {
                Period1 = p1, Period2 = p2,
                Change = new
                {
                    TotalPercent = CalcChangePercent(p1.Total, p2.Total),
                    CompletedPercent = CalcChangePercent(p1.Completed, p2.Completed),
                    CancelRateChange = Math.Round(p2.CancelRate - p1.CancelRate, 1)
                }
            });
        });

        group.MapGet("/comparison/expenses", async (AccountingDbContext accDb,
            string period1Start, string period1End, string period2Start, string period2End) =>
        {
            var p1s = DateTime.Parse(period1Start); var p1e = DateTime.Parse(period1End);
            var p2s = DateTime.Parse(period2Start); var p2e = DateTime.Parse(period2End);

            var p1Task = GetExpensePeriodData(accDb, p1s, p1e);
            var p2Task = GetExpensePeriodData(accDb, p2s, p2e);
            await Task.WhenAll(p1Task, p2Task);

            var p1 = await p1Task; var p2 = await p2Task;
            return Results.Ok(new
            {
                Period1 = new { p1.Total, p1.ByCategory },
                Period2 = new { p2.Total, p2.ByCategory },
                Change = new { TotalPercent = CalcChangePercent(p1.Total, p2.Total) }
            });
        });

        group.MapGet("/comparison/inventory-turnover", async (SalesDbContext salesDb, InventoryDbContext invDb,
            string period1Start, string period1End, string period2Start, string period2End) =>
        {
            var p1s = DateTime.Parse(period1Start); var p1e = DateTime.Parse(period1End);
            var p2s = DateTime.Parse(period2Start); var p2e = DateTime.Parse(period2End);

            var avgInventory = await invDb.InventoryItems.SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost) ?? 1;

            var p1Cogs = await salesDb.Orders.Where(o => o.OrderDate >= p1s && o.OrderDate < p1e && o.Status != OrderStatus.Cancelled)
                .SumAsync(o => (decimal?)o.SubtotalAmount) ?? 0;
            var p2Cogs = await salesDb.Orders.Where(o => o.OrderDate >= p2s && o.OrderDate < p2e && o.Status != OrderStatus.Cancelled)
                .SumAsync(o => (decimal?)o.SubtotalAmount) ?? 0;

            var p1Turnover = avgInventory > 0 ? p1Cogs / avgInventory : 0;
            var p2Turnover = avgInventory > 0 ? p2Cogs / avgInventory : 0;
            var p1Days = p1Turnover > 0 ? Math.Round(365m / p1Turnover, 1) : 0;
            var p2Days = p2Turnover > 0 ? Math.Round(365m / p2Turnover, 1) : 0;

            return Results.Ok(new
            {
                Period1 = new { TurnoverRatio = Math.Round(p1Turnover, 2), AvgDaysToSell = p1Days, Cogs = p1Cogs, AvgInventory = avgInventory },
                Period2 = new { TurnoverRatio = Math.Round(p2Turnover, 2), AvgDaysToSell = p2Days, Cogs = p2Cogs, AvgInventory = avgInventory },
                Change = new { TurnoverChangePercent = CalcChangePercent(p1Turnover, p2Turnover), DaysChange = Math.Round(p2Days - p1Days, 1) }
            });
        });
    }

    private static async Task<(decimal Revenue, int OrderCount, decimal AvgOrderValue)> GetRevenuePeriodData(SalesDbContext db, DateTime start, DateTime end)
    {
        var orders = await db.Orders.Where(o => o.OrderDate >= start && o.OrderDate < end && o.Status != OrderStatus.Cancelled).ToListAsync();
        var revenue = orders.Sum(o => o.TotalAmount);
        var count = orders.Count;
        var aov = count > 0 ? revenue / count : 0;
        return (revenue, count, aov);
    }

    private static async Task<dynamic> GetOrderPeriodData(SalesDbContext db, DateTime start, DateTime end)
    {
        var orders = await db.Orders.Where(o => o.OrderDate >= start && o.OrderDate < end).ToListAsync();
        var total = orders.Count;
        var completed = orders.Count(o => o.Status == OrderStatus.Completed || o.Status == OrderStatus.Delivered);
        var cancelled = orders.Count(o => o.Status == OrderStatus.Cancelled);
        var cancelRate = total > 0 ? Math.Round((double)cancelled / total * 100, 1) : 0;
        return new { Total = total, Completed = completed, Cancelled = cancelled, CancelRate = cancelRate };
    }

    private static async Task<(decimal Total, object[] ByCategory)> GetExpensePeriodData(AccountingDbContext db, DateTime start, DateTime end)
    {
        var expenses = await db.Expenses
            .Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end)
            .Include(e => e.Category)
            .ToListAsync();
        var total = expenses.Sum(e => e.TotalAmount);
        var byCategory = expenses.GroupBy(e => e.Category?.Name ?? "Khác")
            .Select(g => (object)new { Name = g.Key, Amount = g.Sum(e => e.TotalAmount) }).ToArray();
        return (total, byCategory);
    }

    private static decimal CalcChangePercent(decimal oldVal, decimal newVal) =>
        oldVal != 0 ? Math.Round((newVal - oldVal) / Math.Abs(oldVal) * 100, 1) : (newVal > 0 ? 100 : 0);

    private static double CalcChangePercent(int oldVal, int newVal) =>
        oldVal != 0 ? Math.Round((double)(newVal - oldVal) / Math.Abs(oldVal) * 100, 1) : (newVal > 0 ? 100 : 0);
}
