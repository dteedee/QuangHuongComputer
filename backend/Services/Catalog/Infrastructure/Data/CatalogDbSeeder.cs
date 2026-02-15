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
        // Kiểm tra các danh mục tiếng Việt đã tồn tại chưa
        var categoriesExist = await context.Categories.AnyAsync(c => c.Name == "Laptop - Máy Tính Xách Tay");
        if (categoriesExist)
        {
            Console.WriteLine("DEBUG SEEDER: Categories exist.");
            // Kiểm tra xem tất cả các danh mục đã có sản phẩm chưa
            var categoriesWithoutProducts = await context.Categories
                .Where(c => c.IsActive && !context.Products.Any(p => p.CategoryId == c.Id && p.IsActive))
                .CountAsync();

            if (categoriesWithoutProducts == 0)
            {
                Console.WriteLine("DEBUG SEEDER: All categories have products. Skipping seed.");
                return; // Tất cả danh mục đã có sản phẩm
            }

            Console.WriteLine($"DEBUG SEEDER: {categoriesWithoutProducts} categories without products. Continuing seed...");
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

        // Kiểm tra danh mục nào đã có sản phẩm để không seed trùng
        var categoryIdsWithProducts = await context.Products
            .Select(p => p.CategoryId)
            .Distinct()
            .ToListAsync();

        var catLaptop = categories.First(c => c.Description == "laptop").Id;
        var catGaming = categories.First(c => c.Description == "pc-gaming").Id;
        var catWorkstation = categories.First(c => c.Description == "workstation").Id;
        var catScreen = categories.First(c => c.Description == "screens").Id;
        var catComponent = categories.First(c => c.Description == "components").Id;
        var catGear = categories.First(c => c.Description == "gear").Id;
        var catNetwork = categories.First(c => c.Description == "network").Id;
        var catCamera = categories.First(c => c.Description == "camera").Id;
        var catAudio = categories.First(c => c.Description == "audio").Id;
        var catAccessories = categories.First(c => c.Description == "accessories").Id;

        var brandDell = brands.First(b => b.Name == "Dell").Id;
        var brandAsus = brands.First(b => b.Name == "Asus").Id;
        var brandHP = brands.First(b => b.Name == "HP").Id;
        var brandApple = brands.First(b => b.Name == "Apple").Id;
        var brandMSI = brands.First(b => b.Name == "MSI").Id;
        var brandGigabyte = brands.First(b => b.Name == "Gigabyte").Id;
        var brandSamsung = brands.First(b => b.Name == "Samsung").Id;
        var brandLogitech = brands.First(b => b.Name == "Logitech").Id;
        var brandLenovo = brands.First(b => b.Name == "Lenovo").Id;
        var brandAcer = brands.First(b => b.Name == "Acer").Id;

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
                imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500"),

            new Product(
                "Bàn phím cơ Asus ROG Strix Scope RX",
                3490000, 2750000,
                "Switch quang học ROG RX độc quyền cho cảm giác gõ mượt mà và độ bền 100 triệu lần nhấn. Chống nước IP56.",
                catGear, brandAsus, 40,
                specifications: "[{\"label\": \"Switch\", \"value\": \"ROG RX Optical Mechanical Switch (Red/Blue)\"}, {\"label\": \"Layout\", \"value\": \"Full size 100%\"}, {\"label\": \"Keycap\", \"value\": \"ABS Double-shot / PBT tùy phiên bản\"}, {\"label\": \"Tính năng\", \"value\": \"IP56 chống nước/bụi, Stealth Key\"}, {\"label\": \"Đèn LED\", \"value\": \"Per-Key RGB LEDs\"}, {\"label\": \"Kết nối\", \"value\": \"USB 2.0\"}, {\"label\": \"Phần mềm\", \"value\": \"Armoury Crate\"}]",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Asus",
                imageUrl: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=500"),

            // WORKSTATION - MÁY TÍNH ĐỒ HỌA
            new Product(
                "PC Workstation QH Creator Pro - i7 13700K | RTX 4070",
                42990000, 38500000,
                "Máy trạm đồ họa chuyên nghiệp cho Designer, Video Editor. Xử lý render 3D, dựng phim 4K mượt mà.",
                catWorkstation, brandAsus, 5,
                specifications: "[{\"label\": \"CPU\", \"value\": \"Intel Core i7-13700K (3.4GHz - 5.4GHz, 16 Cores, 24 Threads)\"}, {\"label\": \"RAM\", \"value\": \"64GB DDR5 5600MHz (32GBx2)\"}, {\"label\": \"VGA\", \"value\": \"NVIDIA GeForce RTX 4070 12GB\"}, {\"label\": \"SSD\", \"value\": \"1TB NVMe PCIe Gen4x4\"}, {\"label\": \"HDD\", \"value\": \"2TB 7200RPM\"}, {\"label\": \"Nguồn\", \"value\": \"850W 80 Plus Gold\"}, {\"label\": \"Tản nhiệt\", \"value\": \"Tản nước AIO 360mm\"}]",
                warrantyInfo: "Bảo hành 36 tháng",
                imageUrl: "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=500"),

            new Product(
                "Laptop Lenovo ThinkPad P15v Gen 3 Workstation",
                35990000, 32000000,
                "Laptop workstation di động với màn hình 15.6 inch 4K. Đồ họa chuyên nghiệp NVIDIA T1200, bảo mật doanh nghiệp.",
                catWorkstation, brandLenovo, 8,
                specifications: "[{\"label\": \"CPU\", \"value\": \"Intel Core i7-12800H (2.4GHz - 4.8GHz, 14 Cores, 20 Threads)\"}, {\"label\": \"RAM\", \"value\": \"32GB DDR5 4800MHz\"}, {\"label\": \"VGA\", \"value\": \"NVIDIA T1200 4GB GDDR6\"}, {\"label\": \"SSD\", \"value\": \"512GB NVMe PCIe Gen4\"}, {\"label\": \"Màn hình\", \"value\": \"15.6 inch UHD (3840x2160) IPS 100% Adobe RGB\"}, {\"label\": \"Bảo mật\", \"value\": \"Fingerprint, IR Camera, TPM 2.0\"}]",
                warrantyInfo: "Bảo hành 36 tháng Lenovo Premier Support",
                imageUrl: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=500"),

            // LINH KIỆN MÁY TÍNH
            new Product(
                "CPU Intel Core i5-13400F Box Chính Hãng",
                4690000, 4200000,
                "Bộ xử lý thế hệ 13 Raptor Lake, 10 nhân 16 luồng. Hiệu năng gaming và đa nhiệm xuất sắc ở tầm giá.",
                catComponent, brandGigabyte, 50,
                specifications: "[{\"label\": \"Socket\", \"value\": \"LGA 1700\"}, {\"label\": \"Cores/Threads\", \"value\": \"10 Cores (6P + 4E) / 16 Threads\"}, {\"label\": \"Base Clock\", \"value\": \"2.5 GHz\"}, {\"label\": \"Turbo Clock\", \"value\": \"4.6 GHz\"}, {\"label\": \"Cache\", \"value\": \"20MB Intel Smart Cache\"}, {\"label\": \"TDP\", \"value\": \"65W\"}, {\"label\": \"RAM Support\", \"value\": \"DDR4-3200 / DDR5-4800\"}]",
                warrantyInfo: "Bảo hành 36 tháng",
                imageUrl: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500"),

            new Product(
                "RAM Kingston Fury Beast 16GB DDR5 5600MHz",
                1490000, 1250000,
                "Bộ nhớ DDR5 hiệu năng cao với tản nhiệt kim loại. Tối ưu cho gaming và đa nhiệm.",
                catComponent, brandSamsung, 80,
                specifications: "[{\"label\": \"Dung lượng\", \"value\": \"16GB (1x16GB)\"}, {\"label\": \"Loại RAM\", \"value\": \"DDR5\"}, {\"label\": \"Tốc độ\", \"value\": \"5600MHz\"}, {\"label\": \"CAS Latency\", \"value\": \"CL40\"}, {\"label\": \"Điện áp\", \"value\": \"1.25V\"}, {\"label\": \"Tản nhiệt\", \"value\": \"Heatspreader kim loại\"}]",
                warrantyInfo: "Bảo hành lifetime",
                imageUrl: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=500"),

            new Product(
                "SSD Samsung 980 Pro 1TB NVMe PCIe Gen4",
                2890000, 2450000,
                "Ổ cứng SSD cao cấp nhất của Samsung với tốc độ đọc lên đến 7000MB/s. Công nghệ V-NAND và bộ điều khiển Elpis.",
                catComponent, brandSamsung, 60,
                specifications: "[{\"label\": \"Dung lượng\", \"value\": \"1TB\"}, {\"label\": \"Interface\", \"value\": \"PCIe Gen4x4, NVMe 1.3c\"}, {\"label\": \"Đọc\", \"value\": \"7000 MB/s\"}, {\"label\": \"Ghi\", \"value\": \"5000 MB/s\"}, {\"label\": \"IOPS\", \"value\": \"1,000,000 Random Read\"}, {\"label\": \"TBW\", \"value\": \"600TB\"}, {\"label\": \"Controller\", \"value\": \"Samsung Elpis\"}]",
                warrantyInfo: "Bảo hành 5 năm chính hãng Samsung",
                imageUrl: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500"),

            new Product(
                "VGA Gigabyte GeForce RTX 4060 WINDFORCE OC 8G",
                8490000, 7500000,
                "Card đồ họa RTX 40 series với kiến trúc Ada Lovelace. DLSS 3.0, Ray Tracing thế hệ mới cho gaming 1080p/1440p.",
                catComponent, brandGigabyte, 25,
                specifications: "[{\"label\": \"GPU\", \"value\": \"NVIDIA GeForce RTX 4060\"}, {\"label\": \"VRAM\", \"value\": \"8GB GDDR6\"}, {\"label\": \"Bus\", \"value\": \"128-bit\"}, {\"label\": \"Boost Clock\", \"value\": \"2475 MHz\"}, {\"label\": \"CUDA Cores\", \"value\": \"3072\"}, {\"label\": \"TDP\", \"value\": \"115W\"}, {\"label\": \"Cổng\", \"value\": \"2x HDMI 2.1a, 2x DisplayPort 1.4a\"}]",
                warrantyInfo: "Bảo hành 36 tháng chính hãng Gigabyte",
                imageUrl: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500"),

            // THIẾT BỊ MẠNG
            new Product(
                "Router Wifi 6 TP-Link Archer AX73",
                2990000, 2500000,
                "Bộ phát WiFi 6 chuẩn AX5400 với công nghệ OFDMA và MU-MIMO. Phủ sóng toàn nhà, kết nối đến 200+ thiết bị.",
                catNetwork, brandLogitech, 35,
                specifications: "[{\"label\": \"Chuẩn WiFi\", \"value\": \"WiFi 6 (802.11ax)\"}, {\"label\": \"Tốc độ\", \"value\": \"AX5400 (5GHz: 4804Mbps + 2.4GHz: 574Mbps)\"}, {\"label\": \"Anten\", \"value\": \"6 anten ngoài\"}, {\"label\": \"Cổng LAN\", \"value\": \"4x Gigabit LAN + 1x Gigabit WAN\"}, {\"label\": \"USB\", \"value\": \"1x USB 3.0\"}, {\"label\": \"Bảo mật\", \"value\": \"WPA3, HomeCare, Parental Control\"}]",
                warrantyInfo: "Bảo hành 24 tháng chính hãng TP-Link",
                imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500"),

            new Product(
                "Mesh WiFi 6 Asus ZenWiFi AX (XT8) 2 Pack",
                9990000, 8500000,
                "Hệ thống Mesh WiFi 6 tri-band AX6600. Phủ sóng lên đến 510m2, tích hợp AiProtection Pro bảo mật.",
                catNetwork, brandAsus, 15,
                specifications: "[{\"label\": \"Chuẩn WiFi\", \"value\": \"WiFi 6 Tri-band AX6600\"}, {\"label\": \"Phủ sóng\", \"value\": \"Lên đến 510m2 (2 Pack)\"}, {\"label\": \"Số node\", \"value\": \"2 units\"}, {\"label\": \"Cổng\", \"value\": \"3x Gigabit LAN mỗi node\"}, {\"label\": \"Bảo mật\", \"value\": \"AiProtection Pro (Trend Micro)\"}, {\"label\": \"Tính năng\", \"value\": \"AiMesh, Parental Control, QoS\"}]",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Asus",
                imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500"),

            // CAMERA
            new Product(
                "Webcam Logitech C920 HD Pro",
                1690000, 1400000,
                "Webcam Full HD 1080p/30fps với tự động lấy nét và chỉnh sáng. Mic stereo kép, hoàn hảo cho họp trực tuyến và stream.",
                catCamera, brandLogitech, 45,
                specifications: "[{\"label\": \"Độ phân giải\", \"value\": \"Full HD 1080p/30fps, 720p/60fps\"}, {\"label\": \"Góc nhìn\", \"value\": \"78°\"}, {\"label\": \"Lấy nét\", \"value\": \"Tự động HD\"}, {\"label\": \"Microphone\", \"value\": \"Stereo kép tích hợp\"}, {\"label\": \"Kết nối\", \"value\": \"USB-A\"}, {\"label\": \"Tương thích\", \"value\": \"Windows, macOS, Chrome OS\"}]",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Logitech",
                imageUrl: "https://images.unsplash.com/photo-1629429408209-1f912961dbd8?w=500"),

            new Product(
                "Webcam Logitech StreamCam 1080p/60fps",
                3290000, 2800000,
                "Webcam chuyên stream với Full HD 60fps mượt mà. Lấy nét bằng AI, hỗ trợ quay dọc cho TikTok/Reels.",
                catCamera, brandLogitech, 20,
                specifications: "[{\"label\": \"Độ phân giải\", \"value\": \"Full HD 1080p/60fps\"}, {\"label\": \"Góc nhìn\", \"value\": \"78°\"}, {\"label\": \"Lấy nét\", \"value\": \"AI Smart Focus\"}, {\"label\": \"HDR\", \"value\": \"Có\"}, {\"label\": \"Kết nối\", \"value\": \"USB Type-C\"}, {\"label\": \"Tính năng\", \"value\": \"Xoay dọc/ngang, theo dõi khuôn mặt\"}]",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Logitech",
                imageUrl: "https://images.unsplash.com/photo-1626218174358-7769486c4b79?w=500"),

            // LOA, MIC, WEBCAM, STREAM
            new Product(
                "Loa Logitech Z407 Bluetooth 2.1",
                1890000, 1550000,
                "Hệ thống loa 2.1 với subwoofer mạnh mẽ. Kết nối Bluetooth, Micro USB và AUX. Điều khiển không dây tiện lợi.",
                catAudio, brandLogitech, 30,
                specifications: "[{\"label\": \"Công suất\", \"value\": \"80W Peak / 40W RMS\"}, {\"label\": \"Driver\", \"value\": \"2x Satellites + 1x Subwoofer\"}, {\"label\": \"Kết nối\", \"value\": \"Bluetooth 5.0, Micro USB, 3.5mm AUX\"}, {\"label\": \"Điều khiển\", \"value\": \"Wireless dial control\"}, {\"label\": \"Tần số\", \"value\": \"55Hz - 20kHz\"}]",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Logitech",
                imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500"),

            new Product(
                "Microphone HyperX QuadCast S RGB",
                3690000, 3100000,
                "Micro condenser USB chuyên stream với đèn RGB động. 4 polar pattern, giảm rung, pop filter tích hợp.",
                catAudio, brandHP, 25,
                specifications: "[{\"label\": \"Loại\", \"value\": \"Condenser Electret\"}, {\"label\": \"Polar Pattern\", \"value\": \"4 chế độ: Stereo, Omnidirectional, Cardioid, Bidirectional\"}, {\"label\": \"Tần số\", \"value\": \"20Hz - 20kHz\"}, {\"label\": \"Sample Rate\", \"value\": \"48kHz/16-bit\"}, {\"label\": \"Kết nối\", \"value\": \"USB Type-C\"}, {\"label\": \"Đèn LED\", \"value\": \"RGB động (HyperX NGENUITY)\"}]",
                warrantyInfo: "Bảo hành 24 tháng chính hãng HyperX",
                imageUrl: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=500"),

            new Product(
                "Tai nghe Gaming Logitech G Pro X 2 Lightspeed",
                5490000, 4800000,
                "Tai nghe gaming không dây pro-grade với driver Graphene 50mm. Pin 50 giờ, micro Blue VO!CE, DTS Headphone:X 2.0.",
                catAudio, brandLogitech, 18,
                specifications: "[{\"label\": \"Driver\", \"value\": \"PRO-G Graphene 50mm\"}, {\"label\": \"Kết nối\", \"value\": \"LIGHTSPEED Wireless, Bluetooth, 3.5mm\"}, {\"label\": \"Tần số\", \"value\": \"20Hz - 20kHz\"}, {\"label\": \"Pin\", \"value\": \"50 giờ\"}, {\"label\": \"Microphone\", \"value\": \"Detachable boom mic với Blue VO!CE\"}, {\"label\": \"Âm thanh\", \"value\": \"DTS Headphone:X 2.0\"}]",
                warrantyInfo: "Bảo hành 24 tháng chính hãng Logitech",
                imageUrl: "https://images.unsplash.com/photo-1590130638520-21a48c683713?w=500"),

            // PHỤ KIỆN MÁY TÍNH - LAPTOP
            new Product(
                "Túi chống sốc laptop 15.6 inch Tomtoc",
                590000, 450000,
                "Túi chống sốc cao cấp với lớp đệm CornerArmor bảo vệ góc cạnh. Chống nước, chống trầy xước.",
                catAccessories, brandDell, 100,
                specifications: "[{\"label\": \"Kích thước\", \"value\": \"Vừa laptop 15-15.6 inch\"}, {\"label\": \"Chất liệu\", \"value\": \"Polyester chống nước\"}, {\"label\": \"Bảo vệ\", \"value\": \"CornerArmor, lớp đệm 360°\"}, {\"label\": \"Ngăn phụ\", \"value\": \"1 ngăn nhỏ phía trước\"}, {\"label\": \"Khóa\", \"value\": \"Khóa kéo YKK\"}]",
                warrantyInfo: "Bảo hành 12 tháng",
                imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500"),

            new Product(
                "Đế tản nhiệt laptop Cooler Master NotePal X3",
                890000, 720000,
                "Đế tản nhiệt với quạt 200mm siêu êm, đèn LED xanh. Điều chỉnh độ nghiêng, hỗ trợ laptop đến 17 inch.",
                catAccessories, brandMSI, 55,
                specifications: "[{\"label\": \"Quạt\", \"value\": \"1x 200mm với LED xanh\"}, {\"label\": \"Tốc độ quạt\", \"value\": \"800 RPM\"}, {\"label\": \"Độ ồn\", \"value\": \"19 dBA\"}, {\"label\": \"Laptop hỗ trợ\", \"value\": \"Đến 17 inch\"}, {\"label\": \"Điều chỉnh\", \"value\": \"Nghiêng 5 cấp độ\"}, {\"label\": \"Cổng USB\", \"value\": \"Hub USB x1\"}]",
                warrantyInfo: "Bảo hành 24 tháng Cooler Master",
                imageUrl: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500"),

            new Product(
                "Bộ vệ sinh laptop đa năng Baseus 8 in 1",
                290000, 220000,
                "Bộ kit vệ sinh đa năng gồm cọ mềm, dung dịch, khăn microfiber. Làm sạch màn hình, bàn phím, tai nghe.",
                catAccessories, brandLogitech, 200,
                specifications: "[{\"label\": \"Bộ gồm\", \"value\": \"8 món: cọ, dung dịch, khăn, bông, kẹp...\"}, {\"label\": \"Dung dịch\", \"value\": \"30ml an toàn cho màn hình\"}, {\"label\": \"Khăn\", \"value\": \"Microfiber siêu mềm\"}, {\"label\": \"Dùng cho\", \"value\": \"Laptop, điện thoại, tai nghe, máy ảnh\"}]",
                warrantyInfo: "Bảo hành 6 tháng",
                imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500"),

            new Product(
                "Hub USB-C 7 in 1 Anker PowerExpand+",
                1290000, 1050000,
                "Hub đa năng với HDMI 4K, 2 USB-A 3.0, USB-C Data, SD/microSD reader, Power Delivery 100W.",
                catAccessories, brandApple, 70,
                specifications: "[{\"label\": \"Cổng\", \"value\": \"HDMI 4K@30Hz, 2x USB-A 3.0, 1x USB-C Data, SD, microSD, PD 100W\"}, {\"label\": \"Chất liệu\", \"value\": \"Vỏ nhôm cao cấp\"}, {\"label\": \"Tương thích\", \"value\": \"MacBook, iPad Pro, laptop USB-C\"}, {\"label\": \"Cáp\", \"value\": \"Cáp USB-C tích hợp 18cm\"}]",
                warrantyInfo: "Bảo hành 18 tháng Anker",
                imageUrl: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500")
        };

        // Chỉ thêm sản phẩm cho các danh mục chưa có sản phẩm
        var productsToAdd = products.Where(p => !categoryIdsWithProducts.Contains(p.CategoryId)).ToList();

        if (productsToAdd.Any())
        {
            Console.WriteLine($"DEBUG SEEDER: Adding {productsToAdd.Count} products for categories without products.");
            await context.Products.AddRangeAsync(productsToAdd);
            await context.SaveChangesAsync();
        }
        else
        {
            Console.WriteLine("DEBUG SEEDER: No new products to add.");
        }
    }
}
