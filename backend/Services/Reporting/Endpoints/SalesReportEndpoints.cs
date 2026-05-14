using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;
using Sales.Domain;
using Identity.Infrastructure;

namespace Reporting.Endpoints;

public static class SalesReportEndpoints
{
    public static void MapSalesReportEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/sales-summary", async (SalesDbContext salesDb, string? startDate, string? endDate) =>
        {
            var today = DateTime.UtcNow.Date;
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.Parse(startDate) : today.AddMonths(-12);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.Parse(endDate) : today.AddDays(1);
            var thisMonth = new DateTime(today.Year, today.Month, 1);

            var ordersQuery = salesDb.Orders.Where(o => o.OrderDate >= start && o.OrderDate < end);

            var totalOrders = await ordersQuery.CountAsync();
            var totalRevenue = await ordersQuery.SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var monthRevenue = await salesDb.Orders
                .Where(o => o.OrderDate >= thisMonth)
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var todayRevenue = await salesDb.Orders
                .Where(o => o.OrderDate >= today)
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var todayOrders = await salesDb.Orders.CountAsync(o => o.OrderDate >= today);

            var rawMonthlyData = await salesDb.Orders
                .Where(o => o.OrderDate >= today.AddMonths(-11))
                .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(o => o.TotalAmount), OrderCount = g.Count() })
                .ToListAsync();

            var monthlyData = new List<object>();
            for (int i = 11; i >= 0; i--)
            {
                var targetDate = today.AddMonths(-i);
                var data = rawMonthlyData.FirstOrDefault(m => m.Year == targetDate.Year && m.Month == targetDate.Month);
                monthlyData.Add(new { Year = targetDate.Year, Month = targetDate.Month, Revenue = data?.Revenue ?? 0, OrderCount = data?.OrderCount ?? 0 });
            }

            var statusDistribution = await salesDb.Orders
                .GroupBy(o => o.Status)
                .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
                .ToListAsync();

            return Results.Ok(new
            {
                TotalOrders = totalOrders, TotalRevenue = totalRevenue,
                MonthRevenue = monthRevenue, TodayRevenue = todayRevenue, TodayOrders = todayOrders,
                MonthlyData = monthlyData, StatusDistribution = statusDistribution
            });
        });

        group.MapGet("/top-products", async (SalesDbContext salesDb, int top = 10, string? startDate = null, string? endDate = null) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.Parse(startDate) : DateTime.UtcNow.AddMonths(-3);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.Parse(endDate) : DateTime.UtcNow.AddDays(1);

            var topProducts = await salesDb.Orders
                .Where(o => o.OrderDate >= start && o.OrderDate < end && o.Status != OrderStatus.Cancelled)
                .SelectMany(o => o.Items)
                .GroupBy(i => new { i.ProductId, i.ProductName })
                .Select(g => new
                {
                    ProductId = g.Key.ProductId, ProductName = g.Key.ProductName,
                    TotalQuantity = g.Sum(i => i.Quantity), TotalRevenue = g.Sum(i => i.UnitPrice * i.Quantity),
                    OrderCount = g.Select(i => i.OrderId).Distinct().Count()
                })
                .OrderByDescending(x => x.TotalRevenue)
                .Take(top)
                .ToListAsync();

            return Results.Ok(topProducts);
        });

        group.MapGet("/top-customers", async (SalesDbContext salesDb, IdentityDbContext identityDb, int top = 10) =>
        {
            var topCustomerIds = await salesDb.Orders
                .Where(o => o.Status != OrderStatus.Cancelled)
                .GroupBy(o => o.CustomerId)
                .Select(g => new
                {
                    CustomerId = g.Key, TotalSpent = g.Sum(o => o.TotalAmount),
                    OrderCount = g.Count(), LastOrderDate = g.Max(o => o.OrderDate)
                })
                .OrderByDescending(x => x.TotalSpent)
                .Take(top)
                .ToListAsync();

            var customerIdStrings = topCustomerIds.Select(c => c.CustomerId.ToString()).ToList();
            var users = await identityDb.Users
                .Where(u => customerIdStrings.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName, u.Email })
                .ToDictionaryAsync(u => u.Id, u => new { u.FullName, u.Email });

            var result = topCustomerIds.Select(c => new
            {
                c.CustomerId,
                CustomerName = users.TryGetValue(c.CustomerId.ToString(), out var user) ? user.FullName : "Khách vãng lai",
                Email = users.TryGetValue(c.CustomerId.ToString(), out var u) ? u.Email : "",
                c.TotalSpent, c.OrderCount, c.LastOrderDate
            });

            return Results.Ok(result);
        });

        group.MapGet("/business-overview", async (
            SalesDbContext salesDb, InventoryModule.Infrastructure.InventoryDbContext invDb,
            Repair.Infrastructure.RepairDbContext repairDb, Accounting.Infrastructure.AccountingDbContext accDb) =>
        {
            var today = DateTime.UtcNow.Date;
            var thisMonth = new DateTime(today.Year, today.Month, 1);
            var lastMonth = thisMonth.AddMonths(-1);

            var thisMonthRevenueTask = salesDb.Orders
                .Where(o => o.OrderDate >= thisMonth && o.Status != OrderStatus.Cancelled)
                .SumAsync(o => (decimal?)o.TotalAmount);
            var lastMonthRevenueTask = salesDb.Orders
                .Where(o => o.OrderDate >= lastMonth && o.OrderDate < thisMonth && o.Status != OrderStatus.Cancelled)
                .SumAsync(o => (decimal?)o.TotalAmount);
            var pendingOrdersTask = salesDb.Orders.CountAsync(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.Confirmed);
            var inventoryValueTask = invDb.InventoryItems.SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost);
            var lowStockCountTask = invDb.InventoryItems.CountAsync(i => i.QuantityOnHand <= i.LowStockThreshold);
            var pendingRepairsTask = repairDb.WorkOrders.CountAsync(w => w.Status == Repair.Domain.WorkOrderStatus.Pending || w.Status == Repair.Domain.WorkOrderStatus.InProgress);
            var thisMonthRepairRevenueTask = repairDb.WorkOrders
                .Where(w => w.FinishedAt >= thisMonth && w.Status == Repair.Domain.WorkOrderStatus.Completed)
                .SumAsync(w => (decimal?)w.ActualCost);
            var totalARTask = accDb.Accounts.SumAsync(a => (decimal?)a.Balance);

            await Task.WhenAll(thisMonthRevenueTask, lastMonthRevenueTask, pendingOrdersTask,
                inventoryValueTask, lowStockCountTask, pendingRepairsTask, thisMonthRepairRevenueTask, totalARTask);

            var thisMonthRevenue = await thisMonthRevenueTask ?? 0;
            var lastMonthRevenue = await lastMonthRevenueTask ?? 0;
            var revenueGrowth = lastMonthRevenue > 0
                ? Math.Round((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100, 1) : 100;

            return Results.Ok(new
            {
                Sales = new { ThisMonthRevenue = thisMonthRevenue, LastMonthRevenue = lastMonthRevenue, GrowthPercent = revenueGrowth, PendingOrders = await pendingOrdersTask },
                Inventory = new { TotalValue = await inventoryValueTask ?? 0, LowStockCount = await lowStockCountTask },
                Repairs = new { PendingCount = await pendingRepairsTask, ThisMonthRevenue = await thisMonthRepairRevenueTask ?? 0 },
                Accounting = new { TotalReceivables = await totalARTask ?? 0 }
            });
        });
    }
}
