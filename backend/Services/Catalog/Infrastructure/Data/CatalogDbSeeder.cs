using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Infrastructure.Data;

/// <summary>
/// Reference-data seeder for the Catalog module.
///
/// It seeds ONLY reference data: the ten real leaf categories, the ten brands the shop already
/// carried, the shared option types and the specification groups.
///
/// It deliberately seeds NO PRODUCTS. Until 2026-09-18 this file also inserted 26 demo products
/// whose photographs were Unsplash stock pictures of unrelated hardware, and it re-inserted them
/// on every API start for any active category that had no active product (D03). That made the
/// demo catalogue impossible to delete: a purge was undone by the next restart. Real products
/// now come from `Infrastructure/Data/Import/ProductDatasetImporter`, driven by the versioned
/// dataset under `Infrastructure/Data/Import/dataset/` - which is verified, sourced and
/// idempotent. Do not add product literals here again.
/// </summary>
public static class CatalogDbSeeder
{
    /// <summary>
    /// Seeds Catalog reference data. Idempotent, and safe to run against a database that already
    /// holds the imported catalogue: every step is "create only when the table is empty" or an
    /// existence check, so a restart can never resurrect deleted rows.
    /// </summary>
    /// <param name="context">Catalog database context</param>
    public static async Task SeedAsync(CatalogDbContext context)
    {
        // The ten leaf categories the shop actually sells. Seeded only into an empty catalogue
        // (a fresh staging/production database); on the owner's database they already exist and
        // W0-6's importer enriches them in place, keeping their ids - content.HomepageSections
        // embeds six of those ids as raw UUIDs in JSON with no foreign key to protect them.
        var categories = await context.Categories.ToListAsync();
        if (categories.Count == 0)
        {
            categories = new List<Category>
            {
                new Category("Laptop - Máy Tính Xách Tay", "laptop"),
                new Category("Máy Tính Chơi Game", "pc-gaming"),
                new Category("Máy Tính Đồ Họa", "workstation"),
                new Category("Màn Hình Máy Tính", "screens"),
                new Category("Linh Kiện Máy Tính", "components"),
                new Category("Phím, Chuột - Gaming Gear", "gear"),
                new Category("Thiết Bị Mạng", "network"),
                new Category("Camera", "camera"),
                new Category("Loa, Mic, Webcam, Stream", "audio"),
                new Category("Phụ Kiện Máy Tính - Laptop", "accessories")
            };
            await context.Categories.AddRangeAsync(categories);
            await context.SaveChangesAsync();
        }

        // Brands are reference data too. The importer adds the remaining manufacturers from the
        // dataset; these ten are the ones the storefront and the homepage already reference.
        var brands = await context.Brands.ToListAsync();
        if (brands.Count == 0)
        {
            brands = new List<Brand>
            {
                new Brand("Dell", "Dell Global"),
                new Brand("Asus", "Asus Global"),
                new Brand("HP", "HP Inc"),
                new Brand("Apple", "Apple Inc"),
                new Brand("MSI", "MSI Gaming"),
                new Brand("Gigabyte", "Gigabyte Technology"),
                new Brand("Logitech", "Logitech Gear"),
                new Brand("Samsung", "Samsung Electronics"),
                new Brand("Lenovo", "Lenovo Group"),
                new Brand("Acer", "Acer Inc")
            };
            await context.Brands.AddRangeAsync(brands);
            await context.SaveChangesAsync();
        }

        // Phase 03 reference data. Removing these two calls would cost 6 specification groups
        // and 6 option types that nothing else creates (D03) - they stay.
        await SeedOptionTypesAndValuesAsync(context);
        await SeedSpecificationGroupsAsync(context, categories);
    }

