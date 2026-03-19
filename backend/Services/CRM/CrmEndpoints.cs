using CRM.Domain;
using CRM.DTOs;
using CRM.Infrastructure;
using CRM.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CRM;

public static class CrmEndpoints
{
    public static void MapCrmEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/crm").RequireAuthorization();

        // Dashboard endpoints
        MapDashboardEndpoints(group);

        // Customer endpoints
        MapCustomerEndpoints(group);

        // Segment endpoints
        MapSegmentEndpoints(group);

        // Lead endpoints
        MapLeadEndpoints(group);

        // Pipeline endpoints
        MapPipelineEndpoints(group);

        // Campaign endpoints
        MapCampaignEndpoints(group);

        // Task endpoints
        MapTaskEndpoints(group);

        // Tracking endpoints (public)
        MapTrackingEndpoints(app);
    }

    private static void MapDashboardEndpoints(RouteGroupBuilder group)
    {
        group.MapGet("/dashboard/overview", async (CrmDbContext db) =>
        {
            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            // Customer stats
            var totalCustomers = await db.CustomerAnalytics.CountAsync();
            var newCustomersThisMonth = await db.CustomerAnalytics
                .CountAsync(c => c.CreatedAt >= startOfMonth);

            var customersByStage = await db.CustomerAnalytics
                .GroupBy(c => c.LifecycleStage)
                .Select(g => new { Stage = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Stage, x => x.Count);

            var activeCustomers = customersByStage.GetValueOrDefault(LifecycleStage.Active, 0);
            var atRiskCustomers = customersByStage.GetValueOrDefault(LifecycleStage.AtRisk, 0);
            var churnedCustomers = customersByStage.GetValueOrDefault(LifecycleStage.Churned, 0);
            var vipCustomers = customersByStage.GetValueOrDefault(LifecycleStage.VIP, 0);
            var championCustomers = customersByStage.GetValueOrDefault(LifecycleStage.Champion, 0);

            var totalRevenue = await db.CustomerAnalytics.SumAsync(c => c.TotalSpent);
            var avgOrderValue = totalCustomers > 0
                ? await db.CustomerAnalytics.AverageAsync(c => c.AverageOrderValue)
                : 0;

            // Lead stats
            var totalLeads = await db.Leads.CountAsync(l => !l.IsConverted);
            var newLeadsThisMonth = await db.Leads
                .CountAsync(l => l.CreatedAt >= startOfMonth);
            var qualifiedLeads = await db.Leads
                .CountAsync(l => l.Status == LeadStatus.Qualified && !l.IsConverted);
            var convertedThisMonth = await db.Leads
                .CountAsync(l => l.IsConverted && l.ConvertedAt >= startOfMonth);

            var totalLeadsForConversion = await db.Leads.CountAsync();
            var totalConverted = await db.Leads.CountAsync(l => l.IsConverted);
            var conversionRate = totalLeadsForConversion > 0
                ? (decimal)totalConverted / totalLeadsForConversion * 100
                : 0;

            var pipelineValue = await db.Leads
                .Where(l => !l.IsConverted)
                .SumAsync(l => l.EstimatedValue ?? 0);

            // Task stats
            var pendingTasks = await db.CustomerTasks
                .CountAsync(t => t.Status == Domain.TaskStatus.Pending || t.Status == Domain.TaskStatus.InProgress);
            var overdueTasks = await db.CustomerTasks
                .CountAsync(t => (t.Status == Domain.TaskStatus.Pending || t.Status == Domain.TaskStatus.InProgress)
                    && t.DueDate < now);

            return Results.Ok(new CrmDashboardDto(
                totalCustomers,
                newCustomersThisMonth,
                activeCustomers,
                atRiskCustomers,
                churnedCustomers,
                vipCustomers,
                championCustomers,
                totalRevenue,
                avgOrderValue,
                totalLeads,
                newLeadsThisMonth,
                qualifiedLeads,
                convertedThisMonth,
                conversionRate,
                pipelineValue,
                pendingTasks,
                overdueTasks
            ));
        });

        group.MapGet("/dashboard/rfm-distribution", async (CrmDbContext db) =>
        {
            var recencyDist = await db.CustomerAnalytics
                .GroupBy(c => c.RecencyScore)
                .Select(g => new RfmSegmentCountDto(g.Key, g.Count()))
                .OrderBy(x => x.Score)
                .ToListAsync();

            var frequencyDist = await db.CustomerAnalytics
                .GroupBy(c => c.FrequencyScore)
                .Select(g => new RfmSegmentCountDto(g.Key, g.Count()))
                .OrderBy(x => x.Score)
                .ToListAsync();

            var monetaryDist = await db.CustomerAnalytics
                .GroupBy(c => c.MonetaryScore)
                .Select(g => new RfmSegmentCountDto(g.Key, g.Count()))
                .OrderBy(x => x.Score)
                .ToListAsync();

            var lifecycleDist = await db.CustomerAnalytics
                .GroupBy(c => c.LifecycleStage)
                .Select(g => new LifecycleStageCountDto(g.Key, g.Key.ToString(), g.Count()))
                .ToListAsync();

            return Results.Ok(new RfmDistributionDto(
                recencyDist,
                frequencyDist,
                monetaryDist,
                lifecycleDist
            ));
        });
    }

    private static void MapCustomerEndpoints(RouteGroupBuilder group)
    {
        group.MapGet("/customers", async (
            CrmDbContext db,
            [AsParameters] CustomerQueryParams queryParams) =>
        {
            var query = db.CustomerAnalytics.AsNoTracking();

            // Apply filters
            if (!string.IsNullOrWhiteSpace(queryParams.Search))
            {
                // Note: In real implementation, would join with Identity to search by name/email
                query = query.Where(c => c.UserId.ToString().Contains(queryParams.Search));
            }

            if (queryParams.LifecycleStage.HasValue)
            {
                query = query.Where(c => c.LifecycleStage == queryParams.LifecycleStage.Value);
            }

            if (queryParams.SegmentId.HasValue)
            {
                var segmentCustomerIds = db.CustomerSegmentAssignments
                    .Where(a => a.SegmentId == queryParams.SegmentId.Value)
                    .Select(a => a.CustomerAnalyticsId);
                query = query.Where(c => segmentCustomerIds.Contains(c.Id));
            }

            if (queryParams.MinRfmScore.HasValue)
            {
                var min = queryParams.MinRfmScore.Value;
                query = query.Where(c =>
                    c.RecencyScore + c.FrequencyScore + c.MonetaryScore >= min);
            }

            if (queryParams.MaxRfmScore.HasValue)
            {
                var max = queryParams.MaxRfmScore.Value;
                query = query.Where(c =>
                    c.RecencyScore + c.FrequencyScore + c.MonetaryScore <= max);
            }

            var total = await query.CountAsync();

            // Apply sorting
            query = queryParams.SortBy?.ToLower() switch
            {
                "totalspent" => queryParams.SortDesc
                    ? query.OrderByDescending(c => c.TotalSpent)
                    : query.OrderBy(c => c.TotalSpent),
                "totalordercount" => queryParams.SortDesc
                    ? query.OrderByDescending(c => c.TotalOrderCount)
                    : query.OrderBy(c => c.TotalOrderCount),
                "lastpurchasedate" => queryParams.SortDesc
                    ? query.OrderByDescending(c => c.LastPurchaseDate)
                    : query.OrderBy(c => c.LastPurchaseDate),
                "rfmscore" => queryParams.SortDesc
                    ? query.OrderByDescending(c => c.RecencyScore + c.FrequencyScore + c.MonetaryScore)
                    : query.OrderBy(c => c.RecencyScore + c.FrequencyScore + c.MonetaryScore),
                _ => queryParams.SortDesc
                    ? query.OrderByDescending(c => c.CreatedAt)
                    : query.OrderBy(c => c.CreatedAt)
            };

            var items = await query
                .Skip(queryParams.Skip)
                .Take(queryParams.PageSize)
                .ToListAsync();

            // Get segments for each customer
            var customerIds = items.Select(c => c.Id).ToList();
            var segmentAssignments = await db.CustomerSegmentAssignments
                .Where(a => customerIds.Contains(a.CustomerAnalyticsId))
                .Include(a => a.Segment)
                .ToListAsync();

            var dtos = items.Select(c =>
            {
                var segments = segmentAssignments
                    .Where(a => a.CustomerAnalyticsId == c.Id)
                    .Select(a => a.Segment.Name)
                    .ToList();

                return new CustomerAnalyticsDto(
                    c.Id,
                    c.UserId,
                    null, // TODO: Get from Identity
                    null, // TODO: Get from Identity
                    c.RecencyScore,
                    c.FrequencyScore,
                    c.MonetaryScore,
                    c.TotalRfmScore,
                    c.TotalOrderCount,
                    c.TotalSpent,
                    c.AverageOrderValue,
                    c.FirstPurchaseDate,
                    c.LastPurchaseDate,
                    c.DaysSinceLastPurchase,
                    c.LifecycleStage,
                    c.LifecycleStage.ToString(),
                    c.CreatedAt,
                    segments
                );
            }).ToList();

            return Results.Ok(new { items = dtos, total, page = queryParams.Page, pageSize = queryParams.PageSize });
        });

        group.MapGet("/customers/{id:guid}", async (
            Guid id,
            CrmDbContext db) =>
        {
            var customer = await db.CustomerAnalytics
                .FirstOrDefaultAsync(c => c.Id == id);

            if (customer == null)
                return Results.NotFound();

            // Get segments
            var segments = await db.CustomerSegmentAssignments
                .Where(a => a.CustomerAnalyticsId == id)
                .Include(a => a.Segment)
                .Select(a => new SegmentDto(
                    a.Segment.Id,
                    a.Segment.Name,
                    a.Segment.Code,
                    a.Segment.Description,
                    a.Segment.Color,
                    a.Segment.IsAutoAssign,
                    a.Segment.SortOrder,
                    a.Segment.CustomerCount,
                    a.Segment.CreatedAt
                ))
                .ToListAsync();

            // Get recent interactions
            var interactions = await db.CustomerInteractions
                .Where(i => i.CustomerAnalyticsId == id)
                .OrderByDescending(i => i.PerformedAt)
                .Take(20)
                .Select(i => new InteractionDto(
                    i.Id,
                    i.Type,
                    i.Type.ToString(),
                    i.Subject,
                    i.Content,
                    i.PerformedByUserName,
                    i.PerformedAt,
                    i.DurationMinutes,
                    i.CallOutcome,
                    i.MeetingLocation,
                    i.FollowUpDate,
                    i.FollowUpNote,
                    i.Sentiment
                ))
                .ToListAsync();

            // Get pending tasks
            var tasks = await db.CustomerTasks
                .Where(t => t.CustomerAnalyticsId == id &&
                    (t.Status == Domain.TaskStatus.Pending || t.Status == Domain.TaskStatus.InProgress))
                .OrderBy(t => t.DueDate)
                .Select(t => new TaskDto(
                    t.Id,
                    t.Title,
                    t.Description,
                    t.Priority,
                    t.Priority.ToString(),
                    t.Status,
                    t.Status.ToString(),
                    t.AssignedToUserId,
                    t.AssignedToUserName,
                    t.DueDate,
                    t.CompletedAt,
                    t.ReminderAt,
                    t.CustomerAnalyticsId,
                    t.LeadId,
                    t.CreatedAt
                ))
                .ToListAsync();

            return Results.Ok(new CustomerDetailDto(
                customer.Id,
                customer.UserId,
                null, // TODO: Get from Identity
                null, // TODO: Get from Identity
                null, // TODO: Get from Identity
                null, // TODO: Get from Identity
                customer.RecencyScore,
                customer.FrequencyScore,
                customer.MonetaryScore,
                customer.TotalRfmScore,
                customer.TotalOrderCount,
                customer.TotalSpent,
                customer.AverageOrderValue,
                customer.FirstPurchaseDate,
                customer.LastPurchaseDate,
                customer.LifecycleStage,
                customer.LifecycleStage.ToString(),
                customer.EmailOpenCount,
                customer.EmailClickCount,
                customer.LastEmailOpenedAt,
                customer.LastInteractionAt,
                customer.InternalNotes,
                segments,
                interactions,
                tasks
            ));
        });

        group.MapPost("/customers/{id:guid}/interactions", async (
            Guid id,
            [FromBody] CreateInteractionDto dto,
            CrmDbContext db,
            ClaimsPrincipal user) =>
        {
            var customer = await db.CustomerAnalytics.FirstOrDefaultAsync(c => c.Id == id);
            if (customer == null)
                return Results.NotFound();

            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());
            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Unknown";

            var interaction = new CustomerInteraction(
                dto.Type,
                dto.Subject,
                userId,
                userName,
                customerAnalyticsId: id);

            if (!string.IsNullOrWhiteSpace(dto.Content))
                interaction.SetContent(dto.Content);

            if (dto.PerformedAt.HasValue)
                interaction.UpdatePerformedAt(dto.PerformedAt.Value);

            if (dto.DurationMinutes.HasValue && dto.Type == InteractionType.Call)
                interaction.SetCallDetails(dto.DurationMinutes.Value, dto.CallOutcome);

            if (dto.DurationMinutes.HasValue && dto.Type == InteractionType.Meeting)
                interaction.SetMeetingDetails(dto.DurationMinutes.Value, dto.MeetingLocation);

            if (dto.FollowUpDate.HasValue)
                interaction.SetFollowUp(dto.FollowUpDate.Value, dto.FollowUpNote);

            if (!string.IsNullOrWhiteSpace(dto.Sentiment))
                interaction.SetSentiment(dto.Sentiment);

            db.CustomerInteractions.Add(interaction);
            await db.SaveChangesAsync();

            return Results.Created($"/api/crm/interactions/{interaction.Id}", new InteractionDto(
                interaction.Id,
                interaction.Type,
                interaction.Type.ToString(),
                interaction.Subject,
                interaction.Content,
                interaction.PerformedByUserName,
                interaction.PerformedAt,
                interaction.DurationMinutes,
                interaction.CallOutcome,
                interaction.MeetingLocation,
                interaction.FollowUpDate,
                interaction.FollowUpNote,
                interaction.Sentiment
            ));
        });

        group.MapPost("/customers/{id:guid}/segments/{segmentId:guid}", async (
            Guid id,
            Guid segmentId,
            ISegmentationService segmentationService,
            ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());
            var result = await segmentationService.AssignCustomerToSegmentAsync(id, segmentId, userId);

            return result ? Results.Ok() : Results.BadRequest("Failed to assign segment");
        });

        group.MapDelete("/customers/{id:guid}/segments/{segmentId:guid}", async (
            Guid id,
            Guid segmentId,
            ISegmentationService segmentationService) =>
        {
            var result = await segmentationService.RemoveCustomerFromSegmentAsync(id, segmentId);
            return result ? Results.Ok() : Results.NotFound();
        });
    }

    private static void MapSegmentEndpoints(RouteGroupBuilder group)
    {
        group.MapGet("/segments", async (ISegmentationService service) =>
        {
            var segments = await service.GetAllSegmentsAsync();
            return Results.Ok(segments.Select(s => new SegmentDto(
                s.Id, s.Name, s.Code, s.Description, s.Color,
                s.IsAutoAssign, s.SortOrder, s.CustomerCount, s.CreatedAt
            )));
        });

        group.MapGet("/segments/{id:guid}", async (Guid id, ISegmentationService service) =>
        {
            var segment = await service.GetSegmentByIdAsync(id);
            if (segment == null)
                return Results.NotFound();

            return Results.Ok(new SegmentDto(
                segment.Id, segment.Name, segment.Code, segment.Description, segment.Color,
                segment.IsAutoAssign, segment.SortOrder, segment.CustomerCount, segment.CreatedAt
            ));
        });

        group.MapPost("/segments", async (
            [FromBody] CreateSegmentDto dto,
            ISegmentationService service) =>
        {
            var segment = await service.CreateSegmentAsync(
                dto.Name, dto.Code, dto.Description, dto.Color, dto.SortOrder);

            return Results.Created($"/api/crm/segments/{segment.Id}", new SegmentDto(
                segment.Id, segment.Name, segment.Code, segment.Description, segment.Color,
                segment.IsAutoAssign, segment.SortOrder, segment.CustomerCount, segment.CreatedAt
            ));
        });

        group.MapPut("/segments/{id:guid}", async (
            Guid id,
            [FromBody] UpdateSegmentDto dto,
            ISegmentationService service) =>
        {
            var segment = await service.UpdateSegmentAsync(id, dto.Name, dto.Description, dto.Color, dto.SortOrder);
            if (segment == null)
                return Results.NotFound();

            return Results.Ok(new SegmentDto(
                segment.Id, segment.Name, segment.Code, segment.Description, segment.Color,
                segment.IsAutoAssign, segment.SortOrder, segment.CustomerCount, segment.CreatedAt
            ));
        });

        group.MapDelete("/segments/{id:guid}", async (Guid id, ISegmentationService service) =>
        {
            var result = await service.DeleteSegmentAsync(id);
            return result ? Results.Ok() : Results.NotFound();
        });

        group.MapPost("/segments/{id:guid}/rules", async (
            Guid id,
            [FromBody] SetSegmentRulesDto dto,
            ISegmentationService service) =>
        {
            var segment = await service.SetSegmentRulesAsync(id, dto.RuleDefinition);
            if (segment == null)
                return Results.NotFound();

            return Results.Ok(new SegmentDto(
                segment.Id, segment.Name, segment.Code, segment.Description, segment.Color,
                segment.IsAutoAssign, segment.SortOrder, segment.CustomerCount, segment.CreatedAt
            ));
        });

        group.MapPost("/segments/run-auto-assignment", async (ISegmentationService service) =>
        {
            var count = await service.RunAutoAssignmentAsync();
            return Results.Ok(new { assignedCount = count });
        });
    }

    private static void MapLeadEndpoints(RouteGroupBuilder group)
    {
        group.MapGet("/leads", async (
            [AsParameters] LeadQueryParams queryParams,
            ILeadManagementService service) =>
        {
            var result = await service.GetLeadsAsync(queryParams);

            var dtos = result.Items.Select(l => new LeadDto(
                l.Id, l.FullName, l.Email, l.Phone, l.Company, l.JobTitle,
                l.Source, l.Source.ToString(), l.Status, l.Status.ToString(),
                l.PipelineStageId, l.PipelineStage?.Name, l.AssignedToUserName,
                l.EstimatedValue, l.NextFollowUpAt, l.IsConverted, l.CreatedAt
            )).ToList();

            return Results.Ok(new { items = dtos, total = result.Total, page = result.Page, pageSize = result.PageSize });
        });

        group.MapGet("/leads/pipeline", async (ILeadManagementService service) =>
        {
            var stages = await service.GetPipelineStagesAsync();
            var leadsByStage = await service.GetLeadsByPipelineAsync();

            var result = stages.Select(s => new
            {
                stage = new PipelineStageDto(
                    s.Id, s.Name, s.Description, s.Color, s.SortOrder,
                    s.WinProbability, s.IsFinalStage, s.IsWonStage,
                    s.LeadCount, s.TotalEstimatedValue
                ),
                leads = leadsByStage.GetValueOrDefault(s.Id, new List<Lead>())
                    .Select(l => new LeadDto(
                        l.Id, l.FullName, l.Email, l.Phone, l.Company, l.JobTitle,
                        l.Source, l.Source.ToString(), l.Status, l.Status.ToString(),
                        l.PipelineStageId, s.Name, l.AssignedToUserName,
                        l.EstimatedValue, l.NextFollowUpAt, l.IsConverted, l.CreatedAt
                    )).ToList()
            });

            return Results.Ok(result);
        });

        group.MapGet("/leads/upcoming-followups", async (
            int? days,
            ILeadManagementService service,
            ClaimsPrincipal user) =>
        {
            var userId = Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : (Guid?)null;
            var leads = await service.GetUpcomingFollowUpsAsync(days ?? 7, userId);

            return Results.Ok(leads.Select(l => new LeadDto(
                l.Id, l.FullName, l.Email, l.Phone, l.Company, l.JobTitle,
                l.Source, l.Source.ToString(), l.Status, l.Status.ToString(),
                l.PipelineStageId, l.PipelineStage?.Name, l.AssignedToUserName,
                l.EstimatedValue, l.NextFollowUpAt, l.IsConverted, l.CreatedAt
            )));
        });

        group.MapGet("/leads/{id:guid}", async (Guid id, ILeadManagementService service) =>
        {
            var lead = await service.GetLeadByIdAsync(id);
            if (lead == null)
                return Results.NotFound();

            var interactions = lead.Interactions.Select(i => new InteractionDto(
                i.Id, i.Type, i.Type.ToString(), i.Subject, i.Content,
                i.PerformedByUserName, i.PerformedAt, i.DurationMinutes,
                i.CallOutcome, i.MeetingLocation, i.FollowUpDate, i.FollowUpNote, i.Sentiment
            )).ToList();

            return Results.Ok(new LeadDetailDto(
                lead.Id, lead.FullName, lead.Email, lead.Phone, lead.Company, lead.JobTitle,
                lead.Source, lead.Source.ToString(), lead.SourceDetail, lead.Status, lead.Status.ToString(),
                lead.PipelineStageId, lead.PipelineStage?.Name, lead.AssignedToUserId, lead.AssignedToUserName,
                lead.EstimatedValue, lead.Currency, lead.NextFollowUpAt, lead.NextFollowUpNote,
                lead.IsConverted, lead.ConvertedCustomerId, lead.ConvertedAt, lead.LossReason,
                lead.Notes, lead.Address, lead.City, lead.District, lead.InterestedProducts,
                interactions, lead.CreatedAt
            ));
        });

        group.MapPost("/leads", async (
            [FromBody] CreateLeadDto dto,
            ILeadManagementService service) =>
        {
            var lead = await service.CreateLeadAsync(dto);

            return Results.Created($"/api/crm/leads/{lead.Id}", new LeadDto(
                lead.Id, lead.FullName, lead.Email, lead.Phone, lead.Company, lead.JobTitle,
                lead.Source, lead.Source.ToString(), lead.Status, lead.Status.ToString(),
                lead.PipelineStageId, null, lead.AssignedToUserName,
                lead.EstimatedValue, lead.NextFollowUpAt, lead.IsConverted, lead.CreatedAt
            ));
        });

        group.MapPut("/leads/{id:guid}", async (
            Guid id,
            [FromBody] UpdateLeadDto dto,
            ILeadManagementService service) =>
        {
            var lead = await service.UpdateLeadAsync(id, dto);
            if (lead == null)
                return Results.NotFound();

            return Results.Ok(new LeadDto(
                lead.Id, lead.FullName, lead.Email, lead.Phone, lead.Company, lead.JobTitle,
                lead.Source, lead.Source.ToString(), lead.Status, lead.Status.ToString(),
                lead.PipelineStageId, null, lead.AssignedToUserName,
                lead.EstimatedValue, lead.NextFollowUpAt, lead.IsConverted, lead.CreatedAt
            ));
        });

        group.MapDelete("/leads/{id:guid}", async (Guid id, ILeadManagementService service) =>
        {
            var result = await service.DeleteLeadAsync(id);
            return result ? Results.Ok() : Results.NotFound();
        });

        group.MapPost("/leads/{id:guid}/assign", async (
            Guid id,
            [FromBody] AssignLeadDto dto,
            ILeadManagementService service) =>
        {
            var lead = await service.AssignLeadAsync(id, dto.UserId, dto.UserName);
            return lead != null ? Results.Ok() : Results.NotFound();
        });

        group.MapPost("/leads/{id:guid}/move-stage", async (
            Guid id,
            [FromBody] MoveLeadStageDto dto,
            ILeadManagementService service) =>
        {
            var lead = await service.MoveToStageAsync(id, dto.StageId);
            return lead != null ? Results.Ok() : Results.NotFound();
        });

        group.MapPost("/leads/{id:guid}/follow-up", async (
            Guid id,
            [FromBody] SetFollowUpDto dto,
            ILeadManagementService service) =>
        {
            var lead = await service.SetFollowUpAsync(id, dto.FollowUpDate, dto.Note);
            return lead != null ? Results.Ok() : Results.NotFound();
        });

        group.MapPost("/leads/{id:guid}/convert", async (
            Guid id,
            [FromBody] ConvertLeadDto dto,
            ILeadManagementService service) =>
        {
            var customerId = await service.ConvertLeadAsync(id, dto.Notes);
            return customerId.HasValue
                ? Results.Ok(new { customerId = customerId.Value })
                : Results.BadRequest("Failed to convert lead");
        });

        group.MapPost("/leads/{id:guid}/mark-lost", async (
            Guid id,
            [FromBody] MarkLeadLostDto dto,
            ILeadManagementService service) =>
        {
            var lead = await service.MarkAsLostAsync(id, dto.Reason);
            return lead != null ? Results.Ok() : Results.NotFound();
        });

        group.MapPost("/leads/{id:guid}/interactions", async (
            Guid id,
            [FromBody] CreateInteractionDto dto,
            ILeadManagementService service,
            ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());
            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Unknown";

            var interaction = await service.AddInteractionAsync(id, dto, userId, userName);

            return Results.Created($"/api/crm/interactions/{interaction.Id}", new InteractionDto(
                interaction.Id, interaction.Type, interaction.Type.ToString(),
                interaction.Subject, interaction.Content, interaction.PerformedByUserName,
                interaction.PerformedAt, interaction.DurationMinutes, interaction.CallOutcome,
                interaction.MeetingLocation, interaction.FollowUpDate, interaction.FollowUpNote,
                interaction.Sentiment
            ));
        });
    }

    private static void MapPipelineEndpoints(RouteGroupBuilder group)
    {
        group.MapGet("/pipeline-stages", async (ILeadManagementService service) =>
        {
            var stages = await service.GetPipelineStagesAsync();
            return Results.Ok(stages.Select(s => new PipelineStageDto(
                s.Id, s.Name, s.Description, s.Color, s.SortOrder,
                s.WinProbability, s.IsFinalStage, s.IsWonStage,
                s.LeadCount, s.TotalEstimatedValue
            )));
        });

        group.MapPost("/pipeline-stages", async (
            [FromBody] CreatePipelineStageDto dto,
            ILeadManagementService service) =>
        {
            var stage = await service.CreatePipelineStageAsync(dto);
            return Results.Created($"/api/crm/pipeline-stages/{stage.Id}", new PipelineStageDto(
                stage.Id, stage.Name, stage.Description, stage.Color, stage.SortOrder,
                stage.WinProbability, stage.IsFinalStage, stage.IsWonStage,
                stage.LeadCount, stage.TotalEstimatedValue
            ));
        });

        group.MapPut("/pipeline-stages/{id:guid}", async (
            Guid id,
            [FromBody] UpdatePipelineStageDto dto,
            ILeadManagementService service) =>
        {
            var stage = await service.UpdatePipelineStageAsync(id, dto);
            if (stage == null)
                return Results.NotFound();

            return Results.Ok(new PipelineStageDto(
                stage.Id, stage.Name, stage.Description, stage.Color, stage.SortOrder,
                stage.WinProbability, stage.IsFinalStage, stage.IsWonStage,
                stage.LeadCount, stage.TotalEstimatedValue
            ));
        });

        group.MapDelete("/pipeline-stages/{id:guid}", async (Guid id, ILeadManagementService service) =>
        {
            var result = await service.DeletePipelineStageAsync(id);
            return result ? Results.Ok() : Results.NotFound();
        });
    }

    private static void MapCampaignEndpoints(RouteGroupBuilder group)
    {
        group.MapGet("/campaigns", async (
            [AsParameters] CampaignQueryParams queryParams,
            IEmailCampaignService service) =>
        {
            var result = await service.GetCampaignsAsync(queryParams);

            var dtos = result.Items.Select(c => new CampaignDto(
                c.Id, c.Name, c.Subject, c.Status, c.Status.ToString(),
                c.TargetSegmentId, c.TargetSegment?.Name, c.ScheduledAt, c.SentAt,
                c.TotalRecipients, c.OpenedCount, c.ClickedCount, c.OpenRate, c.ClickRate,
                c.CreatedAt
            )).ToList();

            return Results.Ok(new { items = dtos, total = result.Total, page = result.Page, pageSize = result.PageSize });
        });

        group.MapGet("/campaigns/{id:guid}", async (Guid id, IEmailCampaignService service) =>
        {
            var campaign = await service.GetCampaignByIdAsync(id);
            if (campaign == null)
                return Results.NotFound();

            return Results.Ok(new CampaignDetailDto(
                campaign.Id, campaign.Name, campaign.Subject, campaign.PreviewText,
                campaign.HtmlContent, campaign.PlainTextContent, campaign.Status, campaign.Status.ToString(),
                campaign.TargetSegmentId, campaign.TargetSegment?.Name, campaign.TargetLifecycleStages,
                campaign.MinRfmScore, campaign.FromEmail, campaign.FromName, campaign.ReplyToEmail,
                campaign.ScheduledAt, campaign.SentAt, campaign.CompletedAt,
                campaign.TotalRecipients, campaign.SentCount, campaign.DeliveredCount,
                campaign.OpenedCount, campaign.ClickedCount, campaign.BouncedCount, campaign.UnsubscribedCount,
                campaign.OpenRate, campaign.ClickRate, campaign.BounceRate, campaign.CreatedAt
            ));
        });

        group.MapPost("/campaigns", async (
            [FromBody] CreateCampaignDto dto,
            IEmailCampaignService service) =>
        {
            var campaign = await service.CreateCampaignAsync(dto);

            return Results.Created($"/api/crm/campaigns/{campaign.Id}", new CampaignDto(
                campaign.Id, campaign.Name, campaign.Subject, campaign.Status, campaign.Status.ToString(),
                campaign.TargetSegmentId, null, campaign.ScheduledAt, campaign.SentAt,
                campaign.TotalRecipients, campaign.OpenedCount, campaign.ClickedCount,
                campaign.OpenRate, campaign.ClickRate, campaign.CreatedAt
            ));
        });

        group.MapPut("/campaigns/{id:guid}", async (
            Guid id,
            [FromBody] UpdateCampaignDto dto,
            IEmailCampaignService service) =>
        {
            var campaign = await service.UpdateCampaignAsync(id, dto);
            if (campaign == null)
                return Results.NotFound();

            return Results.Ok(new CampaignDto(
                campaign.Id, campaign.Name, campaign.Subject, campaign.Status, campaign.Status.ToString(),
                campaign.TargetSegmentId, null, campaign.ScheduledAt, campaign.SentAt,
                campaign.TotalRecipients, campaign.OpenedCount, campaign.ClickedCount,
                campaign.OpenRate, campaign.ClickRate, campaign.CreatedAt
            ));
        });

        group.MapDelete("/campaigns/{id:guid}", async (Guid id, IEmailCampaignService service) =>
        {
            var result = await service.DeleteCampaignAsync(id);
            return result ? Results.Ok() : Results.NotFound();
        });

        group.MapPost("/campaigns/{id:guid}/schedule", async (
            Guid id,
            [FromBody] ScheduleCampaignDto dto,
            IEmailCampaignService service) =>
        {
            var campaign = await service.ScheduleCampaignAsync(id, dto.SendAt);
            return campaign != null ? Results.Ok() : Results.NotFound();
        });

        group.MapPost("/campaigns/{id:guid}/unschedule", async (Guid id, IEmailCampaignService service) =>
        {
            var campaign = await service.UnscheduleCampaignAsync(id);
            return campaign != null ? Results.Ok() : Results.NotFound();
        });

        group.MapPost("/campaigns/{id:guid}/send", async (Guid id, IEmailCampaignService service) =>
        {
            var campaign = await service.SendCampaignAsync(id);
            return campaign != null ? Results.Ok() : Results.BadRequest("Failed to send campaign");
        });

        group.MapPost("/campaigns/{id:guid}/pause", async (Guid id, IEmailCampaignService service) =>
        {
            var campaign = await service.PauseCampaignAsync(id);
            return campaign != null ? Results.Ok() : Results.NotFound();
        });

        group.MapPost("/campaigns/{id:guid}/resume", async (Guid id, IEmailCampaignService service) =>
        {
            var campaign = await service.ResumeCampaignAsync(id);
            return campaign != null ? Results.Ok() : Results.NotFound();
        });

        group.MapGet("/campaigns/{id:guid}/preview", async (
            Guid id,
            Guid? customerAnalyticsId,
            IEmailCampaignService service) =>
        {
            var html = await service.PreviewEmailAsync(id, customerAnalyticsId);
            return Results.Content(html, "text/html");
        });

        group.MapGet("/campaigns/{id:guid}/recipients", async (
            Guid id,
            int page,
            int pageSize,
            IEmailCampaignService service) =>
        {
            var recipients = await service.GetCampaignRecipientsAsync(id, page, pageSize);
            return Results.Ok(recipients);
        });
    }

    private static void MapTaskEndpoints(RouteGroupBuilder group)
    {
        group.MapGet("/tasks", async (
            CrmDbContext db,
            Guid? customerId,
            Guid? leadId,
            Guid? assignedToUserId,
            Domain.TaskStatus? status,
            int page = 1,
            int pageSize = 20) =>
        {
            var query = db.CustomerTasks.AsNoTracking().AsQueryable();

            if (customerId.HasValue)
                query = query.Where(t => t.CustomerAnalyticsId == customerId.Value);

            if (leadId.HasValue)
                query = query.Where(t => t.LeadId == leadId.Value);

            if (assignedToUserId.HasValue)
                query = query.Where(t => t.AssignedToUserId == assignedToUserId.Value);

            if (status.HasValue)
                query = query.Where(t => t.Status == status.Value);

            var total = await query.CountAsync();

            var items = await query
                .OrderBy(t => t.DueDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new TaskDto(
                    t.Id, t.Title, t.Description, t.Priority, t.Priority.ToString(),
                    t.Status, t.Status.ToString(), t.AssignedToUserId, t.AssignedToUserName,
                    t.DueDate, t.CompletedAt, t.ReminderAt,
                    t.CustomerAnalyticsId, t.LeadId, t.CreatedAt
                ))
                .ToListAsync();

            return Results.Ok(new { items, total, page, pageSize });
        });

        group.MapPost("/tasks", async (
            [FromBody] CreateTaskDto dto,
            CrmDbContext db,
            Guid? customerId,
            Guid? leadId) =>
        {
            var task = new CustomerTask(dto.Title, customerId, leadId);
            task.Update(dto.Title, dto.Description, dto.Priority, dto.DueDate);

            if (dto.AssignedToUserId.HasValue)
                task.AssignTo(dto.AssignedToUserId.Value, dto.AssignedToUserName ?? "Unknown");

            if (dto.ReminderAt.HasValue)
                task.SetReminder(dto.ReminderAt.Value);

            db.CustomerTasks.Add(task);
            await db.SaveChangesAsync();

            return Results.Created($"/api/crm/tasks/{task.Id}", new TaskDto(
                task.Id, task.Title, task.Description, task.Priority, task.Priority.ToString(),
                task.Status, task.Status.ToString(), task.AssignedToUserId, task.AssignedToUserName,
                task.DueDate, task.CompletedAt, task.ReminderAt,
                task.CustomerAnalyticsId, task.LeadId, task.CreatedAt
            ));
        });

        group.MapPut("/tasks/{id:guid}", async (
            Guid id,
            [FromBody] UpdateTaskDto dto,
            CrmDbContext db) =>
        {
            var task = await db.CustomerTasks.FirstOrDefaultAsync(t => t.Id == id);
            if (task == null)
                return Results.NotFound();

            task.Update(dto.Title, dto.Description, dto.Priority, dto.DueDate);
            await db.SaveChangesAsync();

            return Results.Ok(new TaskDto(
                task.Id, task.Title, task.Description, task.Priority, task.Priority.ToString(),
                task.Status, task.Status.ToString(), task.AssignedToUserId, task.AssignedToUserName,
                task.DueDate, task.CompletedAt, task.ReminderAt,
                task.CustomerAnalyticsId, task.LeadId, task.CreatedAt
            ));
        });

        group.MapPost("/tasks/{id:guid}/complete", async (
            Guid id,
            CrmDbContext db,
            ClaimsPrincipal user) =>
        {
            var task = await db.CustomerTasks.FirstOrDefaultAsync(t => t.Id == id);
            if (task == null)
                return Results.NotFound();

            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());
            task.Complete(userId);
            await db.SaveChangesAsync();

            return Results.Ok();
        });

        group.MapPost("/tasks/{id:guid}/cancel", async (Guid id, CrmDbContext db) =>
        {
            var task = await db.CustomerTasks.FirstOrDefaultAsync(t => t.Id == id);
            if (task == null)
                return Results.NotFound();

            task.Cancel();
            await db.SaveChangesAsync();

            return Results.Ok();
        });

        group.MapDelete("/tasks/{id:guid}", async (Guid id, CrmDbContext db) =>
        {
            var task = await db.CustomerTasks.FirstOrDefaultAsync(t => t.Id == id);
            if (task == null)
                return Results.NotFound();

            task.IsActive = false;
            await db.SaveChangesAsync();

            return Results.Ok();
        });
    }

    private static void MapTrackingEndpoints(IEndpointRouteBuilder app)
    {
        // Public tracking endpoints (no auth required)
        app.MapGet("/api/crm/track/open/{trackingId}", async (
            string trackingId,
            IEmailCampaignService service,
            HttpContext context) =>
        {
            var userAgent = context.Request.Headers.UserAgent.ToString();
            var ip = context.Connection.RemoteIpAddress?.ToString();

            await service.TrackOpenAsync(trackingId, userAgent, ip);

            // Return 1x1 transparent GIF
            var gif = Convert.FromBase64String("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
            return Results.File(gif, "image/gif");
        });

        app.MapGet("/api/crm/track/click/{trackingId}", async (
            string trackingId,
            string url,
            IEmailCampaignService service,
            HttpContext context) =>
        {
            var userAgent = context.Request.Headers.UserAgent.ToString();
            var ip = context.Connection.RemoteIpAddress?.ToString();

            await service.TrackClickAsync(trackingId, url, userAgent, ip);

            return Results.Redirect(url);
        });

        app.MapGet("/api/crm/unsubscribe/{trackingId}", async (
            string trackingId,
            IEmailCampaignService service) =>
        {
            await service.ProcessUnsubscribeAsync(trackingId);
            return Results.Content("<html><body><h1>Bạn đã hủy đăng ký thành công</h1></body></html>", "text/html");
        });
    }
}
