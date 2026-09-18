using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;
using Sales.Domain;
using Accounting.Infrastructure;
using Accounting.Domain;
using InventoryModule.Infrastructure;
using Reporting.Shared;

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

            // Sequential: both tasks query the same salesDb context, which throws on
            // concurrent operations under Task.WhenAll.
            var p1 = await GetRevenuePeriodData(salesDb, p1s, p1e);
            var p2 = await GetRevenuePeriodData(salesDb, p2s, p2e);
            return Results.Ok(new
            {
                Period1 = new { Label = $"{p1s:dd/MM} - {p1e:dd/MM}", p1.Revenue, p1.OrderCount, p1.AvgOrderValue },
                Period2 = new { Label = $"{p2s:dd/MM} - {p2e:dd/MM}", p2.Revenue, p2.OrderCount, p2.AvgOrderValue },
                Change = BuildComparisonChange(p1, p2)
            });
        });

        group.MapGet("/comparison/orders", async (SalesDbContext salesDb,
            string period1Start, string period1End, string period2Start, string period2End) =>
        {
            var p1s = DateTime.Parse(period1Start); var p1e = DateTime.Parse(period1End);
            var p2s = DateTime.Parse(period2Start); var p2e = DateTime.Parse(period2End);

            // Sequential: same salesDb context for both.
            var p1 = await GetOrderPeriodData(salesDb, p1s, p1e);
            var p2 = await GetOrderPeriodData(salesDb, p2s, p2e);
            return Results.Ok(new
            {
                Period1 = p1, Period2 = p2,
                Change = BuildOrderChange(p1, p2)
            });
        });

        group.MapGet("/comparison/expenses", async (AccountingDbContext accDb,
            string period1Start, string period1End, string period2Start, string period2End) =>
        {
            var p1s = DateTime.Parse(period1Start); var p1e = DateTime.Parse(period1End);
            var p2s = DateTime.Parse(period2Start); var p2e = DateTime.Parse(period2End);

            // Sequential: same accDb context for both.
            var p1 = await GetExpensePeriodData(accDb, p1s, p1e);
            var p2 = await GetExpensePeriodData(accDb, p2s, p2e);
            return Results.Ok(new
            {
                Period1 = new { p1.Total, p1.ByCategory },
                Period2 = new { p2.Total, p2.ByCategory },
                Change = BuildDecimalChange(p1.Total, p2.Total)
            });
        });

        group.MapGet("/comparison/inventory-turnover", async (SalesDbContext salesDb, InventoryDbContext invDb,
            string period1Start, string period1End, string period2Start, string period2End) =>
        {
            var p1s = DateTime.Parse(period1Start); var p1e = DateTime.Parse(period1End);
            var p2s = DateTime.Parse(period2Start); var p2e = DateTime.Parse(period2End);

            var avgInventory = await invDb.InventoryItems.SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost) ?? 1;

            var p1Cogs = await RevenueQueries.RecognizedInPeriod(salesDb, p1s, p1e).SumAsync(o => (decimal?)o.SubtotalAmount) ?? 0;
            var p2Cogs = await RevenueQueries.RecognizedInPeriod(salesDb, p2s, p2e).SumAsync(o => (decimal?)o.SubtotalAmount) ?? 0;

            var p1Turnover = avgInventory > 0 ? p1Cogs / avgInventory : 0;
            var p2Turnover = avgInventory > 0 ? p2Cogs / avgInventory : 0;
            var p1Days = p1Turnover > 0 ? Math.Round(365m / p1Turnover, 1) : 0;
            var p2Days = p2Turnover > 0 ? Math.Round(365m / p2Turnover, 1) : 0;

            return Results.Ok(new
            {
                Period1 = new { TurnoverRatio = Math.Round(p1Turnover, 2), AvgDaysToSell = p1Days, Cogs = p1Cogs, AvgInventory = avgInventory },
                Period2 = new { TurnoverRatio = Math.Round(p2Turnover, 2), AvgDaysToSell = p2Days, Cogs = p2Cogs, AvgInventory = avgInventory },
                Change = BuildTurnoverChange(p1Turnover, p2Turnover, p2Days - p1Days)
            });
        });
    }

    private static async Task<(decimal Revenue, int OrderCount, decimal AvgOrderValue)> GetRevenuePeriodData(SalesDbContext db, DateTime start, DateTime end)
    {
        // Requirement 1: shared RecognizedRevenue predicate - same figure as sales-summary,
        // dashboard-kpis, business-overview and the Excel export for the same period.
        var orders = await RevenueQueries.RecognizedInPeriod(db, start, end).ToListAsync();
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

    // Requirement 3 / Success Criteria: "a first-ever period shows chưa có dữ liệu so sánh, not
    // 100%". The old CalcChangePercent here returned a hardcoded 100 when the prior period was 0
    // (exactly the bug phase-54 calls out) - now routed through the shared GrowthCalculator so
    // comparison/* matches dashboard-kpis and business-overview: null + NoBaseline=true.
    private static object BuildComparisonChange((decimal Revenue, int OrderCount, decimal AvgOrderValue) p1, (decimal Revenue, int OrderCount, decimal AvgOrderValue) p2)
    {
        var revenue = GrowthCalculator.Compare(p1.Revenue, p2.Revenue);
        var orders = GrowthCalculator.Compare(p1.OrderCount, p2.OrderCount);
        var aov = GrowthCalculator.Compare(p1.AvgOrderValue, p2.AvgOrderValue);
        return new
        {
            RevenuePercent = revenue.Percent, RevenueNoBaseline = revenue.NoBaseline,
            OrderPercent = orders.Percent, OrderNoBaseline = orders.NoBaseline,
            AovPercent = aov.Percent, AovNoBaseline = aov.NoBaseline
        };
    }

    private static object BuildOrderChange(dynamic p1, dynamic p2)
    {
        var total = GrowthCalculator.Compare((int)p1.Total, (int)p2.Total);
        var completed = GrowthCalculator.Compare((int)p1.Completed, (int)p2.Completed);
        return new
        {
            TotalPercent = total.Percent, TotalNoBaseline = total.NoBaseline,
            CompletedPercent = completed.Percent, CompletedNoBaseline = completed.NoBaseline,
            CancelRateChange = Math.Round((double)p2.CancelRate - (double)p1.CancelRate, 1)
        };
    }

    private static object BuildDecimalChange(decimal oldVal, decimal newVal)
    {
        var growth = GrowthCalculator.Compare(oldVal, newVal);
        return new { TotalPercent = growth.Percent, TotalNoBaseline = growth.NoBaseline };
    }

    private static object BuildTurnoverChange(decimal oldTurnover, decimal newTurnover, decimal daysChange)
    {
        var growth = GrowthCalculator.Compare(oldTurnover, newTurnover);
        return new { TurnoverChangePercent = growth.Percent, TurnoverChangeNoBaseline = growth.NoBaseline, DaysChange = Math.Round(daysChange, 1) };
    }
}
