using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Infrastructure.Data;

public static class CatalogDbSeeder
{
    public static async Task SeedAsync(CatalogDbContext context)
    {
        // Check if our specific Vietnamese categories exist, if not, we re-seed
        if (await context.Categories.AnyAsync(c => c.Name == "Laptop - Máy Tính Xách Tay")) return;

        var categories = new List<Category>
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

        var brands = new List<Brand>
        {
            new Brand("Dell", "Dell Global"),
            new Brand("Asus", "Asus Global"),
            new Brand("HP", "HP Inc"),
            new Brand("Apple", "Apple Inc"),
            new Brand("MSI", "MSI Gaming"),
            new Brand("Gigabyte", "Gigabyte Technology"),
            new Brand("Logitech", "Logitech Gear"),
            new Brand("Samsung", "Samsung Electronics")
        };

        await context.Categories.AddRangeAsync(categories);
        await context.Brands.AddRangeAsync(brands);
        await context.SaveChangesAsync();

        var products = new List<Product>
        {
            // Laptops - costPrice is typically 80% of selling price
            new Product("Laptop Asus TUF Gaming F15", 18500000, 14800000, "Gaming laptop Core i5-12500H, RTX 3050", categories[0].Id, brands[1].Id, 15),
            new Product("MacBook Air M2 13.6 inch", 26500000, 21200000, "Siêu mỏng nhẹ, pin trâu", categories[0].Id, brands[3].Id, 8),
            new Product("Laptop Dell Inspiron 16", 21000000, 16800000, "Màn hình lớn, hiệu năng văn phòng cực tốt", categories[0].Id, brands[0].Id, 12),
            new Product("Laptop HP Victus 15", 17900000, 14320000, "Thiết kế tối giản, hiệu năng mạnh mẽ", categories[0].Id, brands[2].Id, 20),

            // PC Gaming
            new Product("PC Gaming QH Sentinel V1", 15500000, 12400000, "Core i3-12100F | RX 6600 | 16GB RAM", categories[1].Id, brands[5].Id, 5),
            new Product("PC Gaming QH Vanguard V2", 24900000, 19920000, "Core i5-13400F | RTX 4060 Ti | 32GB RAM", categories[1].Id, brands[4].Id, 3),
            new Product("PC Gaming QH Overlord Ultra", 45000000, 36000000, "Core i7-14700K | RTX 4080 Super", categories[1].Id, brands[0].Id, 2),

            // Workstation
            new Product("Workstation QH Studio 3D", 35000000, 28000000, "AMD Ryzen 9 | 64GB RAM | RTX 4070", categories[2].Id, brands[5].Id, 4),
            new Product("Workstation QH Render Pro", 89000000, 71200000, "Dual Xeon | 128GB RAM | RTX 6000 Ada", categories[2].Id, brands[5].Id, 1),

            // Screens
            new Product("Màn hình Samsung Odyssey G5 27 inch", 7500000, 6000000, "2K 144Hz Curved Gaming Monitor", categories[3].Id, brands[7].Id, 10),
            new Product("Màn hình Dell UltraSharp U2422H", 6200000, 4960000, "Full HD IPS, màu sắc chuẩn đồ họa", categories[3].Id, brands[0].Id, 15),

            // Gear
            new Product("Chuột Logitech G502 Hero", 1200000, 960000, "Chuột chơi game quốc dân", categories[5].Id, brands[6].Id, 50),
            new Product("Bàn phím cơ Asus ROG Strix Scope", 3500000, 2800000, "Cherry MX Red Switch", categories[5].Id, brands[1].Id, 25)
        };

        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();
    }
}
