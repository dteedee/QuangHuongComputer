using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Infrastructure;
using SystemConfig.Domain;
using BuildingBlocks.Caching;
using BuildingBlocks.Endpoints;
using System.Text.RegularExpressions;

namespace SystemConfig;

public static class ConfigValidator
{
    public static (bool IsValid, string? ErrorMessage) Validate(string key, string? value)
    {
        if (string.IsNullOrWhiteSpace(value) && value != "0")
            return (false, "Giá trị không được để trống");

        string k = key.ToUpperInvariant();

        // Boolean
        if (k.Contains("ENABLED") || k.Contains("REQUIRE_") || k.Contains("_NOTIFICATIONS") || k.Contains("CONFIRMATION"))
        {
            if (value?.ToLower() != "true" && value?.ToLower() != "false")
                return (false, "Chỉ chấp nhận true hoặc false");
            return (true, null);
        }

        // Percentage
        if (k.Contains("RATE") || k.Contains("PERCENT"))
        {
            if (!double.TryParse(value, out var pct))
                return (false, "Phải là số thập phân (VD: 0.08)");
            if (pct < 0 || pct > 1)
                return (false, "Tỷ lệ phải từ 0 đến 1");
            return (true, null);
        }

        // URL
        if (k.Contains("_URL") || k.Contains("WEBSITE"))
        {
            if (!string.IsNullOrWhiteSpace(value) && !value.StartsWith("http://") && !value.StartsWith("https://"))
                return (false, "URL phải bắt đầu bằng http:// hoặc https://");
            return (true, null);
        }

        // Email
        if (k.Contains("EMAIL") && !k.Contains("NOTIFICATION"))
        {
            if (!string.IsNullOrWhiteSpace(value) && !value.Contains("@"))
                return (false, "Email không hợp lệ");
            return (true, null);
        }

        // Number/Currency
        if (k.Contains("SALARY") || k.Contains("FEE") || k.Contains("AMOUNT") || k.Contains("THRESHOLD") ||
            k.Contains("DAYS") || k.Contains("HOURS") || k.Contains("MONTHS") || k.Contains("TIMEOUT") ||
            k.Contains("ATTEMPTS") || k.Contains("LENGTH") || k.Contains("MAX_") || k.Contains("MIN_") ||
            k.Contains("DELAY") || k.Contains("PERIOD") || k.Contains("PER_"))
        {
            if (!double.TryParse(value, out var num))
                return (false, "Phải là số hợp lệ");
            if (num < 0)
                return (false, "Giá trị tối thiểu là 0");
            return (true, null);
        }

        return (true, null);
    }
}

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

            var sensitiveCategoriesCount = new List<string> { "Security", "HR & Payroll", "Admin Only" };

            var allConfigs = await db.Configurations
                .AsNoTracking()
                .ToListAsync();

            var configs = allConfigs
                .Where(c => !sensitiveCategoriesCount.Contains(c.Category))
                .ToList();

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
            var (isValid, errorMessage) = ConfigValidator.Validate(entry.Key, entry.Value);
            if (!isValid)
            {
                return Results.BadRequest(new { error = errorMessage });
            }

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
            var (isValid, errorMessage) = ConfigValidator.Validate(key, entry.Value);
            if (!isValid)
            {
                return Results.BadRequest(new { error = errorMessage });
            }

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
