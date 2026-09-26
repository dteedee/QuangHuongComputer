using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;
using Sales.Domain;
using Identity.Infrastructure;
using BuildingBlocks.Time;
using Reporting.Shared;
using BuildingBlocks.Endpoints;

namespace Reporting.Endpoints;

public static class SalesReportEndpoints
{
    public static void MapSalesReportEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/sales-summary", async (SalesDbContext salesDb, IBusinessClock clock, string? startDate, string? endDate) =>
        {
            var today = clock.TodayVn.ToDateTime(TimeOnly.MinValue);
            ReportPeriod period;
            try { period = ReportPeriod.Resolve(clock, startDate, endDate, defaultSpanMonths: 12); }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
            var (start, end) = (period.Start, period.End);
            var thisMonth = new DateTime(today.Year, today.Month, 1);

            // Requirement 1: cùng một RecognizedRevenue mọi nơi - khớp với dashboard-kpis,
            // business-overview, comparison/revenue và Excel export cho cùng kỳ.
            var totalOrders = await RevenueQueries.RecognizedInPeriod(salesDb, start, end).CountAsync();
            var totalRevenue = await RevenueQueries.GrossRevenueAsync(salesDb, start, end);
            var monthRevenue = await RevenueQueries.GrossRevenueAsync(salesDb, thisMonth, today.AddDays(1));
            var todayRevenue = await RevenueQueries.GrossRevenueAsync(salesDb, today, today.AddDays(1));
            var todayOrders = await RevenueQueries.RecognizedInPeriod(salesDb, today, today.AddDays(1)).CountAsync();

            var rawMonthlyData = await salesDb.Orders
                .Recognized()
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
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.TryParse(startDate, out var _sd) ? _sd : DateTime.UtcNow.AddMonths(-3) : DateTime.UtcNow.AddMonths(-3);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.TryParse(endDate, out var _ed) ? _ed : DateTime.UtcNow.AddDays(1) : DateTime.UtcNow.AddDays(1);

            var topProducts = await RevenueQueries.RecognizedInPeriod(salesDb, start, end)
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
                .Recognized()
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
            Repair.Infrastructure.RepairDbContext repairDb, Accounting.Infrastructure.AccountingDbContext accDb,
            IBusinessClock clock) =>
        {
            var today = clock.TodayVn.ToDateTime(TimeOnly.MinValue);
            var thisMonth = new DateTime(today.Year, today.Month, 1);
            var lastMonth = thisMonth.AddMonths(-1);

            // Sequential awaits per DbContext: salesDb/invDb/repairDb/accDb each had 2-3
            // concurrent operations started on the SAME context via Task.WhenAll, which
            // throws "A second operation started on this context before a previous
            // operation completed". Result sets are small; not worth IDbContextFactory.
            // Requirement 1: RecognizedRevenue shared helper - matches sales-summary,
            // dashboard-kpis, comparison/revenue and Excel export for the same period.
            var thisMonthRevenue = await RevenueQueries.GrossRevenueAsync(salesDb, thisMonth, today.AddDays(1));
            var lastMonthRevenue = await RevenueQueries.GrossRevenueAsync(salesDb, lastMonth, thisMonth);
            var pendingOrders = await salesDb.Orders.CountAsync(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.Confirmed);
            var inventoryValue = await invDb.InventoryItems.SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost) ?? 0;
            var lowStockCount = await invDb.InventoryItems.CountAsync(i => i.QuantityOnHand <= i.LowStockThreshold);
            var pendingRepairs = await repairDb.WorkOrders.CountAsync(w => w.Status == Repair.Domain.WorkOrderStatus.Pending || w.Status == Repair.Domain.WorkOrderStatus.InProgress);
            var thisMonthRepairRevenue = await repairDb.WorkOrders
                .Where(w => w.FinishedAt >= thisMonth && w.Status == Repair.Domain.WorkOrderStatus.Completed)
                .SumAsync(w => (decimal?)w.ActualCost) ?? 0;
            var totalAR = await accDb.Accounts.SumAsync(a => (decimal?)a.Balance) ?? 0;

            // Requirement 3: null + noBaseline instead of a fake "100%" when there is no prior period.
            var revenueGrowth = GrowthCalculator.Compare(thisMonthRevenue, lastMonthRevenue);

            return Results.Ok(new
            {
                Sales = new { ThisMonthRevenue = thisMonthRevenue, LastMonthRevenue = lastMonthRevenue, GrowthPercent = revenueGrowth.Percent, GrowthNoBaseline = revenueGrowth.NoBaseline, PendingOrders = pendingOrders },
                Inventory = new { TotalValue = inventoryValue, LowStockCount = lowStockCount },
                Repairs = new { PendingCount = pendingRepairs, ThisMonthRevenue = thisMonthRepairRevenue },
                Accounting = new { TotalReceivables = totalAR }
            });
        });
    }
}
