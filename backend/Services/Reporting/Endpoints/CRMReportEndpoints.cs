using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using CRM.Infrastructure;
using CRM.Domain;

namespace Reporting.Endpoints;

public static class CRMReportEndpoints
{
    public static void MapCRMReportEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/crm/overview", async (CrmDbContext crmDb) =>
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var totalLeads = await crmDb.Leads.CountAsync();
            var newLeadsThisMonth = await crmDb.Leads.CountAsync(l => l.CreatedAt >= monthStart);
            var convertedLeads = await crmDb.Leads.CountAsync(l => l.IsConverted);
            var conversionRate = totalLeads > 0 ? Math.Round((double)convertedLeads / totalLeads * 100, 1) : 0;

            var pipelineValue = await crmDb.Leads
                .Where(l => !l.IsConverted && l.Status != LeadStatus.Lost)
                .SumAsync(l => (decimal?)l.EstimatedValue) ?? 0;

            var avgDealSize = await crmDb.Leads
                .Where(l => l.EstimatedValue != null && l.EstimatedValue > 0)
                .AverageAsync(l => (decimal?)l.EstimatedValue) ?? 0;

            var leadsBySource = await crmDb.Leads
                .GroupBy(l => l.Source)
                .Select(g => new { Source = g.Key.ToString(), Count = g.Count() })
                .ToListAsync();

            var leadsByStatus = await crmDb.Leads
                .GroupBy(l => l.Status)
                .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
                .ToListAsync();

            return Results.Ok(new
            {
                TotalLeads = totalLeads,
                NewLeadsThisMonth = newLeadsThisMonth,
                ConvertedLeads = convertedLeads,
                ConversionRate = conversionRate,
                PipelineValue = Math.Round(pipelineValue, 0),
                AvgDealSize = Math.Round(avgDealSize, 0),
                LeadsBySource = leadsBySource,
                LeadsByStatus = leadsByStatus
            });
        });

        group.MapGet("/crm/campaign-performance", async (CrmDbContext crmDb) =>
        {
            var campaigns = await crmDb.EmailCampaigns
                .OrderByDescending(c => c.SentAt ?? c.CreatedAt)
                .Take(50)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.SentCount,
                    c.TotalRecipients,
                    c.OpenedCount,
                    c.ClickedCount,
                    c.BouncedCount,
                    c.Status,
                    c.SentAt
                })
                .ToListAsync();

            var result = campaigns.Select(c => new
            {
                c.Id,
                c.Name,
                c.SentCount,
                c.TotalRecipients,
                OpenRate = c.TotalRecipients > 0
                    ? Math.Round((double)c.OpenedCount / c.TotalRecipients * 100, 1) : 0,
                ClickRate = c.OpenedCount > 0
                    ? Math.Round((double)c.ClickedCount / c.OpenedCount * 100, 1) : 0,
                BounceRate = c.SentCount > 0
                    ? Math.Round((double)c.BouncedCount / c.SentCount * 100, 1) : 0,
                Status = c.Status.ToString(),
                SentAt = c.SentAt
            });

            return Results.Ok(result);
        });

        group.MapGet("/crm/customer-segments", async (CrmDbContext crmDb) =>
        {
            var segments = await crmDb.CustomerSegments
                .OrderBy(s => s.SortOrder)
                .ToListAsync();

            var segmentIds = segments.Select(s => s.Id).ToList();

            var assignmentCounts = await crmDb.CustomerSegmentAssignments
                .Where(a => segmentIds.Contains(a.SegmentId))
                .GroupBy(a => a.SegmentId)
                .Select(g => new { SegmentId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.SegmentId, x => x.Count);

            var analyticsIds = await crmDb.CustomerSegmentAssignments
                .Where(a => segmentIds.Contains(a.SegmentId))
                .Select(a => new { a.SegmentId, a.CustomerAnalyticsId })
                .ToListAsync();

            var customerAnalyticsIds = analyticsIds.Select(x => x.CustomerAnalyticsId).Distinct().ToList();
            var avgLifetimeValues = await crmDb.CustomerAnalytics
                .Where(ca => customerAnalyticsIds.Contains(ca.Id))
                .Select(ca => new { ca.Id, ca.TotalSpent })
                .ToListAsync();

            var avgBySegment = analyticsIds
                .GroupBy(x => x.SegmentId)
                .ToDictionary(
                    g => g.Key,
                    g =>
                    {
                        var ids = g.Select(x => x.CustomerAnalyticsId).ToHashSet();
                        var values = avgLifetimeValues.Where(a => ids.Contains(a.Id)).Select(a => a.TotalSpent).ToList();
                        return values.Count > 0 ? values.Average() : 0;
                    });

            var result = segments.Select(s => new
            {
                s.Id,
                s.Name,
                s.Code,
                s.Color,
                CustomerCount = assignmentCounts.GetValueOrDefault(s.Id, 0),
                AvgLifetimeValue = Math.Round(avgBySegment.GetValueOrDefault(s.Id, 0), 0)
            });

            return Results.Ok(result);
        });

        group.MapGet("/crm/lead-funnel", async (CrmDbContext crmDb) =>
        {
            var stages = await crmDb.LeadPipelineStages
                .OrderBy(s => s.SortOrder)
                .ToListAsync();

            var stageIds = stages.Select(s => s.Id).ToList();
            var leadsInStages = await crmDb.Leads
                .Where(l => l.PipelineStageId.HasValue && stageIds.Contains(l.PipelineStageId.Value))
                .GroupBy(l => l.PipelineStageId!.Value)
                .Select(g => new
                {
                    StageId = g.Key,
                    Count = g.Count(),
                    TotalValue = g.Sum(l => (decimal?)l.EstimatedValue) ?? 0
                })
                .ToDictionaryAsync(x => x.StageId);

            var funnelData = stages.Select((s, i) =>
            {
                leadsInStages.TryGetValue(s.Id, out var stageData);
                var count = stageData?.Count ?? 0;
                var prevCount = i > 0
                    ? (leadsInStages.TryGetValue(stages[i - 1].Id, out var prev) ? prev.Count : 0)
                    : 0;
                var convRate = i > 0 && prevCount > 0
                    ? Math.Round((double)count / prevCount * 100, 1) : 100.0;

                return new
                {
                    s.Id,
                    s.Name,
                    s.Color,
                    s.WinProbability,
                    LeadCount = count,
                    TotalValue = Math.Round(stageData?.TotalValue ?? 0, 0),
                    ConversionFromPrevious = convRate
                };
            }).ToList();

            return Results.Ok(funnelData);
        });
    }
}
