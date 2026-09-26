using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;
using Sales.Domain;
using InventoryModule.Infrastructure;
using BuildingBlocks.Time;
using Reporting.Shared;
using BuildingBlocks.Endpoints;

namespace Reporting.Endpoints;

public static class AnalyticsEndpoints
{
    public static void MapAnalyticsEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/profit-margin", async (SalesDbContext salesDb, InventoryDbContext invDb, IBusinessClock clock, string? startDate, string? endDate) =>
        {
            ReportPeriod period;
            try { period = ReportPeriod.Resolve(clock, startDate, endDate); }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
            var (start, end) = (period.Start, period.End);

            // Doanh thu dùng chung RecognizedRevenue (Requirement 1); giá vốn KHÔNG có snapshot
            // trên OrderItem nên phải ước tính từ giá vốn kho hiện tại (isEstimate: true) - xem
            // Reporting/Shared/CogsEstimator.cs.
            var orderItems = await RevenueQueries.RecognizedInPeriod(salesDb, start, end)
                .SelectMany(o => o.Items)
                .GroupBy(i => new { i.ProductId, i.ProductName })
                .Select(g => new { g.Key.ProductId, g.Key.ProductName, Revenue = g.Sum(i => i.UnitPrice * i.Quantity), UnitsSold = g.Sum(i => i.Quantity) })
                .OrderByDescending(x => x.Revenue)
                .Take(50)
                .ToListAsync();

            var productIds = orderItems.Select(x => x.ProductId).ToList();
            // Không có snapshot giá vốn tại thời điểm bán trên OrderItem (W2-3 ngoài phạm vi sở
            // hữu track này) -> luôn ước tính từ giá vốn kho HIỆN TẠI, đánh dấu isEstimate:true
            // (Requirement 2). Xem integration-requests-w2.md.
            var unitCosts = await CogsEstimator.CurrentUnitCostsAsync(invDb, productIds);

            var result = orderItems.Select(item =>
            {
                var costPrice = unitCosts.GetValueOrDefault(item.ProductId, 0m);
                var totalCost = costPrice * item.UnitsSold;
                var profit = item.Revenue - totalCost;
                var marginPercent = item.Revenue > 0 ? Math.Round(profit / item.Revenue * 100, 1) : 0;
                return new { item.ProductId, item.ProductName, item.Revenue, TotalCost = totalCost, Profit = profit, MarginPercent = marginPercent, item.UnitsSold, IsEstimate = true };
            });

            return Results.Ok(new { Period = new { Start = start, End = end }, Products = result, TotalRevenue = orderItems.Sum(x => x.Revenue), IsEstimate = true });
        });

        group.MapGet("/customer-ltv", async (SalesDbContext salesDb, BuildingBlocks.Contracts.IUserDirectory userDirectory, int top = 50) =>
        {
            var customerStats = await salesDb.Orders
                .Recognized()
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

            // Requirement 3: tên hiển thị khách qua IUserDirectory, không trả GUID trần.
            var custIds = customerStats.Select(c => c.CustomerId.ToString()).ToList();
            var directory = (await userDirectory.GetByIdsAsync(custIds))
                .ToDictionary(u => u.Id, u => u.FullName);

            var result = customerStats.Select(c =>
            {
                var daysSinceFirst = (DateTime.UtcNow - c.FirstOrder).Days;
                var daysSinceLast = (DateTime.UtcNow - c.LastOrder).Days;
                var purchaseFrequency = daysSinceFirst > 0 ? (double)c.OrderCount / (daysSinceFirst / 365.0) : c.OrderCount;
                var projectedClv = c.AvgOrderValue * (decimal)purchaseFrequency * 3;
                var segment = daysSinceLast > 180 ? "Lost" : daysSinceLast > 90 ? "AtRisk" : c.TotalSpent > 50_000_000 ? "VIP" : "Regular";
                var customerName = directory.GetValueOrDefault(c.CustomerId.ToString(), "Khách vãng lai");
                return new { c.CustomerId, CustomerName = customerName, c.TotalSpent, c.OrderCount, c.AvgOrderValue, ProjectedClv = projectedClv, Segment = segment, DaysSinceLast = daysSinceLast };
            });

            return Results.Ok(result);
        });

        group.MapGet("/dashboard-kpis", async (SalesDbContext salesDb, InventoryDbContext invDb, IBusinessClock clock) =>
        {
            var today = clock.TodayVn.ToDateTime(TimeOnly.MinValue);
            var thisMonth = new DateTime(today.Year, today.Month, 1);
            var lastMonth = thisMonth.AddMonths(-1);

            // Một định nghĩa doanh thu duy nhất (Requirement 1) - trùng với sales-summary,
            // business-overview, comparison/revenue và Excel export cho cùng kỳ.
            var todayRevenue = await RevenueQueries.GrossRevenueAsync(salesDb, today, today.AddDays(1));
            var todayOrders = await RevenueQueries.RecognizedInPeriod(salesDb, today, today.AddDays(1)).CountAsync();
            var monthRevenue = await RevenueQueries.GrossRevenueAsync(salesDb, thisMonth, today.AddDays(1));
            var lastMonthRevenue = await RevenueQueries.GrossRevenueAsync(salesDb, lastMonth, thisMonth);
            var pendingOrders = await salesDb.Orders.CountAsync(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.Confirmed);
            var lowStockCount = await invDb.InventoryItems.CountAsync(i => i.QuantityOnHand <= i.LowStockThreshold);

            // Requirement 3: null + noBaseline khi chưa có kỳ trước, không suy diễn "100%".
            var growth = GrowthCalculator.Compare(monthRevenue, lastMonthRevenue);

            return Results.Ok(new
            {
                TodayRevenue = todayRevenue, TodayOrders = todayOrders,
                MonthRevenue = monthRevenue, MonthGrowth = growth.Percent, MonthGrowthNoBaseline = growth.NoBaseline,
                PendingOrders = pendingOrders, LowStockAlerts = lowStockCount
            });
        });
    }
}
