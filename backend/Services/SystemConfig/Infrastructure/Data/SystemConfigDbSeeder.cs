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
    /// <returns>Số dòng đã thêm/sửa/xoá. 0 nghĩa là database đã đúng — điều kiện idempotent.</returns>
    public static async Task<int> SeedAsync(SystemConfigDbContext context, CancellationToken ct = default)
    {
        var changes = 0;

        // Theme keys seeded độc lập (insert-only, hành vi giữ nguyên từ trước).
        changes += await SeedThemeKeysAsync(context);

        var allEntries = new List<ConfigurationEntry>();
        allEntries.AddRange(SystemConfigSeedDataCompany.GetEntries());
        allEntries.AddRange(SystemConfigSeedDataOperations.GetEntries());
        allEntries.AddRange(SystemConfigSeedDataSystem.GetEntries());

        changes += await UpsertAsync(context, allEntries);
        changes += await RemoveRetiredAsync(context, ct);

        // JSON extensibility — default dynamic table-view definitions (products/orders/leads)
        await TableViewDefinitionSeeder.SeedAsync(context);
        return changes;
    }

    /// <summary>
    /// Xoá các key đã bị một quyết định khai tử (<see cref="SystemConfigSeedRetiredKeys"/>), nhưng CHỈ
    /// khi giá trị trong DB vẫn đúng bằng giá trị seeder từng ghi. Admin đã sửa tay → giữ nguyên.
    /// Không có bước này, bỏ một dòng khỏi GetEntries() chỉ ảnh hưởng database trống.
    /// </summary>
    private static async Task<int> RemoveRetiredAsync(SystemConfigDbContext context, CancellationToken ct)
    {
        var keys = SystemConfigSeedRetiredKeys.ByKey.Keys.ToList();
        var rows = await context.Configurations.Where(c => keys.Contains(c.Key)).ToListAsync(ct);

        var doomed = rows
            .Where(r => SystemConfigSeedRetiredKeys.ByKey[r.Key].Contains(r.Value ?? string.Empty))
            .ToList();

        // Dòng Key rỗng là rác từ một phiên cũ (D03) — không thuộc về ai và không đọc được.
        doomed.AddRange(await context.Configurations
            .Where(c => c.Key == null || c.Key.Trim() == "")
            .ToListAsync(ct));

        if (doomed.Count == 0) return 0;

        context.Configurations.RemoveRange(doomed);
        await context.SaveChangesAsync(ct);
        return doomed.Count;
    }

    /// <summary>
    /// Upsert idempotent: insert key mới; với key đã tồn tại, chỉ ghi đè Value/Description/ValueType
    /// khi giá trị hiện tại khớp với placeholder đã biết cho đúng key đó (tránh mất chỉnh sửa của admin).
    /// </summary>
    private static async Task<int> UpsertAsync(SystemConfigDbContext context, IEnumerable<ConfigurationEntry> entries)
    {
        var existingByKey = await context.Configurations.ToDictionaryAsync(c => c.Key);
        var changes = 0;

        foreach (var entry in entries)
        {
            if (!existingByKey.TryGetValue(entry.Key, out var existing))
            {
                context.Configurations.Add(entry);
                changes++;
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
            changes++;
        }

        if (changes > 0) await context.SaveChangesAsync();
        return changes;
    }

    /// <summary>
    /// Seeds the brand/theme configuration keys.
    /// Idempotent: only inserts keys that are not already present, so it is
    /// safe to run on existing databases without wiping admin overrides.
    /// </summary>
    private static async Task<int> SeedThemeKeysAsync(SystemConfigDbContext context)
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
        if (toInsert.Count == 0) return 0;

        await context.Configurations.AddRangeAsync(toInsert);
        await context.SaveChangesAsync();
        return toInsert.Count;
    }
}
