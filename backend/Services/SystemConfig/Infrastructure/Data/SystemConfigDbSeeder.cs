using SystemConfig.Domain;
using SystemConfig.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace SystemConfig.Infrastructure.Data;

/// <summary>
/// Entry point cho việc seed dữ liệu cấu hình hệ thống.
/// Idempotent: có thể chạy lại trên DB đã seed — chỉ insert key còn thiếu và
/// cập nhật các key đang giữ giá trị PLACEHOLDER đã biết (xem <see cref="SystemConfigSeedPlaceholders"/>),
/// không bao giờ ghi đè giá trị admin đã chỉnh tay.
/// </summary>
public static class SystemConfigDbSeeder
{
    public static async Task SeedAsync(SystemConfigDbContext context)
    {
        // Theme keys seeded độc lập (insert-only, hành vi giữ nguyên từ trước).
        await SeedThemeKeysAsync(context);

        var allEntries = new List<ConfigurationEntry>();
        allEntries.AddRange(SystemConfigSeedDataCompany.GetEntries());
        allEntries.AddRange(SystemConfigSeedDataOperations.GetEntries());
        allEntries.AddRange(SystemConfigSeedDataSystem.GetEntries());

        await UpsertAsync(context, allEntries);

        // JSON extensibility — default dynamic table-view definitions (products/orders/leads)
        await TableViewDefinitionSeeder.SeedAsync(context);
    }

    /// <summary>
    /// Upsert idempotent: insert key mới; với key đã tồn tại, chỉ ghi đè Value/Description/ValueType
    /// khi giá trị hiện tại khớp với placeholder đã biết cho đúng key đó (tránh mất chỉnh sửa của admin).
    /// </summary>
    private static async Task UpsertAsync(SystemConfigDbContext context, IEnumerable<ConfigurationEntry> entries)
    {
        var existingByKey = await context.Configurations.ToDictionaryAsync(c => c.Key);
        var hasChanges = false;

        foreach (var entry in entries)
        {
            if (!existingByKey.TryGetValue(entry.Key, out var existing))
            {
                context.Configurations.Add(entry);
                hasChanges = true;
                continue;
            }

            var isPlaceholder = SystemConfigSeedPlaceholders.ByKey.TryGetValue(entry.Key, out var placeholders)
                && placeholders.Contains(existing.Value);
            if (!isPlaceholder) continue;

            existing.Value = entry.Value;
            existing.Description = entry.Description;
            existing.Category = entry.Category;
            existing.Module = entry.Module;
            existing.ValueType = entry.ValueType;
            existing.LastUpdated = DateTime.UtcNow;
            hasChanges = true;
        }

        if (hasChanges) await context.SaveChangesAsync();
    }

    /// <summary>
    /// Seeds the brand/theme configuration keys.
    /// Idempotent: only inserts keys that are not already present, so it is
    /// safe to run on existing databases without wiping admin overrides.
    /// </summary>
    private static async Task SeedThemeKeysAsync(SystemConfigDbContext context)
    {
        var defaults = new List<ConfigurationEntry>
        {
            new ConfigurationEntry
            {
                Key = "theme.accentPrimary",
                Value = "#D22B2B",
                Description = "Màu chủ đạo (hex #RRGGBB) áp cho nút mua, liên kết, tiêu đề nhấn",
                Category = "Theme",
                Module = "Global",
                ValueType = ConfigValueType.Color,
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "theme.accentPrimaryHover",
                Value = "#B02020",
                Description = "Màu hover/active tương ứng với accentPrimary",
                Category = "Theme",
                Module = "Global",
                ValueType = ConfigValueType.Color,
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "theme.logoUrl",
                Value = "/brand/logo.svg",
                Description = "URL logo hiển thị ở header (cùng miền hoặc CDN tin cậy)",
                Category = "Theme",
                Module = "Global",
                ValueType = ConfigValueType.Url,
                LastUpdated = DateTime.UtcNow
            }
        };

        var existingKeys = await context.Configurations
            .Where(c => c.Category == "Theme")
            .Select(c => c.Key)
            .ToListAsync();

        var toInsert = defaults.Where(d => !existingKeys.Contains(d.Key)).ToList();
        if (toInsert.Count == 0) return;

        await context.Configurations.AddRangeAsync(toInsert);
        await context.SaveChangesAsync();
    }
}
