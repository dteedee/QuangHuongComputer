using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;
using Accounting.Infrastructure;
using InventoryModule.Infrastructure;
using Sales.Domain;
using InventoryModule.Domain;
using Accounting.Domain;
using Repair.Infrastructure;
using Repair.Domain;

namespace Reporting;

public static class ReportingEndpoints
{
    public static void MapReportingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/reports").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager"));

        group.MapGet("/sales-summary", async (SalesDbContext salesDb) =>
        {
            var today = DateTime.UtcNow.Date;
            var thisMonth = new DateTime(today.Year, today.Month, 1);

            var totalOrders = await salesDb.Orders.CountAsync();
            var totalRevenue = await salesDb.Orders.SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var monthRevenue = await salesDb.Orders
                .Where(o => o.OrderDate >= thisMonth)
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            
            // Monthly revenue for chart
            var monthlyData = await salesDb.Orders
                .Where(o => o.OrderDate >= today.AddMonths(-11))
                .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(o => o.TotalAmount) })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            return Results.Ok(new 
            { 
                TotalOrders = totalOrders, 
                TotalRevenue = totalRevenue, 
                MonthRevenue = monthRevenue,
                MonthlyData = monthlyData
            });
        });

        group.MapGet("/inventory-value", async (InventoryDbContext invDb) =>
        {
            var items = await invDb.InventoryItems.ToListAsync();
            var totalValue = items.Sum(i => i.QuantityOnHand * 100); // Placeholder unit price
            return Results.Ok(new { TotalValue = totalValue, ItemCount = items.Count });
        });

        group.MapGet("/ar-aging", async (AccountingDbContext accDb) =>
        {
            var accounts = await accDb.Accounts.ToListAsync();
            return Results.Ok(accounts);
        });

        group.MapGet("/tech-performance", async (RepairDbContext repairDb) =>
        {
            var totalJobs = await repairDb.WorkOrders.CountAsync();
            var completedJobs = await repairDb.WorkOrders.CountAsync(w => w.Status == WorkOrderStatus.Completed);
            var avgCost = await repairDb.WorkOrders
                .Where(w => w.Status == WorkOrderStatus.Completed)
                .AverageAsync(w => (decimal?)w.TotalCost) ?? 0;

            return Results.Ok(new 
            { 
                TotalJobs = totalJobs, 
                CompletedJobs = completedJobs,
                SuccessRate = totalJobs > 0 ? (double)completedJobs / totalJobs * 100 : 0,
                AverageRepairCost = avgCost
            });
        });
    }
}
