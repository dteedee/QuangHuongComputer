using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Infrastructure;
using SystemConfig.Domain;

namespace SystemConfig;

public static class FormDefinitionEndpoints
{
    public static void MapFormDefinitionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/config/forms")
            .RequireAuthorization(policy => policy.RequireRole("Admin"));

        // GET /api/config/forms
        group.MapGet("/", async (string? entityType, bool? activeOnly, CustomFieldDbContext db) =>
        {
            var query = db.FormDefinitions.AsQueryable();

            if (!string.IsNullOrWhiteSpace(entityType))
                query = query.Where(f => f.EntityType == entityType);

            if (activeOnly != false)
                query = query.Where(f => f.IsActive);

            var forms = await query
                .OrderBy(f => f.Name)
                .AsNoTracking()
                .ToListAsync();

            return Results.Ok(forms);
        });

        // GET /api/config/forms/{id}
        group.MapGet("/{id:guid}", async (Guid id, CustomFieldDbContext db) =>
        {
            var form = await db.FormDefinitions.FindAsync(id);
            return form is null ? Results.NotFound() : Results.Ok(form);
        });

        // POST /api/config/forms
        group.MapPost("/", async (CreateFormDefinitionDto dto, CustomFieldDbContext db) =>
        {
            var validation = ValidateDto(dto.Code, dto.Name);
            if (validation is not null) return validation;

            var duplicate = await db.FormDefinitions.AnyAsync(f => f.Code == dto.Code);
            if (duplicate)
                return Results.BadRequest(new { error = $"Form code '{dto.Code}' already exists" });

            var form = new FormDefinition
            {
                Code = dto.Code.Trim().ToLowerInvariant().Replace(' ', '_'),
                Name = dto.Name.Trim(),
                Description = dto.Description?.Trim(),
                EntityType = dto.EntityType?.Trim(),
                FieldsSchema = dto.FieldsSchema ?? "[]",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            db.FormDefinitions.Add(form);
            await db.SaveChangesAsync();
            return Results.Created($"/api/config/forms/{form.Id}", form);
        });

        // PUT /api/config/forms/{id}
        group.MapPut("/{id:guid}", async (Guid id, UpdateFormDefinitionDto dto, CustomFieldDbContext db) =>
        {
            var form = await db.FormDefinitions.FindAsync(id);
            if (form is null) return Results.NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Name))
                form.Name = dto.Name.Trim();

            if (dto.Description is not null) form.Description = dto.Description.Trim();
            if (dto.EntityType is not null) form.EntityType = dto.EntityType.Trim();
            if (dto.FieldsSchema is not null) form.FieldsSchema = dto.FieldsSchema;
            if (dto.IsActive.HasValue) form.IsActive = dto.IsActive.Value;
            form.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(form);
        });

        // DELETE /api/config/forms/{id} (soft delete)
        group.MapDelete("/{id:guid}", async (Guid id, CustomFieldDbContext db) =>
        {
            var form = await db.FormDefinitions.FindAsync(id);
            if (form is null) return Results.NotFound();

            form.IsActive = false;
            form.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static IResult? ValidateDto(string code, string name)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Length > 50)
            return Results.BadRequest(new { error = "Code must be 1-50 characters" });

        if (string.IsNullOrWhiteSpace(name) || name.Length > 200)
            return Results.BadRequest(new { error = "Name must be 1-200 characters" });

        return null;
    }
}

public record CreateFormDefinitionDto(
    string Code,
    string Name,
    string? Description = null,
    string? EntityType = null,
    string? FieldsSchema = null
);

public record UpdateFormDefinitionDto(
    string? Name = null,
    string? Description = null,
    string? EntityType = null,
    string? FieldsSchema = null,
    bool? IsActive = null
);
