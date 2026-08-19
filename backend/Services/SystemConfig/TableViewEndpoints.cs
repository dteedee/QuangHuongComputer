using System.Text.Json;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Domain;
using SystemConfig.Infrastructure;

namespace SystemConfig;

/// <summary>
/// CRUD cho cấu hình bảng dữ liệu động (data-grid) dùng ở admin. FE fetch theo Key,
/// render cột từ ColumnsJson thay vì hard-code — cho phép tuỳ biến cột hiển thị/ẩn/thứ tự
/// mà không cần deploy lại.
/// </summary>
public static class TableViewEndpoints
{
    public static void MapTableViewEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/config/table-views")
            .RequireAuthorization(policy => policy.RequireRole("Admin"));

        // GET /api/config/table-views
        group.MapGet("/", async (bool? activeOnly, SystemConfigDbContext db) =>
        {
            var query = db.TableViewDefinitions.AsQueryable();
            if (activeOnly != false)
                query = query.Where(t => t.IsActive);

            var items = await query.OrderBy(t => t.Key).AsNoTracking().ToListAsync();
            return Results.Ok(items);
        });

        // GET /api/config/table-views/by-key/{key} — used by FE dynamic-data-table.tsx
        group.MapGet("/by-key/{key}", async (string key, SystemConfigDbContext db) =>
        {
            var item = await db.TableViewDefinitions.AsNoTracking()
                .FirstOrDefaultAsync(t => t.Key == key && t.IsActive);
            return item is null ? Results.NotFound() : Results.Ok(item);
        });

        // GET /api/config/table-views/{id}
        group.MapGet("/{id:guid}", async (Guid id, SystemConfigDbContext db) =>
        {
            var item = await db.TableViewDefinitions.FindAsync(id);
            return item is null ? Results.NotFound() : Results.Ok(item);
        });

        // POST /api/config/table-views
        group.MapPost("/", async (CreateTableViewDto dto, SystemConfigDbContext db) =>
        {
            var jsonError = ValidateJson(dto.ColumnsJson, dto.FiltersJson);
            if (jsonError is not null) return Results.BadRequest(new { error = jsonError });

            var duplicate = await db.TableViewDefinitions.AnyAsync(t => t.Key == dto.Key);
            if (duplicate)
                return Results.BadRequest(new { error = $"Table view key '{dto.Key}' already exists" });

            var item = new TableViewDefinition
            {
                Key = dto.Key.Trim(),
                Name = dto.Name.Trim(),
                ColumnsJson = dto.ColumnsJson,
                FiltersJson = dto.FiltersJson,
                IsSystem = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            db.TableViewDefinitions.Add(item);
            await db.SaveChangesAsync();
            return Results.Created($"/api/config/table-views/{item.Id}", item);
        }).WithValidation<CreateTableViewDto>();

        // PUT /api/config/table-views/{id}
        group.MapPut("/{id:guid}", async (Guid id, UpdateTableViewDto dto, SystemConfigDbContext db) =>
        {
            var item = await db.TableViewDefinitions.FindAsync(id);
            if (item is null) return Results.NotFound();

            var jsonError = ValidateJson(dto.ColumnsJson, dto.FiltersJson);
            if (jsonError is not null) return Results.BadRequest(new { error = jsonError });

            if (!string.IsNullOrWhiteSpace(dto.Name)) item.Name = dto.Name.Trim();
            if (dto.ColumnsJson is not null) item.ColumnsJson = dto.ColumnsJson;
            if (dto.FiltersJson is not null) item.FiltersJson = dto.FiltersJson;
            if (dto.IsActive.HasValue) item.IsActive = dto.IsActive.Value;
            item.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(item);
        });

        // DELETE /api/config/table-views/{id} — soft delete; system-seeded defs are protected
        group.MapDelete("/{id:guid}", async (Guid id, SystemConfigDbContext db) =>
        {
            var item = await db.TableViewDefinitions.FindAsync(id);
            if (item is null) return Results.NotFound();
            if (item.IsSystem)
                return Results.BadRequest(new { error = "Không thể xoá cấu hình bảng mặc định của hệ thống" });

            item.IsActive = false;
            item.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static string? ValidateJson(string? columnsJson, string? filtersJson)
    {
        if (columnsJson is not null)
        {
            try { JsonDocument.Parse(columnsJson); }
            catch { return "ColumnsJson phải là JSON hợp lệ"; }
        }
        if (!string.IsNullOrWhiteSpace(filtersJson))
        {
            try { JsonDocument.Parse(filtersJson); }
            catch { return "FiltersJson phải là JSON hợp lệ"; }
        }
        return null;
    }
}

public record CreateTableViewDto(
    string Key,
    string Name,
    string ColumnsJson,
    string? FiltersJson = null
);

public record UpdateTableViewDto(
    string? Name = null,
    string? ColumnsJson = null,
    string? FiltersJson = null,
    bool? IsActive = null
);