    /// <summary>
    /// Seed loại tuỳ chọn phổ biến (RAM, SSD, CPU, VGA, Màu sắc, Kích thước MH) + value phổ biến.
    /// Idempotent: check theo Name trước khi thêm.
    /// </summary>
    private static async Task SeedOptionTypesAndValuesAsync(CatalogDbContext context)
    {
        var typeSeeds = new (string Name, string Display, OptionInputType Input, int Sort,
                             (string Value, string Display, string? Hex)[] Values)[]
        {
            ("RAM", "Dung lượng RAM (GB)", OptionInputType.Dropdown, 1, new[]
            {
                ("4", "4 GB", (string?)null), ("8", "8 GB", (string?)null),
                ("16", "16 GB", (string?)null), ("32", "32 GB", (string?)null),
                ("64", "64 GB", (string?)null),
            }),
            ("SSD", "Ổ cứng SSD", OptionInputType.Dropdown, 2, new[]
            {
                ("256", "256 GB SSD", (string?)null), ("512", "512 GB SSD", (string?)null),
                ("1024", "1 TB SSD", (string?)null), ("2048", "2 TB SSD", (string?)null),
            }),
            ("CPU", "Bộ xử lý", OptionInputType.Dropdown, 3, new[]
            {
                ("i3", "Intel Core i3", (string?)null), ("i5", "Intel Core i5", (string?)null),
                ("i7", "Intel Core i7", (string?)null), ("i9", "Intel Core i9", (string?)null),
                ("r5", "AMD Ryzen 5", (string?)null), ("r7", "AMD Ryzen 7", (string?)null),
            }),
            ("VGA", "Card đồ hoạ", OptionInputType.Dropdown, 4, new[]
            {
                ("integrated", "Card tích hợp", (string?)null),
                ("rtx3050", "NVIDIA RTX 3050", (string?)null),
                ("rtx4060", "NVIDIA RTX 4060", (string?)null),
                ("rtx4070", "NVIDIA RTX 4070", (string?)null),
            }),
            ("Color", "Màu sắc", OptionInputType.Swatch, 5, new[]
            {
                ("black", "Đen", (string?)"#000000"),
                ("silver", "Bạc", (string?)"#C0C0C0"),
                ("gray", "Xám", (string?)"#808080"),
                ("red", "Đỏ", (string?)"#D62828"),
            }),
            ("ScreenSize", "Kích thước màn hình", OptionInputType.Dropdown, 6, new[]
            {
                ("13.3", "13.3 inch", (string?)null),
                ("14", "14 inch", (string?)null),
                ("15.6", "15.6 inch", (string?)null),
                ("16", "16 inch", (string?)null),
                ("17.3", "17.3 inch", (string?)null),
            }),
        };

        foreach (var (name, display, input, sort, values) in typeSeeds)
        {
            var existing = await context.ProductOptionTypes.FirstOrDefaultAsync(t => t.Name == name);
            if (existing == null)
            {
                existing = new ProductOptionType(name, display, input, sort);
                context.ProductOptionTypes.Add(existing);
                await context.SaveChangesAsync();
            }
            foreach (var (val, disp, hex) in values)
            {
                var hasValue = await context.ProductOptionValues
                    .AnyAsync(v => v.OptionTypeId == existing.Id && v.Value == val);
                if (!hasValue)
                    context.ProductOptionValues.Add(new ProductOptionValue(existing.Id, val, disp, hex));
            }
            await context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Seed SpecificationGroup + Attribute cho các danh mục chính (Laptop, PC gaming, Màn hình).
    /// Idempotent: check theo (Name + CategoryId) trước khi thêm group; theo Key trước khi thêm attribute.
    /// </summary>
    private static async Task SeedSpecificationGroupsAsync(CatalogDbContext context, List<Category> categories)
    {
        var laptopId = categories.FirstOrDefault(c => c.Description == "laptop")?.Id;
        var pcId = categories.FirstOrDefault(c => c.Description == "pc-gaming")?.Id;
        var screenId = categories.FirstOrDefault(c => c.Description == "screens")?.Id;

        // Cấu trúc gọn: (CategoryId?, GroupName, Sort, [(Key, Name, DataType, Unit, Filterable)])
        var seeds = new List<(Guid? Cat, string GroupName, int Sort,
            (string Key, string Name, SpecDataType Type, string? Unit, bool Filter)[] Attrs)>
        {
            (laptopId, "Laptop - Bộ xử lý", 1, new[]
            {
                ("cpu_model", "CPU", SpecDataType.Text, (string?)null, true),
                ("cpu_cores", "Số nhân", SpecDataType.Number, "cores", false),
            }),
            (laptopId, "Laptop - Bộ nhớ & Lưu trữ", 2, new[]
            {
                ("ram_gb", "RAM", SpecDataType.Number, "GB", true),
                ("ssd_gb", "Ổ cứng", SpecDataType.Number, "GB", true),
            }),
            (laptopId, "Laptop - Màn hình & GPU", 3, new[]
            {
                ("screen_size", "Màn hình", SpecDataType.Number, "inch", true),
                ("gpu_model", "Card đồ hoạ", SpecDataType.Text, (string?)null, true),
            }),
            (laptopId, "Laptop - Pin & Trọng lượng", 4, new[]
            {
                ("battery_wh", "Pin", SpecDataType.Number, "Wh", false),
                ("weight_kg", "Cân nặng", SpecDataType.Number, "kg", true),
                ("os", "Hệ điều hành", SpecDataType.Text, (string?)null, true),
            }),
            (pcId, "PC - Cấu hình", 1, new[]
            {
                ("cpu_model", "CPU", SpecDataType.Text, (string?)null, true),
                ("mainboard", "Mainboard", SpecDataType.Text, (string?)null, false),
                ("ram_gb", "RAM", SpecDataType.Number, "GB", true),
                ("gpu_model", "VGA", SpecDataType.Text, (string?)null, true),
                ("psu_w", "Nguồn", SpecDataType.Number, "W", false),
                ("case_type", "Vỏ case", SpecDataType.Text, (string?)null, false),
            }),
            (screenId, "Màn hình - Thông số", 1, new[]
            {
                ("screen_size", "Kích thước", SpecDataType.Number, "inch", true),
                ("resolution", "Độ phân giải", SpecDataType.Text, (string?)null, true),
                ("refresh_rate", "Tần số quét", SpecDataType.Number, "Hz", true),
                ("panel_type", "Tấm nền", SpecDataType.Text, (string?)null, true),
                ("ports", "Cổng kết nối", SpecDataType.Text, (string?)null, false),
            }),
        };

        foreach (var (catId, groupName, sort, attrs) in seeds)
        {
            var group = await context.SpecificationGroups
                .FirstOrDefaultAsync(g => g.Name == groupName && g.CategoryId == catId);
            if (group == null)
            {
                group = new SpecificationGroup(groupName, catId, sort);
                context.SpecificationGroups.Add(group);
                await context.SaveChangesAsync();
            }
            int aSort = 0;
            foreach (var (key, name, type, unit, filter) in attrs)
            {
                var hasAttr = await context.SpecificationAttributes
                    .AnyAsync(a => a.Key == key && a.GroupId == group.Id);
                if (!hasAttr)
                    context.SpecificationAttributes.Add(
                        new SpecificationAttribute(group.Id, key, name, type, unit, null, filter, true, aSort++));
            }
            await context.SaveChangesAsync();
        }
    }
}
