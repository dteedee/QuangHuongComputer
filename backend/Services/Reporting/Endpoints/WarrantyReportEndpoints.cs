using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Warranty.Infrastructure;
using Warranty.Domain;
using Repair.Infrastructure;
using Repair.Domain;
using Catalog.Infrastructure;

namespace Reporting.Endpoints;

public static class WarrantyReportEndpoints
{
    public static void MapWarrantyReportEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/warranty/summary", async (
            WarrantyDbContext warrantyDb,
            string? startDate = null, string? endDate = null) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.Parse(startDate) : DateTime.UtcNow.AddMonths(-12);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.Parse(endDate) : DateTime.UtcNow.AddDays(1);

            var claims = await warrantyDb.Claims
                .Where(c => c.FiledDate >= start && c.FiledDate < end)
                .ToListAsync();

            var total = claims.Count;
            var resolved = claims.Count(c => c.Status == ClaimStatus.Resolved);
            var pending = claims.Count(c => c.Status == ClaimStatus.Pending || c.Status == ClaimStatus.Approved);
            var rejected = claims.Count(c => c.Status == ClaimStatus.Rejected);

            var avgResolutionDays = claims
                .Where(c => c.ResolvedDate.HasValue)
                .Select(c => (c.ResolvedDate!.Value - c.FiledDate).TotalDays)
                .DefaultIfEmpty(0)
                .Average();

            var byStatus = claims
                .GroupBy(c => c.Status.ToString())
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToList();

            var monthlyTrend = claims
                .GroupBy(c => new { c.FiledDate.Year, c.FiledDate.Month })
                .Select(g => new
                {
                    Month = $"{g.Key.Month:00}/{g.Key.Year}",
                    Filed = g.Count(),
                    Resolved = g.Count(c => c.ResolvedDate.HasValue &&
                        c.ResolvedDate.Value.Year == g.Key.Year &&
                        c.ResolvedDate.Value.Month == g.Key.Month)
                })
                .OrderBy(x => x.Month)
                .ToList();

            return Results.Ok(new
            {
                TotalClaims = total,
                ResolvedClaims = resolved,
                PendingClaims = pending,
                RejectedClaims = rejected,
                ResolutionRate = total > 0 ? Math.Round((double)resolved / total * 100, 1) : 0,
                AvgResolutionDays = Math.Round(avgResolutionDays, 1),
                ByStatus = byStatus,
                MonthlyTrend = monthlyTrend
            });
        });

        group.MapGet("/warranty/by-brand", async (
            WarrantyDbContext warrantyDb,
            CatalogDbContext catalogDb,
            string? startDate = null, string? endDate = null) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.Parse(startDate) : DateTime.UtcNow.AddMonths(-12);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.Parse(endDate) : DateTime.UtcNow.AddDays(1);

            var claims = await warrantyDb.Claims
                .Where(c => c.FiledDate >= start && c.FiledDate < end)
                .ToListAsync();

            var warranties = await warrantyDb.ProductWarranties
                .ToListAsync();

            var products = await catalogDb.Products
                .Select(p => new { p.Id, p.Name })
                .ToListAsync();

            var productDict = products.ToDictionary(p => p.Id, p => p.Name);
            var warrantyDict = warranties.ToDictionary(w => w.SerialNumber, w => w.ProductId);

            var result = claims
                .GroupBy(c =>
                {
                    warrantyDict.TryGetValue(c.SerialNumber, out var pid);
                    productDict.TryGetValue(pid, out var name);
                    return name ?? "Unknown";
                })
                .Select(g => new
                {
                    ProductName = g.Key,
                    TotalClaims = g.Count(),
                    ResolvedClaims = g.Count(c => c.Status == ClaimStatus.Resolved),
                    AvgResolutionDays = Math.Round(
                        g.Where(c => c.ResolvedDate.HasValue)
                         .Select(c => (c.ResolvedDate!.Value - c.FiledDate).TotalDays)
                         .DefaultIfEmpty(0).Average(), 1)
                })
                .OrderByDescending(x => x.TotalClaims)
                .ToList();

            return Results.Ok(result);
        });

        group.MapGet("/warranty/costs", async (
            WarrantyDbContext warrantyDb,
            RepairDbContext repairDb,
            string? startDate = null, string? endDate = null) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.Parse(startDate) : DateTime.UtcNow.AddMonths(-12);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.Parse(endDate) : DateTime.UtcNow.AddDays(1);

            var resolvedClaims = await warrantyDb.Claims
                .Where(c => c.Status == ClaimStatus.Resolved && c.FiledDate >= start && c.FiledDate < end)
                .ToListAsync();

            var avgRepairCost = await repairDb.WorkOrders
                .Where(w => w.Status == WorkOrderStatus.Completed)
                .AverageAsync(w => (decimal?)w.ActualCost) ?? 0;

            var totalCost = resolvedClaims.Count * avgRepairCost;
            var avgCostPerClaim = resolvedClaims.Count > 0 ? avgRepairCost : 0;

            var monthlyCosts = resolvedClaims
                .GroupBy(c => new { c.FiledDate.Year, c.FiledDate.Month })
                .Select(g => new
                {
                    Month = $"{g.Key.Month:00}/{g.Key.Year}",
                    ClaimCount = g.Count(),
                    EstimatedCost = Math.Round(g.Count() * avgRepairCost, 0)
                })
                .OrderBy(x => x.Month)
                .ToList();

            return Results.Ok(new
            {
                TotalWarrantyCost = Math.Round(totalCost, 0),
                AvgCostPerClaim = Math.Round(avgCostPerClaim, 0),
                ResolvedClaimCount = resolvedClaims.Count,
                MonthlyCosts = monthlyCosts
            });
        });

        group.MapGet("/warranty/trending", async (
            WarrantyDbContext warrantyDb,
            int top = 10, int period = 30) =>
        {
            var since = DateTime.UtcNow.AddDays(-period);

            var recentClaims = await warrantyDb.Claims
                .Where(c => c.FiledDate >= since)
                .ToListAsync();

            var result = recentClaims
                .GroupBy(c => c.SerialNumber.Length >= 8 ? c.SerialNumber[..8] : c.SerialNumber)
                .Select(g =>
                {
                    var issues = g.Select(c => c.IssueDescription).ToList();
                    var commonWords = issues
                        .SelectMany(i => i.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                        .GroupBy(w => w.ToLower())
                        .OrderByDescending(wg => wg.Count())
                        .FirstOrDefault()?.Key ?? "";

                    return new
                    {
                        SerialPrefix = g.Key,
                        ClaimCount = g.Count(),
                        CommonIssue = commonWords,
                        Trend = g.Count() > 3 ? "High" : g.Count() > 1 ? "Medium" : "Low"
                    };
                })
                .OrderByDescending(x => x.ClaimCount)
                .Take(top)
                .ToList();

            return Results.Ok(result);
        });
    }
}
