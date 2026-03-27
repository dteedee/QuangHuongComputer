using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using CRM.Infrastructure;
using CRM.Domain;

namespace CRM.API;

public static class AutomationRuleEndpoints
{
    public static void MapAutomationRuleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/crm/automation-rules").RequireAuthorization("AdminOnly");

        group.MapGet("/", async (CrmDbContext db) =>
        {
            var rules = await db.AutomationRules
                .AsNoTracking()
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Results.Ok(rules);
        });

        group.MapGet("/{id:guid}", async (Guid id, CrmDbContext db) =>
        {
            var rule = await db.AutomationRules.FirstOrDefaultAsync(r => r.Id == id);
            return rule != null ? Results.Ok(rule) : Results.NotFound();
        });

        group.MapPost("/", async (CreateAutomationRuleRequest request, CrmDbContext db) =>
        {
            var rule = new AutomationRule(
                request.Name,
                request.Description ?? "",
                request.Trigger,
                request.TriggerDelayMinutes,
                request.Action,
                request.ActionTemplateId,
                request.ParameterJson
            );

            db.AutomationRules.Add(rule);
            await db.SaveChangesAsync();

            return Results.Created($"/api/crm/automation-rules/{rule.Id}", rule);
        });

        group.MapPut("/{id:guid}", async (Guid id, UpdateAutomationRuleRequest request, CrmDbContext db) =>
        {
            var rule = await db.AutomationRules.FirstOrDefaultAsync(r => r.Id == id);
            if (rule == null) return Results.NotFound();

            rule.UpdateDetails(
                request.Name,
                request.Description ?? "",
                request.Trigger,
                request.TriggerDelayMinutes,
                request.Action,
                request.ActionTemplateId,
                request.ParameterJson
            );

            if (request.IsActive) rule.Activate();
            else rule.Deactivate();

            await db.SaveChangesAsync();
            return Results.Ok(rule);
        });

        group.MapDelete("/{id:guid}", async (Guid id, CrmDbContext db) =>
        {
            var rule = await db.AutomationRules.FirstOrDefaultAsync(r => r.Id == id);
            if (rule == null) return Results.NotFound();

            rule.Deactivate();
            await db.SaveChangesAsync();
            return Results.Ok(new { Success = true });
        });
        
        group.MapPost("/{id:guid}/toggle", async (Guid id, CrmDbContext db) =>
        {
            var rule = await db.AutomationRules.FirstOrDefaultAsync(r => r.Id == id);
            if (rule == null) return Results.NotFound();

            if (rule.IsActive) rule.Deactivate();
            else rule.Activate();

            await db.SaveChangesAsync();
            return Results.Ok(new { rule.Id, rule.IsActive });
        });
    }
}

public record CreateAutomationRuleRequest(
    string Name,
    string? Description,
    AutomationTrigger Trigger,
    int TriggerDelayMinutes,
    AutomationAction Action,
    string? ActionTemplateId,
    string? ParameterJson);

public record UpdateAutomationRuleRequest(
    string Name,
    string? Description,
    AutomationTrigger Trigger,
    int TriggerDelayMinutes,
    AutomationAction Action,
    string? ActionTemplateId,
    string? ParameterJson,
    bool IsActive);
