using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Infrastructure;
using Repair.Domain;

namespace Reporting.Endpoints;

public static class RepairReportEndpoints
{
    public static void MapRepairReportEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/tech-performance", async (RepairDbContext repairDb) =>
        {
            var totalJobs = await repairDb.WorkOrders.CountAsync();
            var completedJobs = await repairDb.WorkOrders.CountAsync(w => w.Status == WorkOrderStatus.Completed);
            var avgCost = await repairDb.WorkOrders
                .Where(w => w.Status == WorkOrderStatus.Completed)
                .AverageAsync(w => (decimal?)w.ActualCost) ?? 0;

            return Results.Ok(new
            {
                TotalJobs = totalJobs, CompletedJobs = completedJobs,
                SuccessRate = totalJobs > 0 ? (double)completedJobs / totalJobs * 100 : 0,
                AverageRepairCost = avgCost
            });
        });

        group.MapGet("/top-technicians", async (RepairDbContext repairDb, int top = 10) =>
        {
            var techStats = await repairDb.WorkOrders
                .Where(w => w.TechnicianId != null)
                .GroupBy(w => w.TechnicianId)
                .Select(g => new
                {
                    TechnicianId = g.Key, TotalJobs = g.Count(),
                    CompletedJobs = g.Count(w => w.Status == WorkOrderStatus.Completed),
                    TotalRevenue = g.Sum(w => w.ActualCost)
                })
                .OrderByDescending(x => x.CompletedJobs)
                .Take(top)
                .ToListAsync();

            var techIds = techStats.Select(t => t.TechnicianId).Where(id => id.HasValue).Select(id => id!.Value).ToList();
            var technicians = await repairDb.Technicians
                .Where(t => techIds.Contains(t.Id))
                .Select(t => new { t.Id, t.Name, t.Specialty })
                .ToDictionaryAsync(t => t.Id, t => new { t.Name, t.Specialty });

            var result = techStats.Select(t => new
            {
                t.TechnicianId,
                TechnicianName = t.TechnicianId.HasValue && technicians.TryGetValue(t.TechnicianId.Value, out var tech) ? tech.Name : "Chưa phân công",
                Specialty = t.TechnicianId.HasValue && technicians.TryGetValue(t.TechnicianId.Value, out var s) ? s.Specialty : "",
                t.TotalJobs, t.CompletedJobs,
                SuccessRate = t.TotalJobs > 0 ? Math.Round((double)t.CompletedJobs / t.TotalJobs * 100, 1) : 0,
                t.TotalRevenue, AvgCompletionHours = 0
            });

            return Results.Ok(result);
        });
    }
}
