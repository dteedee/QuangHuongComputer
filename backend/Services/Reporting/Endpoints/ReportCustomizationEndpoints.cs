using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Infrastructure;
using SystemConfig.Domain;

namespace Reporting.Endpoints;

public static class ReportCustomizationEndpoints
{
    public static void MapReportCustomizationEndpoints(this IEndpointRouteBuilder group)
    {
        // ── Report Definitions ──────────────────────────────────────────────
        group.MapGet("/definitions", async (SystemConfigDbContext db) =>
        {
            var defs = await db.ReportDefinitions
                .Where(r => r.IsActive)
                .OrderBy(r => r.DisplayOrder)
                .Select(r => new
                {
                    r.Id,
                    r.Code,
                    r.Name,
                    r.Description,
                    r.Category,
                    r.DataSourceEndpoint,
                    r.AvailableColumns,
                    r.AvailableFilters,
                    r.DefaultSortColumn,
                    r.DefaultSortDirection,
                    r.DisplayOrder
                })
                .ToListAsync();
            return Results.Ok(defs);
        });

        group.MapGet("/definitions/{code}", async (string code, SystemConfigDbContext db) =>
        {
            var def = await db.ReportDefinitions
                .Where(r => r.Code == code && r.IsActive)
                .Select(r => new
                {
                    r.Id,
                    r.Code,
                    r.Name,
                    r.Description,
                    r.Category,
                    r.DataSourceEndpoint,
                    r.AvailableColumns,
                    r.AvailableFilters,
                    r.DefaultSortColumn,
                    r.DefaultSortDirection,
                    r.AllowedRoles,
                    r.DisplayOrder
                })
                .FirstOrDefaultAsync();

            return def is null ? Results.NotFound() : Results.Ok(def);
        });

        group.MapPost("/definitions", async (CreateReportDefinitionRequest req, SystemConfigDbContext db) =>
        {
            if (await db.ReportDefinitions.AnyAsync(r => r.Code == req.Code))
                return Results.Conflict(new { message = "Report code already exists" });

            var def = new ReportDefinition
            {
                Code = req.Code,
                Name = req.Name,
                Description = req.Description,
                Category = req.Category,
                DataSourceEndpoint = req.DataSourceEndpoint,
                AvailableColumns = req.AvailableColumns ?? "[]",
                AvailableFilters = req.AvailableFilters ?? "[]",
                DefaultSortColumn = req.DefaultSortColumn,
                DefaultSortDirection = req.DefaultSortDirection ?? "desc",
                DisplayOrder = req.DisplayOrder
            };

            db.ReportDefinitions.Add(def);
            await db.SaveChangesAsync();
            return Results.Created($"/api/reports/definitions/{def.Code}", new { def.Id, def.Code });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // ── Saved Presets ────────────────────────────────────────────────────
        group.MapGet("/{code}/presets", async (
            string code,
            HttpContext http,
            SystemConfigDbContext db) =>
        {
            var def = await db.ReportDefinitions.FirstOrDefaultAsync(r => r.Code == code);
            if (def is null) return Results.NotFound();

            var userIdClaim = http.User.FindFirst("sub")?.Value
                ?? http.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

            var query = db.SavedReportPresets
                .Where(p => p.ReportDefinitionId == def.Id)
                .Where(p => p.IsShared || (userIdClaim != null && p.UserId.ToString() == userIdClaim));

            var presets = await query
                .OrderBy(p => p.IsDefault ? 0 : 1)
                .ThenBy(p => p.Name)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.VisibleColumns,
                    p.ColumnOrder,
                    p.FilterValues,
                    p.SortColumn,
                    p.SortDirection,
                    p.IsDefault,
                    p.IsShared,
                    p.CreatedAt,
                    p.UpdatedAt,
                    IsOwn = userIdClaim != null && p.UserId.ToString() == userIdClaim
                })
                .ToListAsync();

            return Results.Ok(presets);
        });

        group.MapPost("/{code}/presets", async (
            string code,
            SavePresetRequest req,
            HttpContext http,
            SystemConfigDbContext db) =>
        {
            var def = await db.ReportDefinitions.FirstOrDefaultAsync(r => r.Code == code);
            if (def is null) return Results.NotFound();

            var userIdClaim = http.User.FindFirst("sub")?.Value
                ?? http.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

            if (!Guid.TryParse(userIdClaim, out var userId))
                return Results.Unauthorized();

            // If marking as default, clear existing defaults for this user+report
            if (req.IsDefault)
            {
                var existingDefaults = await db.SavedReportPresets
                    .Where(p => p.ReportDefinitionId == def.Id && p.UserId == userId && p.IsDefault)
                    .ToListAsync();
                existingDefaults.ForEach(p => p.IsDefault = false);
            }

            var preset = new SavedReportPreset
            {
                ReportDefinitionId = def.Id,
                Name = req.Name,
                UserId = userId,
                VisibleColumns = req.VisibleColumns ?? "[]",
                ColumnOrder = req.ColumnOrder ?? "[]",
                FilterValues = req.FilterValues ?? "{}",
                SortColumn = req.SortColumn,
                SortDirection = req.SortDirection,
                IsDefault = req.IsDefault,
                IsShared = req.IsShared
            };

            db.SavedReportPresets.Add(preset);
            await db.SaveChangesAsync();
            return Results.Created($"/api/reports/{code}/presets/{preset.Id}", new { preset.Id });
        });

        group.MapPut("/{code}/presets/{id:guid}", async (
            string code,
            Guid id,
            SavePresetRequest req,
            HttpContext http,
            SystemConfigDbContext db) =>
        {
            var userIdClaim = http.User.FindFirst("sub")?.Value
                ?? http.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

            if (!Guid.TryParse(userIdClaim, out var userId))
                return Results.Unauthorized();

            var preset = await db.SavedReportPresets
                .Include(p => p.ReportDefinition)
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

            if (preset is null) return Results.NotFound();

            // If marking as default, clear existing defaults
            if (req.IsDefault && !preset.IsDefault)
            {
                var existingDefaults = await db.SavedReportPresets
                    .Where(p => p.ReportDefinitionId == preset.ReportDefinitionId && p.UserId == userId && p.IsDefault && p.Id != id)
                    .ToListAsync();
                existingDefaults.ForEach(p => p.IsDefault = false);
            }

            preset.Name = req.Name;
            preset.VisibleColumns = req.VisibleColumns ?? preset.VisibleColumns;
            preset.ColumnOrder = req.ColumnOrder ?? preset.ColumnOrder;
            preset.FilterValues = req.FilterValues ?? preset.FilterValues;
            preset.SortColumn = req.SortColumn ?? preset.SortColumn;
            preset.SortDirection = req.SortDirection ?? preset.SortDirection;
            preset.IsDefault = req.IsDefault;
            preset.IsShared = req.IsShared;
            preset.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(new { preset.Id });
        });

        group.MapDelete("/{code}/presets/{id:guid}", async (
            string code,
            Guid id,
            HttpContext http,
            SystemConfigDbContext db) =>
        {
            var userIdClaim = http.User.FindFirst("sub")?.Value
                ?? http.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

            if (!Guid.TryParse(userIdClaim, out var userId))
                return Results.Unauthorized();

            var preset = await db.SavedReportPresets
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

            if (preset is null) return Results.NotFound();

            db.SavedReportPresets.Remove(preset);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

// ── Request DTOs ─────────────────────────────────────────────────────────────

public record CreateReportDefinitionRequest(
    string Code,
    string Name,
    string? Description,
    string Category,
    string DataSourceEndpoint,
    string? AvailableColumns,
    string? AvailableFilters,
    string? DefaultSortColumn,
    string? DefaultSortDirection,
    int DisplayOrder
);

public record SavePresetRequest(
    string Name,
    string? VisibleColumns,
    string? ColumnOrder,
    string? FilterValues,
    string? SortColumn,
    string? SortDirection,
    bool IsDefault,
    bool IsShared
);
