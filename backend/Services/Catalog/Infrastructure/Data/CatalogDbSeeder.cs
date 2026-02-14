using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Infrastructure.Data;

/// <summary>
/// Seeder dữ liệu cho module Catalog
/// </summary>
public static class CatalogDbSeeder
{
    /// <summary>
    /// Seed dữ liệu cho database Catalog
    /// </summary>
    /// <param name="context">Context cơ sở dữ liệu Catalog</param>
    public static async Task SeedAsync(CatalogDbContext context)
    {
        // Kiểm tra các danh mục tiếng Việt đã tồn tại chưa, nếu chưa thì thực hiện lại seeding
        if (await context.Categories.AnyAsync(c => c.Name == "Laptop - Máy Tính Xách Tay"))
        {
            Console.WriteLine("DEBUG SEEDER: Categories exist.");
            // If categories exist, we might still want to update products if they are too basic
            var existingProducts = await context.Products.CountAsync();
            if (existingProducts > 100) return; // Already seeded with enough data

            // If we are here, we might have basic seed, let's clear it or just append.
            // For seeding purposes in development, usually we'd want to ensure a clean state or specific items.
            // Let's just proceed to add more if it's the basic set.
        }

        // Ensure categories and brands exist
        var categories = await context.Categories.ToListAsync();
        if (!categories.Any())
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

        var brands = await context.Brands.ToListAsync();
        if (!brands.Any())
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

        // Clear existing products to re-seed with better data
        // DISABLED: Keep existing products to preserve manually added data
        // var oldProducts = await context.Products.ToListAsync();
        // context.Products.RemoveRange(oldProducts);
        // await context.SaveChangesAsync();

        var catLaptop = categories.First(c => c.Description == "laptop").Id;
        var catGaming = categories.First(c => c.Description == "pc-gaming").Id;
        var catWorkstation = categories.First(c => c.Description == "workstation").Id;
        var catScreen = categories.First(c => c.Description == "screens").Id;
        var catComponent = categories.First(c => c.Description == "components").Id;
        var catGear = categories.First(c => c.Description == "gear").Id;

        var brandDell = brands.First(b => b.Name == "Dell").Id;
        var brandAsus = brands.First(b => b.Name == "Asus").Id;
        var brandHP = brands.First(b => b.Name == "HP").Id;
        var brandApple = brands.First(b => b.Name == "Apple").Id;
        var brandMSI = brands.First(b => b.Name == "MSI").Id;
        var brandGigabyte = brands.First(b => b.Name == "Gigabyte").Id;
        var brandSamsung = brands.First(b => b.Name == "Samsung").Id;
        var brandLogitech = brands.First(b => b.Name == "Logitech").Id;

        var products = new List<Product>
        {
            // LAPTOPS
            new Product(
                "Laptop Asus TUF Gaming F15 FX507ZC4-HN095W",
                18490000, 15500000,
                "Laptop gaming quốc dân với hiệu năng mạnh mẽ từ CPU Intel Core i5-12500H và card đồ họa RTX 3050. Màn hình 144Hz mượt mà cho trải nghiệm game đỉnh cao.",
                catLaptop, brandAsus, 25,
                specifications: "[{\"label\": \"CPU\", \"value\": \"Intel Core i5-12500H (3.30 GHz - 4.50 GHz, 12 Cores, 16 Threads)\"}, {\"label\": \"RAM\", \"value\": \"8GB DDR4 3200MHz (Nâng cấp tối đa 32GB)\"}, {\"label\": \"Ổ cứng\", \"value\": \"512GB PCIe NVMe SSD Gen 3.0\"}, {\"label\": \"VGA\", \"value\": \"NVIDIA GeForce RTX 3050 4GB GDDR6\"}, {\"label\": \"Màn hình\", \"value\": \"15.6 inch FHD (1920 x 1080) 144Hz, IPS, Anti-glare\"}, {\"label\": \"Cổng kết nối\", \"value\": \"1x Thunderbolt 4, 1x USB 3.2 Gen 2 Type-C, 2x USB 3.2 Gen 1 Type-A, 1x HDMI 2.0b\"}, {\"label\": \"Pin\", \"value\": \"4-cell, 56WHrs\"}, {\"label\": \"Trọng lượng\", \"value\": \"2.20 kg\"}, {\"label\": \"Hệ điều hành\", \"value\": \"Windows 11 Home\"}]",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Asus",
                imageUrl: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=500"),

            new Product(
                "MacBook Air M2 13.6 inch (8GB/256GB)",
                26490000, 22500000,
                "Thiết kế mới siêu mỏng, hiệu năng vượt trội với chip Apple M2. Màn hình Liquid Retina rực rỡ và thời lượng pin lên đến 18 giờ.",
                catLaptop, brandApple, 15,
                specifications: "[{\"label\": \"CPU\", \"value\": \"Apple M2 chip with 8-core CPU\"}, {\"label\": \"GPU\", \"value\": \"8-core GPU\"}, {\"label\": \"RAM\", \"value\": \"8GB Unified Memory\"}, {\"label\": \"Ổ cứng\", \"value\": \"256GB SSD\"}, {\"label\": \"Màn hình\", \"value\": \"13.6-inch Liquid Retina display with True Tone\"}, {\"label\": \"Cổng kết nối\", \"value\": \"MagSafe 3, 2x Thunderbolt / USB 4, 3.5mm headphone jack\"}, {\"label\": \"Pin\", \"value\": \"Up to 18 hours video playback\"}, {\"label\": \"Trọng lượng\", \"value\": \"1.24 kg\"}, {\"label\": \"Bảo mật\", \"value\": \"Touch ID\"}]",
                warrantyInfo: "Bảo hành 12 tháng chính hãng Apple Việt Nam",
                imageUrl: "https://images.unsplash.com/photo-1517336714460-d1508392ae81?w=500"),

            new Product(
                "Laptop Dell Inspiron 16 5620",
                20990000, 17800000,
                "Laptop văn phòng cao cấp với màn hình 16 inch tỷ lệ 16:10 rộng rãi. Vỏ nhôm sang trọng, bảo mật vân tay và hiệu năng ổn định.",
                catLaptop, brandDell, 12,
                specifications: "[{\"label\": \"CPU\", \"value\": \"Intel Core i5-1235U (1.30 GHz - 4.40 GHz, 10 Cores, 12 Threads)\"}, {\"label\": \"RAM\", \"value\": \"16GB DDR4 3200MHz (2x8GB)\"}, {\"label\": \"Ổ cứng\", \"value\": \"512GB M.2 PCIe NVMe SSD\"}, {\"label\": \"VGA\", \"value\": \"Intel Iris Xe Graphics\"}, {\"label\": \"Màn hình\", \"value\": \"16.0 inch FHD+ (1920 x 1200) Anti-Glare 250nits WVA\"}, {\"label\": \"Cổng kết nối\", \"value\": \"2x USB 3.2 Gen 1, 1x USB 3.2 Gen 2x1 Type-C, HDMI 1.4, SD Card Reader\"}, {\"label\": \"Pin\", \"value\": \"4 Cell, 54 Wh\"}, {\"label\": \"Trọng lượng\", \"value\": \"1.87 kg\"}, {\"label\": \"Vỏ\", \"value\": \"Vỏ nhôm\"}]",
                warrantyInfo: "Bảo hành 12 tháng tận nơi ProSupport",
                imageUrl: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500"),

            // PC GAMING
            new Product(
                "PC Gaming QH Sentinel V1 - i3 12100F | RX 6600",
                15490000, 12800000,
                "Cấu hình tối ưu cho game thủ Esport và Streamer khởi nghiệp. Chiến mượt Valorant, CS:GO, LOL ở mức setting cao nhất.",
                catGaming, brandGigabyte, 10,
                specifications: "[{\"label\": \"Mainboard\", \"value\": \"Gigabyte H610M H DDR4\"}, {\"label\": \"CPU\", \"value\": \"Intel Core i3-12100F (3.3GHz - 4.3GHz, 4 Nhân 8 Luồng)\"}, {\"label\": \"RAM\", \"value\": \"16GB (8GBx2) DDR4 3200MHz\"}, {\"label\": \"VGA\", \"value\": \"Gigabyte Radeon RX 6600 EAGLE 8G\"}, {\"label\": \"SSD\", \"value\": \"256GB NVMe PCIe Gen3x4\"}, {\"label\": \"Nguồn\", \"value\": \"600W 80 Plus Bronze\"}, {\"label\": \"Vỏ Case\", \"value\": \"Xigmatek Gaming X 3F (3 Fan RGB)\"}, {\"label\": \"Tản nhiệt\", \"value\": \"Jonsbo CR-1000 RGB\"}]",
                warrantyInfo: "Bảo hành 36 tháng theo linh kiện",
                imageUrl: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=500"),

            new Product(
                "PC Gaming QH Vanguard V2 - i5 13400F | RTX 4060 Ti",
                24890000, 21500000,
                "Bộ máy tầm trung mạnh mẽ với công nghệ DLSS 3 từ NVIDIA. Cân tốt các tựa game AAA ở độ phân giải 2K.",
                catGaming, brandMSI, 8,
                specifications: "[{\"label\": \"Mainboard\", \"value\": \"MSI PRO B760M-E DDR4\"}, {\"label\": \"CPU\", \"value\": \"Intel Core i5-13400F (2.5GHz - 4.6GHz, 10 Nhân 16 Luồng)\"}, {\"label\": \"RAM\", \"value\": \"32GB (16GBx2) DDR4 3200MHz TeamGroup\"}, {\"label\": \"VGA\", \"value\": \"MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC\"}, {\"label\": \"SSD\", \"value\": \"512GB NVMe PCIe Gen4x4\"}, {\"label\": \"Nguồn\", \"value\": \"MSI MAG A650BN 650W 80 Plus Bronze\"}, {\"label\": \"Vỏ Case\", \"value\": \"MSI MAG FORGE M100A\"}, {\"label\": \"Tản nhiệt\", \"value\": \"MSI MAG CORELIQUID M240\"}]",
                warrantyInfo: "Bảo hành 36 tháng",
                imageUrl: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=500"),

            // SCREENS
            new Product(
                "Màn hình Samsung Odyssey G5 27 inch Curved",
                7490000, 6200000,
                "Độ cong 1000R lý tưởng, tần số quét 144Hz và độ phân giải 2K. Hình ảnh sắc nét, sống động cho game thủ chuyên nghiệp.",
                catScreen, brandSamsung, 20,
                specifications: "[{\"label\": \"Kích thước\", \"value\": \"27 inch\"}, {\"label\": \"Độ phân giải\", \"value\": \"2K (2560 x 1440)\"}, {\"label\": \"Tấm nền\", \"value\": \"VA\"}, {\"label\": \"Tần số quét\", \"value\": \"144Hz\"}, {\"label\": \"Thời gian phản hồi\", \"value\": \"1ms (MPRT)\"}, {\"label\": \"Độ cong\", \"value\": \"1000R\"}, {\"label\": \"Độ sáng\", \"value\": \"250 cd/m2\"}, {\"label\": \"Cổng kết nối\", \"value\": \"1x HDMI 2.0, 1x DisplayPort 1.2\"}]",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Samsung",
                imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500"),

            new Product(
                "Màn hình Dell UltraSharp U2422H",
                6190000, 5300000,
                "Dòng màn hình đồ họa huyền thoại. Tái tạo màu sắc chuẩn xác 100% sRGB, thiết kế tràn viền tinh tế.",
                catScreen, brandDell, 30,
                specifications: "[{\"label\": \"Kích thước\", \"value\": \"23.8 inch\"}, {\"label\": \"Độ phân giải\", \"value\": \"Full HD (1920 x 1080)\"}, {\"label\": \"Tấm nền\", \"value\": \"IPS\"}, {\"label\": \"Tần số quét\", \"value\": \"60Hz\"}, {\"label\": \"Màu sắc\", \"value\": \"100% sRGB, 85% DCI-P3, Delta E < 2\"}, {\"label\": \"Cổng kết nối\", \"value\": \"1x DP 1.4, 1x HDMI 1.4, 1x USB-C 3.2 Gen 2\"}, {\"label\": \"Tính năng\", \"value\": \"InfinityEdge, ComfortView Plus\"}]",
                warrantyInfo: "Bảo hành 36 tháng chính hãng Dell",
                imageUrl: "https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=500"),

            // GEAR
            new Product(
                "Chuột Logitech G502 Hero High Performance",
                1190000, 850000,
                "Cảm biến HERO 25K chính xác nhất của Logitech. 11 nút có thể lập trình và hệ thống tạ tùy chỉnh trọng lượng.",
                catGear, brandLogitech, 100,
                specifications: "[{\"label\": \"Cảm biến\", \"value\": \"HERO 25K\"}, {\"label\": \"DPI\", \"value\": \"100 - 25,600 dpi\"}, {\"label\": \"Số nút\", \"value\": \"11 nút lập trình\"}, {\"label\": \"Trọng lượng\", \"value\": \"121 g (kèm tạ tùy chỉnh)\"}, {\"label\": \"Đèn LED\", \"value\": \"LIGHTSYNC RGB\"}, {\"label\": \"Kết nối\", \"value\": \"USB (Dây bện)\"}, {\"label\": \"Độ bền\", \"value\": \"50 triệu lần click\"}]",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Logitech",
                imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500"),

             new Product(
                "Bàn phím cơ Asus ROG Strix Scope RX",
                3490000, 2750000,
                "Switch quang học ROG RX độc quyền cho cảm giác gõ mượt mà và độ bền 100 triệu lần nhấn. Chống nước IP56.",
                catGear, brandAsus, 40,
                specifications: "[{\"label\": \"Switch\", \"value\": \"ROG RX Optical Mechanical Switch (Red/Blue)\"}, {\"label\": \"Layout\", \"value\": \"Full size 100%\"}, {\"label\": \"Keycap\", \"value\": \"ABS Double-shot / PBT tùy phiên bản\"}, {\"label\": \"Tính năng\", \"value\": \"IP56 chống nước/bụi, Stealth Key\"}, {\"label\": \"Đèn LED\", \"value\": \"Per-Key RGB LEDs\"}, {\"label\": \"Kết nối\", \"value\": \"USB 2.0\"}, {\"label\": \"Phần mềm\", \"value\": \"Armoury Crate\"}]",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Asus",
                imageUrl: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=500")
        };

        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();
    }
}
