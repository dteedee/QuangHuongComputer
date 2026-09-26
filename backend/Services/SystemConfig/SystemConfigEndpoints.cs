using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Infrastructure;
using SystemConfig.Domain;
using BuildingBlocks.Caching;
using BuildingBlocks.Configuration;
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
            // Allow relative same-origin paths ("/foo/bar.svg") in addition to
            // absolute http(s) URLs. Rejects javascript: and other schemes.
            ConfigValueType.Url =>
                value?.StartsWith("http://") == true
                || value?.StartsWith("https://") == true
                || (value?.StartsWith("/") == true && !value.StartsWith("//"))
                    ? (true, null)
                    : (false, "URL phải bắt đầu bằng http://, https:// hoặc / (đường dẫn cùng miền)"),
            ConfigValueType.Email => value?.Contains("@") == true
                ? (true, null) : (false, "Email không hợp lệ"),
            ConfigValueType.Number => double.TryParse(value, out _)
                ? (true, null) : (false, "Phải là số hợp lệ"),
            // Hex color #RRGGBB — 3-byte form only, to keep CSS variable substitution safe.
            ConfigValueType.Color => value is not null
                && System.Text.RegularExpressions.Regex.IsMatch(value, "^#[0-9A-Fa-f]{6}$")
                    ? (true, null)
                    : (false, "Màu phải theo định dạng #RRGGBB (ví dụ #D22B2B)"),
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
            // W1-10 (verifier): khoá cache PHẢI mang dấu vân tay của allow-list.
            // Redis giữ bản cũ 1 giờ và KHÔNG có đường nào xoá nó (grep "cache:systemconfigs"
            // -> chỉ 2 chỗ đọc/ghi, 0 chỗ invalidate). Đo được lúc 15:01 ngày 2026-09-18:
            // :5050 chạy mã allow-list mới vẫn trả AI_MODEL/AI_TEMPERATURE/AI_MAX_TOKENS/
            // MAX_DISCOUNT_PERCENT/SPARE_PARTS_MARKUP vì đọc bản cache của mã danh-sách-đen cũ
            // => bản vá bảo mật fail-open tới 1 giờ sau mỗi lần triển khai.
            // Gắn hash của allow-list vào khoá: đổi allow-list => khoá đổi => cache tự hết hiệu lực.
            var cacheKey = SystemConfigPublicEndpointsKeys.CacheKey;
            var cachedConfigs = await cache.GetAsync<List<ConfigurationEntry>>(cacheKey);
            if (cachedConfigs != null) return Results.Ok(cachedConfigs);

            // W1-10: ĐẢO danh sách đen thành DANH SÁCH TRẮNG (SystemConfigPublicEndpointsKeys).
            // Danh sách đen cũ ("Security", "HR & Payroll", "Admin Only", "Tax") khiến mọi khoá
            // seed vào một category mới tự động lộ ra Internet — finding
            // audit-be-identity-config-platform-11. Giờ khoá nào không nằm trong allow-list thì
            // không bao giờ ra public. Vẫn giữ thêm chặn ValueType=Secret cho chắc.
            var publicKeys = SystemConfigPublicEndpointsKeys.Keys.ToList();
            var configs = await db.Configurations.AsNoTracking()
                .Where(c => publicKeys.Contains(c.Key) && c.ValueType != ConfigValueType.Secret)
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            await cache.SetAsync(cacheKey, configs, TimeSpan.FromHours(1));
            return Results.Ok(configs);
            // W1-10: endpoint này CỐ Ý công khai (storefront đọc trước khi đăng nhập).
            // Cần rule GET /api/config/public trong PublicEndpointAllowList (IR W1).
        }).AllowAnonymous();

        // W1-10: cấu hình hệ thống -> GET System.ViewConfig (Admin + Manager),
        // POST/PUT/DELETE System.ManageConfig (chỉ Admin trong ma trận W1-1).
        var adminGroup = group.MapGroup("/").RequireModulePermissions(PermissionModules.SystemConfig);

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
            // Che giá trị bí mật TRƯỚC khi cache: nếu không, bản rõ nằm trong Redis suốt 1 giờ.
            MaskSecrets(configs);
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

            MaskSecret(entry);
            await cache.SetAsync(cacheKey, entry, TimeSpan.FromHours(1));
            return Results.Ok(entry);
        });

        adminGroup.MapPost("/", async (ConfigurationEntry entry, SystemConfigDbContext db, ICacheService cache, IAppSettings appSettings, HttpContext httpContext) =>
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

            await httpContext.LogAuditAsync(action, "Configuration", entry.Key, $"Value: {AuditValue(entry)}, Module: {entry.Module}");
            await cache.RemoveByPatternAsync(CacheKeys.SystemConfigPattern);
            appSettings.Invalidate();
            return Results.Ok(existing ?? entry);
        });

        adminGroup.MapPost("/{key}", async (string key, ConfigurationEntry entry, SystemConfigDbContext db, ICacheService cache, IAppSettings appSettings, HttpContext httpContext) =>
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
            await httpContext.LogAuditAsync(action, "Configuration", key, $"Value: {AuditValue(entry)}");
            await cache.RemoveByPatternAsync(CacheKeys.SystemConfigPattern);
            appSettings.Invalidate();
            return Results.Ok(existing);
        });

        adminGroup.MapPost("/bulk", async (List<ConfigurationEntry> entries, SystemConfigDbContext db, ICacheService cache, IAppSettings appSettings, HttpContext httpContext) =>
        {
            if (entries is null || entries.Count == 0) return Results.BadRequest(new { error = "Danh sách rỗng" });
            if (entries.Count > 500) return Results.BadRequest(new { error = "Tối đa 500 mục mỗi lần" });

            foreach (var e in entries)
            {
                var (ok, err) = ConfigValidator.Validate(e);
                if (!ok) return Results.BadRequest(new { error = $"{e.Key}: {err}" });
            }

            // NO explicit transaction here. SystemConfigDbContext is registered with
            // EnableRetryOnFailure (DependencyInjection.cs:28), and NpgsqlRetryingExecutionStrategy
            // refuses a user-initiated transaction — BeginTransactionAsync threw on EVERY call, so
            // /api/config/bulk never once succeeded. A single SaveChangesAsync is already atomic:
            // EF opens its own transaction around the batch and the retry strategy can replay it.
            var keys = entries.Select(e => e.Key).ToList();
            var existingMap = await db.Configurations.Where(c => keys.Contains(c.Key)).ToDictionaryAsync(c => c.Key);
            foreach (var e in entries)
            {
                if (existingMap.TryGetValue(e.Key, out var ex))
                {
                    ex.Value = e.Value;
                    ex.Description = e.Description;
                    ex.Category = e.Category;
                    ex.Module = e.Module;
                    ex.ValueType = e.ValueType;
                    ex.JsonValue = e.JsonValue;
                    ex.SortOrder = e.SortOrder;
                    ex.LastUpdated = DateTime.UtcNow;
                    // IsSystem không cho bulk chỉnh — chỉ do seeder đặt.
                }
                else
                {
                    e.IsSystem = false;
                    e.LastUpdated = DateTime.UtcNow;
                    db.Configurations.Add(e);
                }
            }
            await db.SaveChangesAsync();

            await httpContext.LogAuditAsync("BulkUpdate", "Configuration", string.Join(",", keys.Take(20)), $"{entries.Count} keys");
            await cache.RemoveByPatternAsync(CacheKeys.SystemConfigPattern);
            appSettings.Invalidate();
            return Results.Ok(new { updated = entries.Count });
        });

        adminGroup.MapDelete("/{key}", async (string key, SystemConfigDbContext db, ICacheService cache, IAppSettings appSettings, HttpContext httpContext) =>
        {
            var existing = await db.Configurations.FindAsync(key);
            if (existing == null) return Results.NotFound();

            if (existing.IsSystem)
                return Results.BadRequest(new { error = "Không thể xóa cấu hình hệ thống" });

            db.Configurations.Remove(existing);
            await db.SaveChangesAsync();
            await httpContext.LogAuditAsync("Delete", "Configuration", key, "Deleted configuration entry");
            await cache.RemoveByPatternAsync(CacheKeys.SystemConfigPattern);
            appSettings.Invalidate();
            return Results.NoContent();
        });
    }

    /// <summary>
    /// Che giá trị của mục cấu hình có <see cref="ConfigValueType.Secret"/> trước khi trả ra API.
    ///
    /// Trước đây hai endpoint đọc cấu hình của quản trị trả thẳng entity, nên BẤT KỲ nhân viên nào
    /// có quyền đọc cấu hình (đo thật: vai trò Manager) đều thấy bản rõ — trong khi chính route
    /// công khai /public lại đã lọc Secret. Đường đọc của quản trị vì vậy còn hở hơn đường công
    /// khai. Bảng này từng chứa Email:Smtp:Password; phần ghi audit đã được vá, đường đọc thì chưa.
    ///
    /// Giữ lại 4 ký tự cuối để người vận hành vẫn đối chiếu được "đã đặt đúng khoá chưa" mà không
    /// lộ giá trị. Muốn đổi thì ghi đè bằng PUT/POST, không cần đọc ra.
    /// </summary>
    /// <summary>
    /// Giá trị ghi vào nhật ký audit: mục <see cref="ConfigValueType.Secret"/> (mật khẩu SMTP, API key...)
    /// không bao giờ được ghi rõ vào bảng audit, vốn đọc được bởi nhiều vai trò hơn trang cấu hình.
    /// </summary>
    private static string AuditValue(ConfigurationEntry entry)
        => entry.ValueType == ConfigValueType.Secret ? "***" : entry.Value;

    private static void MaskSecret(ConfigurationEntry entry)
    {
        if (entry.ValueType != ConfigValueType.Secret || string.IsNullOrEmpty(entry.Value)) return;
        entry.Value = entry.Value.Length <= 4
            ? "****"
            : "****" + entry.Value[^4..];
    }

    private static void MaskSecrets(IEnumerable<ConfigurationEntry> entries)
    {
        foreach (var e in entries) MaskSecret(e);
    }
}
