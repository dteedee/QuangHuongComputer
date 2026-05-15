using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Infrastructure;
using SystemConfig.Domain;

namespace SystemConfig;

public static class CustomFieldEndpoints
{
    private static readonly string[] SupportedEntityTypes =
        ["Product", "Customer", "Order", "Lead", "RepairJob"];

    private static readonly string[] SupportedFieldTypes =
        ["text", "number", "boolean", "date", "select", "multiselect", "url", "email"];

    public static void MapCustomFieldEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/config/custom-fields")
            .RequireAuthorization(policy => policy.RequireRole("Admin"));

        // GET /api/config/custom-fields/entity-types
        group.MapGet("/entity-types", () =>
            Results.Ok(SupportedEntityTypes));

        // GET /api/config/custom-fields?entityType={type}
        group.MapGet("/", async (string? entityType, bool? activeOnly, CustomFieldDbContext db) =>
        {
            var query = db.CustomFieldDefinitions.AsQueryable();

            if (!string.IsNullOrWhiteSpace(entityType))
                query = query.Where(f => f.EntityType == entityType);

            if (activeOnly != false)
                query = query.Where(f => f.IsActive);

            var definitions = await query
                .OrderBy(f => f.EntityType)
                .ThenBy(f => f.DisplayOrder)
                .ThenBy(f => f.Label)
                .AsNoTracking()
                .ToListAsync();

            return Results.Ok(definitions);
        });

        // GET /api/config/custom-fields/{id}
        group.MapGet("/{id:guid}", async (Guid id, CustomFieldDbContext db) =>
        {
            var def = await db.CustomFieldDefinitions.FindAsync(id);
            return def is null ? Results.NotFound() : Results.Ok(def);
        });

        // POST /api/config/custom-fields
        group.MapPost("/", async (CreateCustomFieldDto dto, CustomFieldDbContext db) =>
        {
            var validation = ValidateDto(dto.EntityType, dto.FieldKey, dto.Label, dto.FieldType);
            if (validation is not null) return validation;

            var duplicate = await db.CustomFieldDefinitions.AnyAsync(
                f => f.EntityType == dto.EntityType && f.FieldKey == dto.FieldKey);
            if (duplicate)
                return Results.BadRequest(new { error = $"Field key '{dto.FieldKey}' already exists for entity '{dto.EntityType}'" });

            var definition = new CustomFieldDefinition
            {
                EntityType = dto.EntityType,
                FieldKey = dto.FieldKey.Trim().ToLowerInvariant().Replace(' ', '_'),
                Label = dto.Label.Trim(),
                FieldType = dto.FieldType,
                OptionsJson = dto.OptionsJson,
                DefaultValue = dto.DefaultValue,
                IsRequired = dto.IsRequired,
                IsVisibleInList = dto.IsVisibleInList,
                IsFilterable = dto.IsFilterable,
                IsPublic = dto.IsPublic,
                DisplayOrder = dto.DisplayOrder,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            db.CustomFieldDefinitions.Add(definition);
            await db.SaveChangesAsync();
            return Results.Created($"/api/config/custom-fields/{definition.Id}", definition);
        });

        // PUT /api/config/custom-fields/{id}
        group.MapPut("/{id:guid}", async (Guid id, UpdateCustomFieldDto dto, CustomFieldDbContext db) =>
        {
            var definition = await db.CustomFieldDefinitions.FindAsync(id);
            if (definition is null) return Results.NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Label))
                definition.Label = dto.Label.Trim();

            if (!string.IsNullOrWhiteSpace(dto.FieldType))
            {
                if (!SupportedFieldTypes.Contains(dto.FieldType))
                    return Results.BadRequest(new { error = $"Unsupported field type '{dto.FieldType}'" });
                definition.FieldType = dto.FieldType;
            }

            if (dto.OptionsJson is not null) definition.OptionsJson = dto.OptionsJson;
            if (dto.DefaultValue is not null) definition.DefaultValue = dto.DefaultValue;
            if (dto.IsRequired.HasValue) definition.IsRequired = dto.IsRequired.Value;
            if (dto.IsVisibleInList.HasValue) definition.IsVisibleInList = dto.IsVisibleInList.Value;
            if (dto.IsFilterable.HasValue) definition.IsFilterable = dto.IsFilterable.Value;
            if (dto.IsPublic.HasValue) definition.IsPublic = dto.IsPublic.Value;
            if (dto.DisplayOrder.HasValue) definition.DisplayOrder = dto.DisplayOrder.Value;
            if (dto.IsActive.HasValue) definition.IsActive = dto.IsActive.Value;
            definition.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(definition);
        });

        // DELETE /api/config/custom-fields/{id} (soft delete)
        group.MapDelete("/{id:guid}", async (Guid id, CustomFieldDbContext db) =>
        {
            var definition = await db.CustomFieldDefinitions.FindAsync(id);
            if (definition is null) return Results.NotFound();

            definition.IsActive = false;
            definition.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // PUT /api/config/custom-fields/reorder — batch update display order
        group.MapPut("/reorder", async (List<ReorderCustomFieldDto> items, CustomFieldDbContext db) =>
        {
            if (items is null || items.Count == 0)
                return Results.BadRequest(new { error = "Items list is empty" });

            var ids = items.Select(i => i.Id).ToList();
            var definitions = await db.CustomFieldDefinitions
                .Where(f => ids.Contains(f.Id))
                .ToListAsync();

            foreach (var item in items)
            {
                var def = definitions.FirstOrDefault(d => d.Id == item.Id);
                if (def is not null)
                {
                    def.DisplayOrder = item.DisplayOrder;
                    def.UpdatedAt = DateTime.UtcNow;
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { updated = definitions.Count });
        });
    }

    private static IResult? ValidateDto(string entityType, string fieldKey, string label, string fieldType)
    {
        if (!SupportedEntityTypes.Contains(entityType))
            return Results.BadRequest(new { error = $"Unsupported entity type '{entityType}'. Supported: {string.Join(", ", SupportedEntityTypes)}" });

        if (string.IsNullOrWhiteSpace(fieldKey) || fieldKey.Length > 100)
            return Results.BadRequest(new { error = "Field key must be 1-100 characters" });

        if (string.IsNullOrWhiteSpace(label) || label.Length > 150)
            return Results.BadRequest(new { error = "Label must be 1-150 characters" });

        if (!SupportedFieldTypes.Contains(fieldType))
            return Results.BadRequest(new { error = $"Unsupported field type '{fieldType}'. Supported: {string.Join(", ", SupportedFieldTypes)}" });

        return null;
    }
}

// DTOs
public record CreateCustomFieldDto(
    string EntityType,
    string FieldKey,
    string Label,
    string FieldType,
    string? OptionsJson = null,
    string? DefaultValue = null,
    bool IsRequired = false,
    bool IsVisibleInList = false,
    bool IsFilterable = false,
    bool IsPublic = false,
    int DisplayOrder = 0
);

public record UpdateCustomFieldDto(
    string? Label = null,
    string? FieldType = null,
    string? OptionsJson = null,
    string? DefaultValue = null,
    bool? IsRequired = null,
    bool? IsVisibleInList = null,
    bool? IsFilterable = null,
    bool? IsPublic = null,
    int? DisplayOrder = null,
    bool? IsActive = null
);

public record ReorderCustomFieldDto(Guid Id, int DisplayOrder);
