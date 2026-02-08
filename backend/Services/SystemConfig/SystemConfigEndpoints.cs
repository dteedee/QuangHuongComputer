using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Infrastructure;
using SystemConfig.Domain;

namespace SystemConfig;

public static class SystemConfigEndpoints
{
    public static void MapSystemConfigEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/config").RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Get all configs, optionally filter by category
        group.MapGet("/", async (string? category, SystemConfigDbContext db) =>
        {
            var query = db.Configurations.AsQueryable();

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(c => c.Category == category);
            }

            return await query.ToListAsync();
        });

        group.MapGet("/{key}", async (string key, SystemConfigDbContext db) =>
        {
            var entry = await db.Configurations.FindAsync(key);
            return entry is not null ? Results.Ok(entry) : Results.NotFound();
        });

        // Upsert a configuration entry (create or update)
        group.MapPost("/", async (ConfigurationEntry entry, SystemConfigDbContext db) =>
        {
            entry.LastUpdated = DateTime.UtcNow;
            var existing = await db.Configurations.FindAsync(entry.Key);
            if (existing != null)
            {
                existing.Value = entry.Value;
                existing.Description = entry.Description;
                existing.Category = entry.Category;
                existing.LastUpdated = DateTime.UtcNow;
            }
            else
            {
                db.Configurations.Add(entry);
            }
            await db.SaveChangesAsync();
            return Results.Ok(entry);
        });

        // Lightweight update using route key (used by frontend)
        group.MapPost("/{key}", async (string key, ConfigurationEntry entry, SystemConfigDbContext db) =>
        {
            var existing = await db.Configurations.FindAsync(key);
            if (existing == null)
            {
                existing = new ConfigurationEntry
                {
                    Key = key,
                    Description = entry.Description,
                    Category = entry.Category
                };

                db.Configurations.Add(existing);
            }

            existing.Value = entry.Value;
            existing.Description = entry.Description;
            existing.Category = entry.Category;
            existing.LastUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(existing);
        });

        // Delete a configuration entry
        group.MapDelete("/{key}", async (string key, SystemConfigDbContext db) =>
        {
            var existing = await db.Configurations.FindAsync(key);
            if (existing == null)
            {
                return Results.NotFound();
            }

            db.Configurations.Remove(existing);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
