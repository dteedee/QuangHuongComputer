using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;
using Sales.Domain;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;

namespace Reporting.Endpoints;

public static class AnalyticsEndpoints
{
    public static void MapAnalyticsEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/profit-margin", async (SalesDbContext salesDb, CatalogDbContext catalogDb, string? startDate, string? endDate) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.TryParse(startDate, out var _sd) ? _sd : DateTime.UtcNow.AddMonths(-3) : DateTime.UtcNow.AddMonths(-3);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.TryParse(endDate, out var _ed) ? _ed : DateTime.UtcNow.AddDays(1) : DateTime.UtcNow.AddDays(1);

            var orderItems = await salesDb.Orders
                .Where(o => o.OrderDate >= start && o.OrderDate < end && o.Status != OrderStatus.Cancelled)
                .SelectMany(o => o.Items)
                .GroupBy(i => new { i.ProductId, i.ProductName })
                .Select(g => new { g.Key.ProductId, g.Key.ProductName, Revenue = g.Sum(i => i.UnitPrice * i.Quantity), UnitsSold = g.Sum(i => i.Quantity) })
                .OrderByDescending(x => x.Revenue)
                .Take(50)
                .ToListAsync();

            var productIds = orderItems.Select(x => x.ProductId).ToList();
            var products = await catalogDb.Products
                .Where(p => productIds.Contains(p.Id))
                .Select(p => new { p.Id, p.CostPrice })
                .ToDictionaryAsync(p => p.Id, p => p.CostPrice);

            var result = orderItems.Select(item =>
            {
                var costPrice = products.GetValueOrDefault(item.ProductId, 0);
                var totalCost = costPrice * item.UnitsSold;
                var profit = item.Revenue - totalCost;
                var marginPercent = item.Revenue > 0 ? Math.Round(profit / item.Revenue * 100, 1) : 0;
                return new { item.ProductId, item.ProductName, item.Revenue, TotalCost = totalCost, Profit = profit, MarginPercent = marginPercent, item.UnitsSold };
            });

            return Results.Ok(new { Period = new { Start = start, End = end }, Products = result, TotalRevenue = orderItems.Sum(x => x.Revenue) });
        });

        group.MapGet("/customer-ltv", async (SalesDbContext salesDb, int top = 50) =>
        {
            var customerStats = await salesDb.Orders
                .Where(o => o.Status != OrderStatus.Cancelled)
                .GroupBy(o => o.CustomerId)
                .Select(g => new
                {
                    CustomerId = g.Key, TotalSpent = g.Sum(o => o.TotalAmount),
                    OrderCount = g.Count(), AvgOrderValue = g.Average(o => o.TotalAmount),
                    FirstOrder = g.Min(o => o.OrderDate), LastOrder = g.Max(o => o.OrderDate)
                })
                .OrderByDescending(x => x.TotalSpent)
                .Take(top)
                .ToListAsync();

            var result = customerStats.Select(c =>
            {
                var daysSinceFirst = (DateTime.UtcNow - c.FirstOrder).Days;
                var daysSinceLast = (DateTime.UtcNow - c.LastOrder).Days;
                var purchaseFrequency = daysSinceFirst > 0 ? (double)c.OrderCount / (daysSinceFirst / 365.0) : c.OrderCount;
                var projectedClv = c.AvgOrderValue * (decimal)purchaseFrequency * 3;
                var segment = daysSinceLast > 180 ? "Lost" : daysSinceLast > 90 ? "AtRisk" : c.TotalSpent > 50_000_000 ? "VIP" : "Regular";
                return new { c.CustomerId, c.TotalSpent, c.OrderCount, c.AvgOrderValue, ProjectedClv = projectedClv, Segment = segment, DaysSinceLast = daysSinceLast };
            });

            return Results.Ok(result);
        });

        group.MapGet("/dashboard-kpis", async (SalesDbContext salesDb, InventoryDbContext invDb) =>
        {
            var today = DateTime.UtcNow.Date;
            var thisMonth = new DateTime(today.Year, today.Month, 1);
            var lastMonth = thisMonth.AddMonths(-1);

            var todayRevenue = await salesDb.Orders.Where(o => o.OrderDate >= today).SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var todayOrders = await salesDb.Orders.CountAsync(o => o.OrderDate >= today);
            var monthRevenue = await salesDb.Orders.Where(o => o.OrderDate >= thisMonth).SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var lastMonthRevenue = await salesDb.Orders.Where(o => o.OrderDate >= lastMonth && o.OrderDate < thisMonth).SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var pendingOrders = await salesDb.Orders.CountAsync(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.Confirmed);
            var lowStockCount = await invDb.InventoryItems.CountAsync(i => i.QuantityOnHand <= i.LowStockThreshold);

            var growth = lastMonthRevenue > 0 ? Math.Round((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100, 1) : 100m;

            return Results.Ok(new
            {
                TodayRevenue = todayRevenue, TodayOrders = todayOrders,
                MonthRevenue = monthRevenue, MonthGrowth = growth,
                PendingOrders = pendingOrders, LowStockAlerts = lowStockCount
            });
        });
    }
}
