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

namespace Reporting;

public static class ReportingEndpoints
{
    public static void MapReportingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/reports").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager"));

        group.MapGet("/sales-summary", async (SalesDbContext salesDb) =>
        {
            var totalOrders = await salesDb.Orders.CountAsync();
            var totalRevenue = await salesDb.Orders.SumAsync(o => o.TotalAmount);
            return Results.Ok(new { TotalOrders = totalOrders, TotalRevenue = totalRevenue });
        });

        group.MapGet("/inventory-value", async (InventoryDbContext invDb) =>
        {
            var value = await invDb.InventoryItems.SumAsync(i => i.QuantityOnHand * 100); // Placeholder price
            return Results.Ok(new { TotalValue = value });
        });

        group.MapGet("/ar-aging", async (AccountingDbContext accDb) =>
        {
            var accounts = await accDb.Accounts.ToListAsync();
            return Results.Ok(accounts);
        });
    }
}
