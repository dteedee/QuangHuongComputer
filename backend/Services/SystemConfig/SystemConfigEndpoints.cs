using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Infrastructure;
using SystemConfig.Domain;
using BuildingBlocks.Caching;
using BuildingBlocks.Endpoints;
using System.Text.Json;

namespace SystemConfig;

public static class ConfigValidator
{
    public static (bool IsValid, string? ErrorMessage) Validate(ConfigurationEntry entry)
    {
        var key = entry.Key;
        var value = entry.Value;

        if (entry.ValueType == ConfigValueType.Json)
        {
            if (!string.IsNullOrWhiteSpace(entry.JsonValue))
            {
                try { JsonDocument.Parse(entry.JsonValue); }
                catch { return (false, "JsonValue không phải JSON hợp lệ"); }
            }
            return (true, null);
        }

        if (string.IsNullOrWhiteSpace(value) && value != "0")
            return (false, "Giá trị không được để trống");

        return entry.ValueType switch
        {
            ConfigValueType.Boolean => value?.ToLower() is "true" or "false"
                ? (true, null) : (false, "Chỉ chấp nhận true hoặc false"),
            ConfigValueType.Percentage => double.TryParse(value, out var pct) && pct >= 0 && pct <= 1
                ? (true, null) : (false, "Tỷ lệ phải từ 0 đến 1"),
            ConfigValueType.Url => value?.StartsWith("http://") == true || value?.StartsWith("https://") == true
                ? (true, null) : (false, "URL phải bắt đầu bằng http:// hoặc https://"),
            ConfigValueType.Email => value?.Contains("@") == true
                ? (true, null) : (false, "Email không hợp lệ"),
            ConfigValueType.Number => double.TryParse(value, out _)
                ? (true, null) : (false, "Phải là số hợp lệ"),
            _ => (true, null)
        };
    }
}

public static class SystemConfigEndpoints
{
    public static void MapSystemConfigEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/config");

        group.MapGet("/public", async (SystemConfigDbContext db, ICacheService cache) =>
        {
            var cacheKey = "cache:systemconfigs:public";
            var cachedConfigs = await cache.GetAsync<List<ConfigurationEntry>>(cacheKey);
            if (cachedConfigs != null) return Results.Ok(cachedConfigs);

            var sensitiveCats = new List<string> { "Security", "HR & Payroll", "Admin Only" };
            var configs = await db.Configurations.AsNoTracking()
                .Where(c => !sensitiveCats.Contains(c.Category) && c.ValueType != ConfigValueType.Secret)
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            await cache.SetAsync(cacheKey, configs, TimeSpan.FromHours(1));
            return Results.Ok(configs);
        });

        var adminGroup = group.MapGroup("/").RequireAuthorization(policy => policy.RequireRole("Admin"));

        adminGroup.MapGet("/", async (string? category, string? module, SystemConfigDbContext db, ICacheService cache) =>
        {
            var cacheKey = $"cache:systemconfigs:{module ?? "all"}:{category ?? "all"}";
            var cachedConfigs = await cache.GetAsync<List<ConfigurationEntry>>(cacheKey);
            if (cachedConfigs != null) return Results.Ok(cachedConfigs);

            var query = db.Configurations.AsQueryable();
            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(c => c.Category == category);
            if (!string.IsNullOrWhiteSpace(module))
                query = query.Where(c => c.Module == module);

            var configs = await query.OrderBy(c => c.Module).ThenBy(c => c.SortOrder).ToListAsync();
            await cache.SetAsync(cacheKey, configs, TimeSpan.FromHours(1));
            return Results.Ok(configs);
        });

        adminGroup.MapGet("/modules", async (SystemConfigDbContext db) =>
        {
            var modules = await db.Configurations
                .Select(c => c.Module)
                .Distinct()
                .OrderBy(m => m)
                .ToListAsync();
            return Results.Ok(modules);
        });

        adminGroup.MapGet("/{key}", async (string key, SystemConfigDbContext db, ICacheService cache) =>
        {
            var cacheKey = CacheKeys.SystemConfigKey(key);
            var cachedEntry = await cache.GetAsync<ConfigurationEntry>(cacheKey);
            if (cachedEntry != null) return Results.Ok(cachedEntry);

            var entry = await db.Configurations.FindAsync(key);
            if (entry == null) return Results.NotFound();

            await cache.SetAsync(cacheKey, entry, TimeSpan.FromHours(1));
            return Results.Ok(entry);
        });

        adminGroup.MapPost("/", async (ConfigurationEntry entry, SystemConfigDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var (isValid, errorMessage) = ConfigValidator.Validate(entry);
            if (!isValid)
                return Results.BadRequest(new { error = errorMessage });

            entry.LastUpdated = DateTime.UtcNow;
            var existing = await db.Configurations.FindAsync(entry.Key);
            var action = existing != null ? "Update" : "Create";

            if (existing != null)
            {
                if (existing.IsSystem && entry.Key != existing.Key)
                    return Results.BadRequest(new { error = "Không thể thay đổi key của cấu hình hệ thống" });

                existing.Value = entry.Value;
                existing.Description = entry.Description;
                existing.Category = entry.Category;
                existing.Module = entry.Module;
                existing.ValueType = entry.ValueType;
                existing.JsonValue = entry.JsonValue;
                existing.SortOrder = entry.SortOrder;
                existing.LastUpdated = DateTime.UtcNow;
            }
            else
            {
                db.Configurations.Add(entry);
            }
            await db.SaveChangesAsync();

            await httpContext.LogAuditAsync(action, "Configuration", entry.Key, $"Value: {entry.Value}, Module: {entry.Module}");
            await cache.RemoveByPatternAsync(CacheKeys.SystemConfigPattern);
            return Results.Ok(existing ?? entry);
        });

        adminGroup.MapPost("/{key}", async (string key, ConfigurationEntry entry, SystemConfigDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var (isValid, errorMessage) = ConfigValidator.Validate(entry);
            if (!isValid)
                return Results.BadRequest(new { error = errorMessage });

            var existing = await db.Configurations.FindAsync(key);
            var action = existing != null ? "Update" : "Create";

            if (existing == null)
            {
                existing = new ConfigurationEntry
                {
                    Key = key,
                    Description = entry.Description,
                    Category = entry.Category,
                    Module = entry.Module,
                    ValueType = entry.ValueType,
                };
                db.Configurations.Add(existing);
            }

            existing.Value = entry.Value;
            existing.Description = entry.Description;
            existing.Category = entry.Category;
            existing.Module = entry.Module;
            existing.ValueType = entry.ValueType;
            existing.JsonValue = entry.JsonValue;
            existing.SortOrder = entry.SortOrder;
            existing.LastUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync();
            await httpContext.LogAuditAsync(action, "Configuration", key, $"Value: {entry.Value}");
            await cache.RemoveByPatternAsync(CacheKeys.SystemConfigPattern);
            return Results.Ok(existing);
        });

        adminGroup.MapDelete("/{key}", async (string key, SystemConfigDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var existing = await db.Configurations.FindAsync(key);
            if (existing == null) return Results.NotFound();

            if (existing.IsSystem)
                return Results.BadRequest(new { error = "Không thể xóa cấu hình hệ thống" });

            db.Configurations.Remove(existing);
            await db.SaveChangesAsync();
            await httpContext.LogAuditAsync("Delete", "Configuration", key, "Deleted configuration entry");
            await cache.RemoveByPatternAsync(CacheKeys.SystemConfigPattern);
            return Results.NoContent();
        });
    }
}
