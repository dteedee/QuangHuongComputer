using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Infrastructure;
using SystemConfig.Domain;
using BuildingBlocks.Caching;
using BuildingBlocks.Endpoints;

namespace SystemConfig;

public static class SystemConfigEndpoints
{
    public static void MapSystemConfigEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/config");

        // ==================== PUBLIC ENDPOINTS ====================

        // Get public configurations (safe for frontend)
        group.MapGet("/public", async (SystemConfigDbContext db, ICacheService cache) =>
        {
            var cacheKey = "cache:systemconfigs:public";
            var cachedConfigs = await cache.GetAsync<List<ConfigurationEntry>>(cacheKey);
            if (cachedConfigs != null) return Results.Ok(cachedConfigs);

            // Filter out sensitive categories
            var sensitiveCategories = new[] { "Security", "HR & Payroll", "Admin Only" };

            var configs = await db.Configurations
                .AsNoTracking()
                .Where(c => !sensitiveCategories.Contains(c.Category))
                .ToListAsync();

            // Cache for 1 hour
            await cache.SetAsync(cacheKey, configs, TimeSpan.FromHours(1));

            return Results.Ok(configs);
        });

        // ==================== ADMIN ENDPOINTS ====================

        var adminGroup = group.MapGroup("/").RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Get all configs, optionally filter by category
        adminGroup.MapGet("/", async (string? category, SystemConfigDbContext db, ICacheService cache) =>
        {
            var cacheKey = category != null ? $"cache:systemconfigs:{category}" : CacheKeys.SystemConfigsKey;
            var cachedConfigs = await cache.GetAsync<List<ConfigurationEntry>>(cacheKey);
            if (cachedConfigs != null) return Results.Ok(cachedConfigs);

            var query = db.Configurations.AsQueryable();

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(c => c.Category == category);
            }

            var configs = await query.ToListAsync();

            // Cache for 1 hour
            await cache.SetAsync(cacheKey, configs, TimeSpan.FromHours(1));

            return Results.Ok(configs);
        });

        group.MapGet("/{key}", async (string key, SystemConfigDbContext db, ICacheService cache) =>
        {
            var cacheKey = CacheKeys.SystemConfigKey(key);
            var cachedEntry = await cache.GetAsync<ConfigurationEntry>(cacheKey);
            if (cachedEntry != null) return Results.Ok(cachedEntry);

            var entry = await db.Configurations.FindAsync(key);
            if (entry == null) return Results.NotFound();

            // Cache for 1 hour
            await cache.SetAsync(cacheKey, entry, TimeSpan.FromHours(1));

            return Results.Ok(entry);
        });

        // Upsert a configuration entry (create or update)
        group.MapPost("/", async (ConfigurationEntry entry, SystemConfigDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            entry.LastUpdated = DateTime.UtcNow;
            var existing = await db.Configurations.FindAsync(entry.Key);
            var action = existing != null ? "Update" : "Create";

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

            // Log Audit
            await httpContext.LogAuditAsync(action, "Configuration", entry.Key, $"Value: {entry.Value}, Category: {entry.Category}");

            // Invalidate caches
            await cache.RemoveByPatternAsync(CacheKeys.SystemConfigPattern);

            return Results.Ok(entry);
        });

        // Lightweight update using route key (used by frontend)
        group.MapPost("/{key}", async (string key, ConfigurationEntry entry, SystemConfigDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var existing = await db.Configurations.FindAsync(key);
            var action = existing != null ? "Update" : "Create";

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

            // Log Audit
            await httpContext.LogAuditAsync(action, "Configuration", key, $"Value: {entry.Value}");

            // Invalidate caches
            await cache.RemoveByPatternAsync(CacheKeys.SystemConfigPattern);

            return Results.Ok(existing);
        });

        // Delete a configuration entry
        group.MapDelete("/{key}", async (string key, SystemConfigDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var existing = await db.Configurations.FindAsync(key);
            if (existing == null)
            {
                return Results.NotFound();
            }

            db.Configurations.Remove(existing);
            await db.SaveChangesAsync();

            // Log Audit
            await httpContext.LogAuditAsync("Delete", "Configuration", key, "Deleted configuration entry");

            // Invalidate caches
            await cache.RemoveByPatternAsync(CacheKeys.SystemConfigPattern);

            return Results.NoContent();
        });
    }
}
