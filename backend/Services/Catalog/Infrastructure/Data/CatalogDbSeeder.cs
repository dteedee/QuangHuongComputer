using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Infrastructure.Data;

public static class CatalogDbSeeder
{
    public static async Task SeedAsync(CatalogDbContext context)
    {
        // Check if our specific Vietnamese categories exist, if not, we re-seed
        if (await context.Categories.AnyAsync(c => c.Name == "Laptop - Máy Tính Xách Tay"))
        {
            // If categories exist, we might still want to update products if they are too basic
            var existingProducts = await context.Products.CountAsync();
            if (existingProducts > 15) return; // Already seeded with enough data

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
        var oldProducts = await context.Products.ToListAsync();
        context.Products.RemoveRange(oldProducts);
        await context.SaveChangesAsync();

        var catLaptop = categories.First(c => c.Slug == "laptop").Id;
        var catGaming = categories.First(c => c.Slug == "pc-gaming").Id;
        var catWorkstation = categories.First(c => c.Slug == "workstation").Id;
        var catScreen = categories.First(c => c.Slug == "screens").Id;
        var catComponent = categories.First(c => c.Slug == "components").Id;
        var catGear = categories.First(c => c.Slug == "gear").Id;

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
                specifications: "{\"CPU\": \"Intel Core i5-12500H\", \"RAM\": \"8GB DDR4 3200MHz\", \"SSD\": \"512GB NVMe PCIe\", \"VGA\": \"NVIDIA GeForce RTX 3050 4GB\", \"Display\": \"15.6 inch FHD 144Hz\"}",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Asus",
                imageUrl: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=500"),

            new Product(
                "MacBook Air M2 13.6 inch (8GB/256GB)",
                26490000, 22500000,
                "Thiết kế mới siêu mỏng, hiệu năng vượt trội với chip Apple M2. Màn hình Liquid Retina rực rỡ và thời lượng pin lên đến 18 giờ.",
                catLaptop, brandApple, 15,
                specifications: "{\"CPU\": \"Apple M2 8-core\", \"RAM\": \"8GB Unified Memory\", \"SSD\": \"256GB\", \"Display\": \"13.6 inch Liquid Retina\", \"Weight\": \"1.24 kg\"}",
                warrantyInfo: "Bảo hành 12 tháng chính hãng Apple Việt Nam",
                imageUrl: "https://images.unsplash.com/photo-1517336714460-d1508392ae81?w=500"),

            new Product(
                "Laptop Dell Inspiron 16 5620",
                20990000, 17800000,
                "Laptop văn phòng cao cấp với màn hình 16 inch tỷ lệ 16:10 rộng rãi. Vỏ nhôm sang trọng, bảo mật vân tay và hiệu năng ổn định.",
                catLaptop, brandDell, 12,
                specifications: "{\"CPU\": \"Intel Core i5-1235U\", \"RAM\": \"16GB DDR4\", \"SSD\": \"512GB\", \"Display\": \"16.0 inch FHD+ IPS\", \"Battery\": \"54Wh\"}",
                warrantyInfo: "Bảo hành 12 tháng tận nơi ProSupport",
                imageUrl: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500"),

            // PC GAMING
            new Product(
                "PC Gaming QH Sentinel V1 - i3 12100F | RX 6600",
                15490000, 12800000,
                "Cấu hình tối ưu cho game thủ Esport và Streamer khởi nghiệp. Chiến mượt Valorant, CS:GO, LOL ở mức setting cao nhất.",
                catGaming, brandGigabyte, 10,
                specifications: "{\"Mainboard\": \"H610M\", \"CPU\": \"Intel Core i3-12100F\", \"RAM\": \"16GB DDR4 3200MHz\", \"VGA\": \"AMD Radeon RX 6600 8GB\", \"PSU\": \"600W 80 Plus Bronze\"}",
                warrantyInfo: "Bảo hành 36 tháng theo linh kiện",
                imageUrl: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=500"),

            new Product(
                "PC Gaming QH Vanguard V2 - i5 13400F | RTX 4060 Ti",
                24890000, 21500000,
                "Bộ máy tầm trung mạnh mẽ với công nghệ DLSS 3 từ NVIDIA. Cân tốt các tựa game AAA ở độ phân giải 2K.",
                catGaming, brandMSI, 8,
                specifications: "{\"Mainboard\": \"B760M\", \"CPU\": \"Intel Core i5-13400F\", \"RAM\": \"32GB DDR4\", \"VGA\": \"NVIDIA RTX 4060 Ti 8GB\", \"SSD\": \"512GB Gen4\"}",
                warrantyInfo: "Bảo hành 36 tháng",
                imageUrl: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=500"),

            // SCREENS
            new Product(
                "Màn hình Samsung Odyssey G5 27 inch Curved",
                7490000, 6200000,
                "Độ cong 1000R lý tưởng, tần số quét 144Hz và độ phân giải 2K. Hình ảnh sắc nét, sống động cho game thủ chuyên nghiệp.",
                catScreen, brandSamsung, 20,
                specifications: "{\"Size\": \"27 inch\", \"Resolution\": \"2560 x 1440 (2K)\", \"Panel\": \"VA\", \"Refresh Rate\": \"144Hz\", \"Response Time\": \"1ms\"}",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Samsung",
                imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500"),

            new Product(
                "Màn hình Dell UltraSharp U2422H",
                6190000, 5300000,
                "Dòng màn hình đồ họa huyền thoại. Tái tạo màu sắc chuẩn xác 100% sRGB, thiết kế tràn viền tinh tế.",
                catScreen, brandDell, 30,
                specifications: "{\"Size\": \"23.8 inch\", \"Resolution\": \"1920 x 1080\", \"Panel\": \"IPS\", \"Color\": \"100% sRGB, 85% DCI-P3\", \"Ports\": \"HDMI, DP, USB-C\"}",
                warrantyInfo: "Bảo hành 36 tháng chính hãng Dell",
                imageUrl: "https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=500"),

            // GEAR
            new Product(
                "Chuột Logitech G502 Hero High Performance",
                1190000, 850000,
                "Cảm biến HERO 25K chính xác nhất của Logitech. 11 nút có thể lập trình và hệ thống tạ tùy chỉnh trọng lượng.",
                catGear, brandLogitech, 100,
                specifications: "{\"Sensor\": \"HERO 25K\", \"DPI\": \"100 - 25,600\", \"Buttons\": \"11\", \"Weight\": \"121g\", \"RGB\": \"Lightsync RGB\"}",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Logitech",
                imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500"),

             new Product(
                "Bàn phím cơ Asus ROG Strix Scope RX",
                3490000, 2750000,
                "Switch quang học ROG RX độc quyền cho cảm giác gõ mượt mà và độ bền 100 triệu lần nhấn. Chống nước IP56.",
                catGear, brandAsus, 40,
                specifications: "{\"Switch\": \"ROG RX Optical Red\", \"Layout\": \"Full size\", \"Keycap\": \"ABS\", \"Feature\": \"IP56 Waterproof, Stealth Key\"}",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Asus",
                imageUrl: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=500")
        };

        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();
    }
}
