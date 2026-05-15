using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Infrastructure;
using SystemConfig.Domain;
using System.Text.Json;

namespace SystemConfig;

public static class AutomationRuleEndpoints
{
    private static readonly string[] ValidTriggerEvents =
        ["created", "updated", "status_changed", "field_changed"];

    private static readonly string[] ValidActionTypes =
        ["send_notification", "create_entity", "update_field", "send_email"];

    public static void MapAutomationRuleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/config/automation-rules")
            .RequireAuthorization(policy => policy.RequireRole("Admin"));

        // GET /api/config/automation-rules?entityType=Lead&activeOnly=true
        group.MapGet("/", async (string? entityType, bool? activeOnly, CustomFieldDbContext db) =>
        {
            var query = db.AutomationRules.AsQueryable();

            if (!string.IsNullOrWhiteSpace(entityType))
                query = query.Where(r => r.EntityType == entityType);

            if (activeOnly != false)
                query = query.Where(r => r.IsActive);

            var rules = await query
                .OrderBy(r => r.EntityType)
                .ThenBy(r => r.ExecutionOrder)
                .ThenBy(r => r.Name)
                .AsNoTracking()
                .ToListAsync();

            return Results.Ok(rules);
        });

        // GET /api/config/automation-rules/{id}
        group.MapGet("/{id:guid}", async (Guid id, CustomFieldDbContext db) =>
        {
            var rule = await db.AutomationRules.FindAsync(id);
            return rule is null ? Results.NotFound() : Results.Ok(rule);
        });

        // POST /api/config/automation-rules
        group.MapPost("/", async (CreateAutomationRuleDto dto, CustomFieldDbContext db) =>
        {
            var validation = ValidateDto(dto.Name, dto.EntityType, dto.TriggerEvent, dto.ActionType);
            if (validation is not null) return validation;
            if (!IsValidJson(dto.ConditionJson) || !IsValidJson(dto.ActionConfig))
                return Results.BadRequest(new { error = "ConditionJson/ActionConfig phải là JSON hợp lệ" });

            var rule = new AutomationRule
            {
                Name = dto.Name.Trim(),
                EntityType = dto.EntityType.Trim(),
                TriggerEvent = dto.TriggerEvent,
                TriggerField = dto.TriggerField?.Trim(),
                ConditionJson = dto.ConditionJson ?? "{}",
                ActionType = dto.ActionType,
                ActionConfig = dto.ActionConfig ?? "{}",
                ExecutionOrder = dto.ExecutionOrder,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            db.AutomationRules.Add(rule);
            await db.SaveChangesAsync();
            return Results.Created($"/api/config/automation-rules/{rule.Id}", rule);
        });

        // PUT /api/config/automation-rules/{id}
        group.MapPut("/{id:guid}", async (Guid id, UpdateAutomationRuleDto dto, CustomFieldDbContext db) =>
        {
            var rule = await db.AutomationRules.FindAsync(id);
            if (rule is null) return Results.NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Name)) rule.Name = dto.Name.Trim();
            if (!string.IsNullOrWhiteSpace(dto.EntityType)) rule.EntityType = dto.EntityType.Trim();

            if (!string.IsNullOrWhiteSpace(dto.TriggerEvent))
            {
                if (!ValidTriggerEvents.Contains(dto.TriggerEvent))
                    return Results.BadRequest(new { error = $"Invalid trigger event '{dto.TriggerEvent}'" });
                rule.TriggerEvent = dto.TriggerEvent;
            }

            if (!string.IsNullOrWhiteSpace(dto.ActionType))
            {
                if (!ValidActionTypes.Contains(dto.ActionType))
                    return Results.BadRequest(new { error = $"Invalid action type '{dto.ActionType}'" });
                rule.ActionType = dto.ActionType;
            }

            if (dto.TriggerField is not null) rule.TriggerField = dto.TriggerField.Trim();
            if (dto.ConditionJson is not null) rule.ConditionJson = dto.ConditionJson;
            if (dto.ActionConfig is not null) rule.ActionConfig = dto.ActionConfig;
            if (dto.ExecutionOrder.HasValue) rule.ExecutionOrder = dto.ExecutionOrder.Value;
            if (dto.IsActive.HasValue) rule.IsActive = dto.IsActive.Value;

            await db.SaveChangesAsync();
            return Results.Ok(rule);
        });

        // DELETE /api/config/automation-rules/{id} (soft delete)
        group.MapDelete("/{id:guid}", async (Guid id, CustomFieldDbContext db) =>
        {
            var rule = await db.AutomationRules.FindAsync(id);
            if (rule is null) return Results.NotFound();

            rule.IsActive = false;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static IResult? ValidateDto(string name, string entityType, string triggerEvent, string actionType)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Length > 200)
            return Results.BadRequest(new { error = "Name must be 1-200 characters" });

        if (string.IsNullOrWhiteSpace(entityType) || entityType.Length > 50)
            return Results.BadRequest(new { error = "EntityType must be 1-50 characters" });

        if (!ValidTriggerEvents.Contains(triggerEvent))
            return Results.BadRequest(new { error = $"Invalid trigger event '{triggerEvent}'. Valid: {string.Join(", ", ValidTriggerEvents)}" });

        if (!ValidActionTypes.Contains(actionType))
            return Results.BadRequest(new { error = $"Invalid action type '{actionType}'. Valid: {string.Join(", ", ValidActionTypes)}" });

        return null;
    }

    private static bool IsValidJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return true;
        try { JsonDocument.Parse(json); return true; }
        catch { return false; }
    }
}

public record CreateAutomationRuleDto(
    string Name,
    string EntityType,
    string TriggerEvent,
    string ActionType,
    string? TriggerField = null,
    string? ConditionJson = null,
    string? ActionConfig = null,
    int ExecutionOrder = 0
);

public record UpdateAutomationRuleDto(
    string? Name = null,
    string? EntityType = null,
    string? TriggerEvent = null,
    string? TriggerField = null,
    string? ConditionJson = null,
    string? ActionType = null,
    string? ActionConfig = null,
    int? ExecutionOrder = null,
    bool? IsActive = null
);
